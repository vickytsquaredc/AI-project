const { query } = require('../config/database');

// GET /api/reports/dashboard - Main dashboard stats
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      booksResult,
      copiesResult,
      membersResult,
      activeLoansResult,
      overdueResult,
      finesResult,
      reservationsResult,
      recentActivityResult,
      popularBooksResult,
      popularGenresResult
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM books WHERE is_active = true'),
      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'available') AS available,
        COUNT(*) FILTER (WHERE status = 'checked_out') AS checked_out,
        COUNT(*) FILTER (WHERE status = 'reserved') AS reserved,
        COUNT(*) FILTER (WHERE status IN ('lost','damaged')) AS unavailable
        FROM book_copies WHERE status != 'withdrawn'`),
      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE role = 'student') AS students,
        COUNT(*) FILTER (WHERE role = 'staff') AS staff,
        COUNT(*) FILTER (WHERE is_active = true) AS active
        FROM users`),
      query(`SELECT COUNT(*) FROM loans WHERE status IN ('active', 'overdue')`),
      query(`SELECT COUNT(*) FROM loans WHERE status = 'overdue'
             OR (status = 'active' AND due_date < NOW())`),
      query(`SELECT
        COALESCE(SUM(amount) FILTER (WHERE status = 'unpaid'), 0) AS unpaid,
        COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS collected_this_month
        FROM fines
        WHERE issued_at >= date_trunc('month', NOW()) OR status = 'unpaid'`),
      query(`SELECT COUNT(*) FROM reservations WHERE status IN ('pending', 'ready')`),
      // Recent checkouts (last 7 days)
      query(`SELECT COUNT(*) FROM loans WHERE checkout_date >= NOW() - INTERVAL '7 days'`),
      // Most popular books (by loan count, last 90 days)
      query(`
        SELECT
          b.id, b.title, b.call_number,
          STRING_AGG(DISTINCT a.name, ', ') AS authors,
          COUNT(l.id) AS loan_count
        FROM books b
        JOIN loans l ON l.book_id = b.id
        LEFT JOIN book_authors ba ON ba.book_id = b.id
        LEFT JOIN authors a ON a.id = ba.author_id
        WHERE l.checkout_date >= NOW() - INTERVAL '90 days'
        GROUP BY b.id
        ORDER BY loan_count DESC
        LIMIT 5
      `),
      // Loans by genre (last 90 days)
      query(`
        SELECT g.name AS genre, COUNT(l.id) AS loan_count
        FROM genres g
        JOIN books b ON b.genre_id = g.id
        JOIN loans l ON l.book_id = b.id
        WHERE l.checkout_date >= NOW() - INTERVAL '90 days'
        GROUP BY g.name
        ORDER BY loan_count DESC
        LIMIT 8
      `)
    ]);

    // Monthly checkout trend (last 6 months)
    const trendResult = await query(`
      SELECT
        TO_CHAR(date_trunc('month', checkout_date), 'Mon YYYY') AS month,
        COUNT(*) AS checkouts,
        date_trunc('month', checkout_date) AS month_date
      FROM loans
      WHERE checkout_date >= NOW() - INTERVAL '6 months'
      GROUP BY month_date
      ORDER BY month_date ASC
    `);

    res.json({
      books: {
        total: parseInt(booksResult.rows[0].count),
      },
      copies: copiesResult.rows[0],
      members: membersResult.rows[0],
      loans: {
        active: parseInt(activeLoansResult.rows[0].count),
        overdue: parseInt(overdueResult.rows[0].count),
      },
      fines: {
        unpaidTotal: parseFloat(finesResult.rows[0].unpaid),
        collectedThisMonth: parseFloat(finesResult.rows[0].collected_this_month),
      },
      reservations: {
        pending: parseInt(reservationsResult.rows[0].count),
      },
      recentActivity: {
        checkoutsLast7Days: parseInt(recentActivityResult.rows[0].count),
      },
      popularBooks: popularBooksResult.rows,
      popularGenres: popularGenresResult.rows,
      checkoutTrend: trendResult.rows,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/inventory - Inventory report
const getInventoryReport = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        b.id, b.title, b.isbn, b.call_number, b.dewey_decimal,
        b.total_copies, b.available_copies,
        g.name AS genre,
        pub.name AS publisher,
        STRING_AGG(DISTINCT a.name, ', ') AS authors,
        COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('active','overdue')) AS on_loan,
        COUNT(DISTINCT r.id) FILTER (WHERE r.status IN ('pending','ready')) AS on_hold
      FROM books b
      LEFT JOIN genres g ON g.id = b.genre_id
      LEFT JOIN publishers pub ON pub.id = b.publisher_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      LEFT JOIN loans l ON l.book_id = b.id
      LEFT JOIN reservations r ON r.book_id = b.id
      WHERE b.is_active = true
      GROUP BY b.id, g.name, pub.name
      ORDER BY b.title
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/overdue - Overdue report
const getOverdueReport = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        l.id AS loan_id, l.checkout_date, l.due_date, l.renewal_count,
        CEIL(DATE_PART('day', NOW() - l.due_date)) AS days_overdue,
        CEIL(DATE_PART('day', NOW() - l.due_date)) * $1 AS estimated_fine,
        b.title AS book_title, b.isbn, bc.barcode AS copy_barcode,
        u.first_name, u.last_name, u.email, u.grade_class,
        u.barcode AS member_barcode
      FROM loans l
      JOIN book_copies bc ON bc.id = l.copy_id
      JOIN books b ON b.id = l.book_id
      JOIN users u ON u.id = l.user_id
      WHERE (l.status = 'overdue' OR (l.status = 'active' AND l.due_date < NOW()))
      ORDER BY l.due_date ASC
    `, [parseFloat(process.env.FINE_RATE_PER_DAY) || 0.25]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/fines - Fines summary report
const getFinesReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND f.issued_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      whereClause += ` AND f.issued_at <= $${params.length}`;
    }

    const [summary, byType, byMember] = await Promise.all([
      query(`
        SELECT
          COUNT(*) AS total_fines,
          COALESCE(SUM(CASE WHEN status = 'unpaid' THEN amount END), 0) AS unpaid_total,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount END), 0) AS paid_total,
          COALESCE(SUM(CASE WHEN status = 'waived' THEN amount END), 0) AS waived_total,
          COALESCE(SUM(amount), 0) AS grand_total
        FROM fines f ${whereClause}
      `, params),
      query(`
        SELECT fine_type,
          COUNT(*) AS count,
          SUM(amount) AS total_amount
        FROM fines f ${whereClause}
        GROUP BY fine_type
      `, params),
      query(`
        SELECT
          u.first_name, u.last_name, u.grade_class,
          COUNT(f.id) AS fine_count,
          SUM(CASE WHEN f.status = 'unpaid' THEN f.amount ELSE 0 END) AS unpaid_total
        FROM fines f
        JOIN users u ON u.id = f.user_id
        ${whereClause}
        GROUP BY u.id, u.first_name, u.last_name, u.grade_class
        HAVING SUM(CASE WHEN f.status = 'unpaid' THEN f.amount ELSE 0 END) > 0
        ORDER BY unpaid_total DESC
        LIMIT 20
      `, params)
    ]);

    res.json({
      summary: summary.rows[0],
      byType: byType.rows,
      topDebtors: byMember.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/circulation - Circulation statistics
const getCirculationReport = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;

    const [dailyStats, topBorrowers, categoryStats] = await Promise.all([
      query(`
        SELECT
          DATE(checkout_date) AS day,
          COUNT(*) AS checkouts,
          COUNT(*) FILTER (WHERE return_date IS NOT NULL) AS returns
        FROM loans
        WHERE checkout_date >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY day
        ORDER BY day
      `),
      query(`
        SELECT
          u.first_name, u.last_name, u.grade_class, u.role,
          COUNT(l.id) AS total_loans,
          COUNT(l.id) FILTER (WHERE l.status IN ('active','overdue')) AS current_loans
        FROM users u
        JOIN loans l ON l.user_id = u.id
        WHERE l.checkout_date >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY u.id
        ORDER BY total_loans DESC
        LIMIT 10
      `),
      query(`
        SELECT
          g.name AS genre,
          COUNT(l.id) AS loan_count
        FROM genres g
        JOIN books b ON b.genre_id = g.id
        JOIN loans l ON l.book_id = b.id
        WHERE l.checkout_date >= NOW() - INTERVAL '${parseInt(period)} days'
        GROUP BY g.name
        ORDER BY loan_count DESC
      `)
    ]);

    res.json({
      dailyStats: dailyStats.rows,
      topBorrowers: topBorrowers.rows,
      byCategory: categoryStats.rows
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/reports/notifications - List notifications
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { unreadOnly, limit = 20 } = req.query;

    let whereClause = 'WHERE n.user_id = $1';
    if (unreadOnly === 'true') {
      whereClause += ' AND n.read_at IS NULL';
    }

    const { rows } = await query(`
      SELECT id, type, subject, body, status, created_at, sent_at, read_at
      FROM notifications n
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, parseInt(limit)]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// PUT /api/reports/notifications/:id/read - Mark notification read
const markNotificationRead = async (req, res, next) => {
  try {
    await query(
      `UPDATE notifications SET read_at = NOW(), status = 'read'
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
};

// GET /api/settings - Get library settings
const getSettings = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT key, value, description FROM library_settings ORDER BY key'
    );
    const settings = {};
    rows.forEach(r => { settings[r.key] = { value: r.value, description: r.description }; });
    res.json(settings);
  } catch (err) {
    next(err);
  }
};

// PUT /api/settings - Update settings (admin)
const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await query(
        `UPDATE library_settings SET value = $1, updated_at = NOW() WHERE key = $2`,
        [String(value), key]
      );
    }
    res.json({ message: 'Settings updated' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats, getInventoryReport, getOverdueReport,
  getFinesReport, getCirculationReport,
  getNotifications, markNotificationRead,
  getSettings, updateSettings
};
