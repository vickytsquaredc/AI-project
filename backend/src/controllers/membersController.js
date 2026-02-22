const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { logAudit } = require('../utils/audit');

// GET /api/members - List members (librarian/admin)
const listMembers = async (req, res, next) => {
  try {
    const { search, role, active, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (
        u.first_name ILIKE $${params.length}
        OR u.last_name ILIKE $${params.length}
        OR u.email ILIKE $${params.length}
        OR u.username ILIKE $${params.length}
        OR u.barcode ILIKE $${params.length}
        OR u.grade_class ILIKE $${params.length}
      )`;
    }

    if (role) {
      params.push(role);
      whereClause += ` AND u.role = $${params.length}`;
    }

    if (active !== undefined) {
      params.push(active === 'true');
      whereClause += ` AND u.is_active = $${params.length}`;
    }

    params.push(parseInt(limit));
    params.push(offset);

    const membersQuery = `
      SELECT
        u.id, u.username, u.email, u.role, u.first_name, u.last_name,
        u.phone, u.grade_class, u.barcode, u.is_active, u.created_at,
        COALESCE(l.active_loans, 0) AS active_loans,
        COALESCE(f.unpaid_fines, 0) AS unpaid_fines
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS active_loans
        FROM loans WHERE status IN ('active', 'overdue')
        GROUP BY user_id
      ) l ON l.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS unpaid_fines
        FROM fines WHERE status = 'unpaid'
        GROUP BY user_id
      ) f ON f.user_id = u.id
      ${whereClause}
      ORDER BY u.last_name, u.first_name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM users u
      ${whereClause}
    `;

    const countParams = params.slice(0, params.length - 2);
    const [members, countResult] = await Promise.all([
      query(membersQuery, params),
      query(countQuery, countParams)
    ]);

    res.json({
      members: members.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/members/:id - Get member details
const getMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Non-librarians can only see their own profile
    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { rows } = await query(`
      SELECT
        u.id, u.username, u.email, u.role, u.first_name, u.last_name,
        u.phone, u.grade_class, u.barcode, u.is_active,
        u.email_notifications, u.created_at,
        COALESCE(f.unpaid_fines, 0) AS unpaid_fines,
        COALESCE(f.total_fines_ever, 0) AS total_fines_ever,
        COALESCE(l.active_loans, 0) AS active_loans,
        COALESCE(lh.total_loans, 0) AS total_loans_ever
      FROM users u
      LEFT JOIN (
        SELECT user_id,
          SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) AS unpaid_fines,
          SUM(amount) AS total_fines_ever
        FROM fines GROUP BY user_id
      ) f ON f.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS active_loans
        FROM loans WHERE status IN ('active', 'overdue')
        GROUP BY user_id
      ) l ON l.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS total_loans
        FROM loans GROUP BY user_id
      ) lh ON lh.user_id = u.id
      WHERE u.id = $1
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/members/:id/loans - Member loan history
const getMemberLoans = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [id];
    let whereExtra = '';

    if (status) {
      params.push(status);
      whereExtra = ` AND l.status = $${params.length}`;
    }

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await query(`
      SELECT
        l.id, l.checkout_date, l.due_date, l.return_date,
        l.renewal_count, l.status, l.notes,
        b.id AS book_id, b.title, b.isbn,
        bc.barcode AS copy_barcode, bc.location,
        STRING_AGG(DISTINCT a.name, ', ') AS authors,
        f.amount AS fine_amount, f.status AS fine_status
      FROM loans l
      JOIN book_copies bc ON bc.id = l.copy_id
      JOIN books b ON b.id = l.book_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      LEFT JOIN fines f ON f.loan_id = l.id
      WHERE l.user_id = $1 ${whereExtra}
      GROUP BY l.id, b.id, bc.id, f.amount, f.status
      ORDER BY l.checkout_date DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/members/:id/fines - Member fines
const getMemberFines = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { rows } = await query(`
      SELECT
        f.id, f.fine_type, f.amount, f.days_overdue, f.status,
        f.issued_at, f.paid_at, f.waive_reason, f.notes,
        b.title AS book_title, b.id AS book_id,
        l.checkout_date, l.due_date, l.return_date
      FROM fines f
      LEFT JOIN loans l ON l.id = f.loan_id
      LEFT JOIN books b ON b.id = f.book_id
      WHERE f.user_id = $1
      ORDER BY f.issued_at DESC
    `, [id]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/members/:id/reservations - Member reservations
const getMemberReservations = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const { rows } = await query(`
      SELECT
        r.id, r.status, r.queue_position, r.reserved_at,
        r.notified_at, r.expires_at, r.fulfilled_at,
        b.id AS book_id, b.title, b.isbn,
        STRING_AGG(DISTINCT a.name, ', ') AS authors
      FROM reservations r
      JOIN books b ON b.id = r.book_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      WHERE r.user_id = $1
      GROUP BY r.id, b.id
      ORDER BY r.reserved_at DESC
    `, [id]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/members - Create member (librarian/admin)
const createMember = async (req, res, next) => {
  try {
    const {
      username, email, password, role = 'student',
      firstName, lastName, phone, gradeClass
    } = req.body;

    if (!username || !email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Username, email, password, first name, and last name are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Only admins can create librarians/admins
    if ((role === 'librarian' || role === 'admin') && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create librarian/admin accounts' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate barcode
    const countResult = await query('SELECT COUNT(*) FROM users');
    const barcode = `USR${String(parseInt(countResult.rows[0].count) + 1).padStart(6, '0')}`;

    const { rows } = await query(`
      INSERT INTO users (username, email, password_hash, role, first_name, last_name,
        phone, grade_class, barcode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, username, email, role, first_name, last_name, barcode
    `, [
      username.toLowerCase().trim(), email.toLowerCase().trim(),
      passwordHash, role, firstName, lastName,
      phone || null, gradeClass || null, barcode
    ]);

    await logAudit(req.user.id, 'MEMBER_CREATED', 'user', rows[0].id,
      { username, role }, req.ip);

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /api/members/:id - Update member (librarian/admin)
const updateMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, phone, gradeClass, isActive, role, firstName, lastName } = req.body;

    // Students/staff can update their own email/phone only
    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (req.user.id !== id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Only admins can change roles
    if (role && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change member roles' });
    }

    await query(`
      UPDATE users SET
        email = COALESCE($1, email),
        phone = COALESCE($2, phone),
        grade_class = COALESCE($3, grade_class),
        is_active = COALESCE($4, is_active),
        role = COALESCE($5, role),
        first_name = COALESCE($6, first_name),
        last_name = COALESCE($7, last_name)
      WHERE id = $8
    `, [
      email || null, phone || null, gradeClass || null,
      isActive !== undefined ? isActive : null,
      role || null, firstName || null, lastName || null, id
    ]);

    await logAudit(req.user.id, 'MEMBER_UPDATED', 'user', id, { role, isActive }, req.ip);
    res.json({ message: 'Member updated successfully' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/members/:id/reset-password - Reset member password (librarian/admin)
const resetMemberPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);

    await logAudit(req.user.id, 'PASSWORD_RESET', 'user', id, null, req.ip);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/members/barcode/:barcode - Look up member by card barcode
const getMemberByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const { rows } = await query(`
      SELECT
        u.id, u.username, u.email, u.role, u.first_name, u.last_name,
        u.barcode, u.is_active, u.grade_class,
        COALESCE(f.unpaid_fines, 0) AS unpaid_fines,
        COALESCE(l.active_loans, 0) AS active_loans
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS unpaid_fines
        FROM fines WHERE status = 'unpaid' GROUP BY user_id
      ) f ON f.user_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS active_loans
        FROM loans WHERE status IN ('active', 'overdue') GROUP BY user_id
      ) l ON l.user_id = u.id
      WHERE u.barcode = $1
    `, [barcode]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Member not found with that barcode' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMembers, getMember, getMemberLoans, getMemberFines, getMemberReservations,
  createMember, updateMember, resetMemberPassword, getMemberByBarcode
};
