const { query } = require('../config/database');
const { logAudit } = require('../utils/audit');
const { notifyUser } = require('../services/notificationService');

// GET /api/fines - List fines (librarian)
const listFines = async (req, res, next) => {
  try {
    const { status, userId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (status) {
      params.push(status);
      whereClause += ` AND f.status = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      whereClause += ` AND f.user_id = $${params.length}`;
    }

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await query(`
      SELECT
        f.id, f.fine_type, f.amount, f.days_overdue, f.status,
        f.issued_at, f.paid_at, f.waive_reason, f.notes,
        b.id AS book_id, b.title AS book_title,
        u.id AS user_id, u.first_name, u.last_name, u.email, u.grade_class,
        w.first_name || ' ' || w.last_name AS waived_by_name
      FROM fines f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN books b ON b.id = f.book_id
      LEFT JOIN users w ON w.id = f.waived_by
      ${whereClause}
      ORDER BY f.issued_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/fines/:id/pay - Mark fine as paid
const payFine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const fineResult = await query(
      'SELECT * FROM fines WHERE id = $1', [id]
    );

    if (fineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }

    const fine = fineResult.rows[0];
    if (fine.status !== 'unpaid') {
      return res.status(400).json({ error: `Fine is already ${fine.status}` });
    }

    await query(`
      UPDATE fines SET
        status = 'paid',
        paid_at = NOW(),
        notes = COALESCE($1, notes)
      WHERE id = $2
    `, [notes || null, id]);

    await logAudit(req.user.id, 'FINE_PAID', 'fine', id,
      { amount: fine.amount }, req.ip);

    res.json({ message: `Fine of $${fine.amount} marked as paid` });
  } catch (err) {
    next(err);
  }
};

// POST /api/fines/:id/waive - Waive a fine (librarian/admin)
const waiveFine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const fineResult = await query('SELECT * FROM fines WHERE id = $1', [id]);

    if (fineResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fine not found' });
    }

    const fine = fineResult.rows[0];
    if (fine.status !== 'unpaid') {
      return res.status(400).json({ error: `Fine is already ${fine.status}` });
    }

    await query(`
      UPDATE fines SET
        status = 'waived',
        waived_by = $1,
        waive_reason = $2
      WHERE id = $3
    `, [req.user.id, reason || null, id]);

    await logAudit(req.user.id, 'FINE_WAIVED', 'fine', id,
      { amount: fine.amount, reason }, req.ip);

    res.json({ message: `Fine of $${fine.amount} waived` });
  } catch (err) {
    next(err);
  }
};

// POST /api/fines/pay-all/:userId - Pay all fines for a user
const payAllFines = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { notes } = req.body;

    const result = await query(`
      UPDATE fines SET
        status = 'paid',
        paid_at = NOW(),
        notes = COALESCE($1, notes)
      WHERE user_id = $2 AND status = 'unpaid'
      RETURNING amount
    `, [notes || null, userId]);

    const totalPaid = result.rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    await logAudit(req.user.id, 'FINES_PAID_ALL', 'user', userId,
      { totalPaid, count: result.rows.length }, req.ip);

    res.json({
      message: `${result.rows.length} fine(s) paid totaling $${totalPaid.toFixed(2)}`,
      count: result.rows.length,
      totalPaid
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/fines/issue - Manually issue a fine (librarian)
const issueFine = async (req, res, next) => {
  try {
    const { userId, bookId, fineType, amount, notes } = req.body;

    if (!userId || !fineType || !amount) {
      return res.status(400).json({ error: 'User ID, fine type, and amount are required' });
    }

    const result = await query(`
      INSERT INTO fines (user_id, book_id, fine_type, amount, status, notes)
      VALUES ($1, $2, $3, $4, 'unpaid', $5)
      RETURNING id
    `, [userId, bookId || null, fineType, amount, notes || null]);

    await logAudit(req.user.id, 'FINE_ISSUED', 'fine', result.rows[0].id,
      { userId, fineType, amount }, req.ip);

    res.status(201).json({ id: result.rows[0].id, message: 'Fine issued successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listFines, payFine, waiveFine, payAllFines, issueFine };
