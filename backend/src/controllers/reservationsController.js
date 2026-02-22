const { query, getClient } = require('../config/database');
const { logAudit } = require('../utils/audit');
const { notifyUser } = require('../services/notificationService');
const { HOLD_EXPIRY_DAYS } = require('../config/constants');

// GET /api/reservations - List reservations (librarian)
const listReservations = async (req, res, next) => {
  try {
    const { status, bookId, userId, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (status) {
      params.push(status);
      whereClause += ` AND r.status = $${params.length}`;
    }
    if (bookId) {
      params.push(bookId);
      whereClause += ` AND r.book_id = $${params.length}`;
    }
    if (userId) {
      params.push(userId);
      whereClause += ` AND r.user_id = $${params.length}`;
    }

    params.push(parseInt(limit));
    params.push(offset);

    const { rows } = await query(`
      SELECT
        r.id, r.status, r.queue_position, r.reserved_at,
        r.notified_at, r.expires_at, r.fulfilled_at,
        b.id AS book_id, b.title, b.isbn, b.available_copies,
        u.id AS user_id, u.first_name, u.last_name, u.email, u.grade_class,
        STRING_AGG(DISTINCT a.name, ', ') AS authors
      FROM reservations r
      JOIN books b ON b.id = r.book_id
      JOIN users u ON u.id = r.user_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      ${whereClause}
      GROUP BY r.id, b.id, u.id
      ORDER BY r.reserved_at ASC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /api/reservations - Place a hold
const placeReservation = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { bookId } = req.body;
    const userId = req.user.id;

    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    // Check book exists
    const bookResult = await client.query(
      'SELECT id, title, available_copies FROM books WHERE id = $1 AND is_active = true',
      [bookId]
    );
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = bookResult.rows[0];

    // Check if user already has this book checked out
    const existingLoan = await client.query(`
      SELECT id FROM loans
      WHERE user_id = $1 AND book_id = $2 AND status IN ('active', 'overdue')
    `, [userId, bookId]);
    if (existingLoan.rows.length > 0) {
      return res.status(409).json({ error: 'You already have this book checked out' });
    }

    // Check if user already has a pending reservation for this book
    const existingReservation = await client.query(`
      SELECT id FROM reservations
      WHERE user_id = $1 AND book_id = $2 AND status IN ('pending', 'ready')
    `, [userId, bookId]);
    if (existingReservation.rows.length > 0) {
      return res.status(409).json({ error: 'You already have a hold on this book' });
    }

    // If book is available, suggest checkout instead
    if (book.available_copies > 0) {
      return res.status(409).json({
        error: 'This book is currently available. Please check it out directly.',
        available: true
      });
    }

    // Get queue position
    const queueResult = await client.query(`
      SELECT COALESCE(MAX(queue_position), 0) + 1 AS next_position
      FROM reservations
      WHERE book_id = $1 AND status IN ('pending', 'ready')
    `, [bookId]);

    const queuePosition = queueResult.rows[0].next_position;

    const result = await client.query(`
      INSERT INTO reservations (book_id, user_id, queue_position, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING id
    `, [bookId, userId, queuePosition]);

    await client.query('COMMIT');
    await logAudit(userId, 'RESERVATION_PLACED', 'reservation',
      result.rows[0].id, { bookId, queuePosition }, req.ip);

    notifyUser({
      userId,
      type: 'hold_placed',
      subject: `Hold Placed: ${book.title}`,
      body: `Your hold on "${book.title}" has been placed. You are #${queuePosition} in the queue.`,
      referenceId: result.rows[0].id
    }).catch(console.error);

    res.status(201).json({
      reservationId: result.rows[0].id,
      queuePosition,
      message: `Hold placed successfully. You are #${queuePosition} in the queue.`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// DELETE /api/reservations/:id - Cancel a reservation
const cancelReservation = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    const reservationResult = await client.query(
      'SELECT * FROM reservations WHERE id = $1', [id]
    );

    if (reservationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reservation not found' });
    }

    const reservation = reservationResult.rows[0];

    // Only the patron or librarian can cancel
    if (req.user.role === 'student' || req.user.role === 'staff') {
      if (reservation.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    if (['fulfilled', 'cancelled', 'expired'].includes(reservation.status)) {
      return res.status(400).json({ error: `Reservation is already ${reservation.status}` });
    }

    // If a copy was assigned, release it
    if (reservation.copy_id && reservation.status === 'ready') {
      await client.query(
        `UPDATE book_copies SET status = 'available' WHERE id = $1`,
        [reservation.copy_id]
      );
    }

    await client.query(
      `UPDATE reservations SET status = 'cancelled' WHERE id = $1`, [id]
    );

    // Reorder queue
    await client.query(`
      UPDATE reservations SET
        queue_position = queue_position - 1
      WHERE book_id = $1
        AND status IN ('pending', 'ready')
        AND queue_position > $2
    `, [reservation.book_id, reservation.queue_position]);

    await client.query('COMMIT');
    await logAudit(req.user.id, 'RESERVATION_CANCELLED', 'reservation', id, null, req.ip);

    res.json({ message: 'Reservation cancelled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/reservations/book/:bookId - Get queue for a book
const getBookQueue = async (req, res, next) => {
  try {
    const { bookId } = req.params;

    const { rows } = await query(`
      SELECT
        r.id, r.queue_position, r.status, r.reserved_at,
        r.notified_at, r.expires_at,
        u.first_name, u.last_name, u.grade_class
      FROM reservations r
      JOIN users u ON u.id = r.user_id
      WHERE r.book_id = $1 AND r.status IN ('pending', 'ready')
      ORDER BY r.queue_position ASC
    `, [bookId]);

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = { listReservations, placeReservation, cancelReservation, getBookQueue };
