const { query, getClient } = require('../config/database');
const { logAudit } = require('../utils/audit');
const { notifyUser } = require('../services/notificationService');
const {
  LOAN_STATUS, BOOK_STATUS, RESERVATION_STATUS,
  FINE_RATE_PER_DAY, MAX_BOOKS_STUDENT, MAX_BOOKS_STAFF,
  LOAN_PERIOD_DAYS, RENEWAL_PERIOD_DAYS, MAX_RENEWALS
} = require('../config/constants');

// Utility: calculate due date
const getDueDate = (days = LOAN_PERIOD_DAYS) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
};

// GET /api/circulation/loans - List all active loans (librarian)
const listLoans = async (req, res, next) => {
  try {
    const { status, userId, overdue, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (status) {
      params.push(status);
      whereClause += ` AND l.status = $${params.length}`;
    } else if (overdue === 'true') {
      whereClause += ` AND (l.status = 'overdue' OR (l.status = 'active' AND l.due_date < NOW()))`;
    }

    if (userId) {
      params.push(userId);
      whereClause += ` AND l.user_id = $${params.length}`;
    }

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await query(`
      SELECT
        l.id, l.checkout_date, l.due_date, l.return_date,
        l.renewal_count, l.status, l.notes,
        l.due_date < NOW() AND l.status = 'active' AS is_overdue,
        GREATEST(0, DATE_PART('day', NOW() - l.due_date)) AS days_overdue,
        b.id AS book_id, b.title, b.isbn, b.call_number,
        bc.barcode AS copy_barcode,
        u.id AS user_id, u.first_name, u.last_name, u.grade_class, u.barcode AS member_barcode,
        STRING_AGG(DISTINCT a.name, ', ') AS authors
      FROM loans l
      JOIN book_copies bc ON bc.id = l.copy_id
      JOIN books b ON b.id = l.book_id
      JOIN users u ON u.id = l.user_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      ${whereClause}
      GROUP BY l.id, b.id, bc.id, u.id
      ORDER BY l.due_date ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/circulation/checkout - Checkout a book
const checkout = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { userId, copyBarcode, bookId, notes } = req.body;

    if (!userId || (!copyBarcode && !bookId)) {
      return res.status(400).json({ error: 'User ID and book copy barcode or book ID are required' });
    }

    // Get user
    const userResult = await client.query(
      `SELECT id, role, is_active, first_name, last_name, email
       FROM users WHERE id = $1`, [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const user = userResult.rows[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Member account is deactivated' });
    }

    // Check unpaid fines
    const fineResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM fines WHERE user_id = $1 AND status = 'unpaid'`,
      [userId]
    );
    const unpaidFines = parseFloat(fineResult.rows[0].total);
    if (unpaidFines > 5.00) {
      return res.status(403).json({
        error: `Member has $${unpaidFines.toFixed(2)} in unpaid fines. Please settle fines before checking out.`,
        unpaidFines
      });
    }

    // Check loan limits
    const maxBooks = user.role === 'student' ? MAX_BOOKS_STUDENT : MAX_BOOKS_STAFF;
    const activeLoansResult = await client.query(
      `SELECT COUNT(*) AS count
       FROM loans WHERE user_id = $1 AND status IN ('active', 'overdue')`,
      [userId]
    );
    const activeLoans = parseInt(activeLoansResult.rows[0].count);
    if (activeLoans >= maxBooks) {
      return res.status(403).json({
        error: `Member has reached the maximum of ${maxBooks} checked-out books.`,
        activeLoans, maxBooks
      });
    }

    // Find copy
    let copyResult;
    if (copyBarcode) {
      copyResult = await client.query(
        `SELECT bc.id, bc.book_id, bc.barcode, bc.status
         FROM book_copies bc
         WHERE bc.barcode = $1`,
        [copyBarcode]
      );
    } else {
      // Find any available copy of the book
      copyResult = await client.query(
        `SELECT bc.id, bc.book_id, bc.barcode, bc.status
         FROM book_copies bc
         WHERE bc.book_id = $1 AND bc.status = 'available'
         LIMIT 1`,
        [bookId]
      );
    }

    if (copyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book copy not found' });
    }

    const copy = copyResult.rows[0];
    if (copy.status !== 'available') {
      return res.status(409).json({ error: `Copy is not available (status: ${copy.status})` });
    }

    const dueDate = getDueDate(LOAN_PERIOD_DAYS);

    // Create loan
    const loanResult = await client.query(`
      INSERT INTO loans (copy_id, book_id, user_id, checked_out_by, due_date, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING id
    `, [copy.id, copy.book_id, userId, req.user.id, dueDate]);

    const loanId = loanResult.rows[0].id;

    // Mark copy as checked out
    await client.query(
      `UPDATE book_copies SET status = 'checked_out' WHERE id = $1`,
      [copy.id]
    );

    // Get book title for notification
    const bookInfoResult = await client.query(
      'SELECT title FROM books WHERE id = $1', [copy.book_id]
    );
    const bookTitle = bookInfoResult.rows[0]?.title;

    await client.query('COMMIT');

    // Send notification (non-blocking)
    notifyUser({
      userId,
      type: 'checkout_confirmation',
      subject: `Book Checked Out: ${bookTitle}`,
      body: `You have successfully checked out "${bookTitle}". Due date: ${dueDate.toDateString()}.`,
      referenceId: loanId
    }).catch(console.error);

    await logAudit(req.user.id, 'CHECKOUT', 'loan', loanId,
      { userId, copyBarcode: copy.barcode, bookId: copy.book_id }, req.ip);

    res.status(201).json({
      loanId,
      dueDate,
      message: `Book checked out successfully. Due: ${dueDate.toDateString()}`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/circulation/return - Return a book
const returnBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { copyBarcode, loanId } = req.body;

    if (!copyBarcode && !loanId) {
      return res.status(400).json({ error: 'Copy barcode or loan ID is required' });
    }

    // Find the active loan
    let loanResult;
    if (loanId) {
      loanResult = await client.query(`
        SELECT l.*, bc.barcode AS copy_barcode, b.title AS book_title
        FROM loans l
        JOIN book_copies bc ON bc.id = l.copy_id
        JOIN books b ON b.id = l.book_id
        WHERE l.id = $1 AND l.status IN ('active', 'overdue')
      `, [loanId]);
    } else {
      loanResult = await client.query(`
        SELECT l.*, bc.barcode AS copy_barcode, b.title AS book_title
        FROM loans l
        JOIN book_copies bc ON bc.id = l.copy_id
        JOIN books b ON b.id = l.book_id
        WHERE bc.barcode = $1 AND l.status IN ('active', 'overdue')
      `, [copyBarcode]);
    }

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active loan found for this copy' });
    }

    const loan = loanResult.rows[0];
    const now = new Date();
    const dueDate = new Date(loan.due_date);
    const isOverdue = now > dueDate;
    let fineAmount = 0;
    let daysOverdue = 0;
    let fineId = null;

    // Calculate fine if overdue
    if (isOverdue) {
      daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      fineAmount = parseFloat((daysOverdue * FINE_RATE_PER_DAY).toFixed(2));

      const fineResult = await client.query(`
        INSERT INTO fines (loan_id, user_id, book_id, fine_type, amount, days_overdue, status)
        VALUES ($1, $2, $3, 'overdue', $4, $5, 'unpaid')
        RETURNING id
      `, [loan.id, loan.user_id, loan.book_id, fineAmount, daysOverdue]);
      fineId = fineResult.rows[0].id;
    }

    // Update loan
    await client.query(`
      UPDATE loans SET
        status = 'returned',
        return_date = NOW(),
        returned_by = $1
      WHERE id = $2
    `, [req.user.id, loan.id]);

    // Return copy to available (unless there's a pending reservation)
    const reservationResult = await client.query(`
      SELECT r.id, r.user_id, u.email, u.first_name
      FROM reservations r
      JOIN users u ON u.id = r.user_id
      WHERE r.book_id = $1 AND r.status = 'pending'
      ORDER BY r.queue_position ASC, r.reserved_at ASC
      LIMIT 1
    `, [loan.book_id]);

    if (reservationResult.rows.length > 0) {
      // Mark copy as reserved for the next patron
      const nextReservation = reservationResult.rows[0];
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 3);

      await client.query(
        `UPDATE book_copies SET status = 'reserved' WHERE id = $1`,
        [loan.copy_id]
      );

      await client.query(`
        UPDATE reservations SET
          status = 'ready',
          copy_id = $1,
          notified_at = NOW(),
          expires_at = $2
        WHERE id = $3
      `, [loan.copy_id, expiresAt, nextReservation.id]);

      // Notify patron
      notifyUser({
        userId: nextReservation.user_id,
        type: 'hold_ready',
        subject: `Hold Ready: ${loan.book_title}`,
        body: `"${loan.book_title}" is now available for pickup. Please collect it within 3 days.`,
        referenceId: nextReservation.id
      }).catch(console.error);
    } else {
      await client.query(
        `UPDATE book_copies SET status = 'available' WHERE id = $1`,
        [loan.copy_id]
      );
    }

    await client.query('COMMIT');

    await logAudit(req.user.id, 'RETURN', 'loan', loan.id,
      { copyBarcode: loan.copy_barcode, fineAmount }, req.ip);

    res.json({
      message: 'Book returned successfully',
      isOverdue,
      daysOverdue,
      fineAmount,
      fineId,
      bookTitle: loan.book_title
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/circulation/renew - Renew a loan
const renewLoan = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { loanId } = req.body;

    if (!loanId) {
      return res.status(400).json({ error: 'Loan ID is required' });
    }

    const loanResult = await client.query(`
      SELECT l.*, b.title AS book_title, b.id AS book_id_val
      FROM loans l
      JOIN books b ON b.id = l.book_id
      WHERE l.id = $1
    `, [loanId]);

    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Verify the requesting user owns this loan or is a librarian
    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (loan.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (loan.status === 'returned') {
      return res.status(400).json({ error: 'Book has already been returned' });
    }

    if (loan.renewal_count >= MAX_RENEWALS) {
      return res.status(400).json({
        error: `Maximum renewals (${MAX_RENEWALS}) reached for this loan`
      });
    }

    // Check if book has pending reservations
    const reserveCheck = await client.query(`
      SELECT COUNT(*) AS count
      FROM reservations
      WHERE book_id = $1 AND status IN ('pending', 'ready')
    `, [loan.book_id]);

    if (parseInt(reserveCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot renew: other members are waiting for this book'
      });
    }

    const newDueDate = getDueDate(RENEWAL_PERIOD_DAYS);

    await client.query(`
      UPDATE loans SET
        due_date = $1,
        renewal_count = renewal_count + 1,
        status = 'active'
      WHERE id = $2
    `, [newDueDate, loanId]);

    await client.query('COMMIT');

    await logAudit(req.user.id, 'RENEWAL', 'loan', loanId,
      { newDueDate, renewalCount: loan.renewal_count + 1 }, req.ip);

    // Notify
    notifyUser({
      userId: loan.user_id,
      type: 'renewal_confirmed',
      subject: `Renewal Confirmed: ${loan.book_title}`,
      body: `Your loan of "${loan.book_title}" has been renewed. New due date: ${newDueDate.toDateString()}.`,
      referenceId: loanId
    }).catch(console.error);

    res.json({
      message: 'Loan renewed successfully',
      newDueDate,
      renewalCount: loan.renewal_count + 1,
      renewalsRemaining: MAX_RENEWALS - (loan.renewal_count + 1)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/circulation/overdue - List overdue loans
const getOverdueLoans = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        l.id, l.checkout_date, l.due_date,
        l.renewal_count, l.status,
        CEIL(DATE_PART('day', NOW() - l.due_date)) AS days_overdue,
        CEIL(DATE_PART('day', NOW() - l.due_date)) * $1 AS estimated_fine,
        b.id AS book_id, b.title, b.isbn, b.call_number,
        bc.barcode AS copy_barcode,
        u.id AS user_id, u.first_name, u.last_name,
        u.email, u.grade_class
      FROM loans l
      JOIN book_copies bc ON bc.id = l.copy_id
      JOIN books b ON b.id = l.book_id
      JOIN users u ON u.id = l.user_id
      WHERE l.due_date < NOW()
        AND l.status IN ('active', 'overdue')
      ORDER BY l.due_date ASC
    `, [FINE_RATE_PER_DAY]);

    // Update status to overdue
    await query(`
      UPDATE loans SET status = 'overdue'
      WHERE due_date < NOW() AND status = 'active'
    `);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/circulation/loan/:id - Get loan details
const getLoan = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows } = await query(`
      SELECT
        l.id, l.checkout_date, l.due_date, l.return_date,
        l.renewal_count, l.status, l.notes,
        b.id AS book_id, b.title, b.isbn, b.call_number,
        bc.barcode AS copy_barcode,
        u.id AS user_id, u.first_name, u.last_name, u.email, u.grade_class,
        co.first_name || ' ' || co.last_name AS checked_out_by_name,
        rt.first_name || ' ' || rt.last_name AS returned_by_name,
        f.amount AS fine_amount, f.status AS fine_status,
        STRING_AGG(DISTINCT a.name, ', ') AS authors
      FROM loans l
      JOIN book_copies bc ON bc.id = l.copy_id
      JOIN books b ON b.id = l.book_id
      JOIN users u ON u.id = l.user_id
      LEFT JOIN users co ON co.id = l.checked_out_by
      LEFT JOIN users rt ON rt.id = l.returned_by
      LEFT JOIN fines f ON f.loan_id = l.id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      WHERE l.id = $1
      GROUP BY l.id, b.id, bc.id, u.id, co.id, rt.id, f.amount, f.status
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Only the patron or librarian can view loan details
    const loan = rows[0];
    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (loan.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    res.json(loan);
  } catch (err) {
    next(err);
  }
};

module.exports = { listLoans, checkout, returnBook, renewLoan, getOverdueLoans, getLoan };
