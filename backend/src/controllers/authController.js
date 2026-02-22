const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { signToken } = require('../utils/jwt');
const { logAudit } = require('../utils/audit');

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { rows } = await query(
      `SELECT id, username, email, password_hash, role, first_name, last_name,
              is_active, email_notifications
       FROM users
       WHERE username = $1 OR email = $1`,
      [username.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact the library.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = signToken({ id: user.id, role: user.role });

    // Fetch outstanding fines count
    const fineResult = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_fines
       FROM fines WHERE user_id = $1 AND status = 'unpaid'`,
      [user.id]
    );

    await logAudit(user.id, 'LOGIN', 'user', user.id, null, req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        emailNotifications: user.email_notifications,
        totalUnpaidFines: parseFloat(fineResult.rows[0].total_fines),
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.username, u.email, u.role, u.first_name, u.last_name,
              u.phone, u.grade_class, u.barcode, u.email_notifications, u.created_at,
              COALESCE(f.total_fines, 0) as total_unpaid_fines,
              COALESCE(l.active_loans, 0) as active_loans
       FROM users u
       LEFT JOIN (
         SELECT user_id, SUM(amount) as total_fines
         FROM fines WHERE status = 'unpaid'
         GROUP BY user_id
       ) f ON f.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*) as active_loans
         FROM loans WHERE status IN ('active', 'overdue')
         GROUP BY user_id
       ) l ON l.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const u = rows[0];
    res.json({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      firstName: u.first_name,
      lastName: u.last_name,
      phone: u.phone,
      gradeClass: u.grade_class,
      barcode: u.barcode,
      emailNotifications: u.email_notifications,
      createdAt: u.created_at,
      totalUnpaidFines: parseFloat(u.total_unpaid_fines),
      activeLoans: parseInt(u.active_loans),
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    await logAudit(req.user.id, 'PASSWORD_CHANGE', 'user', req.user.id, null, req.ip);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const { email, phone, emailNotifications } = req.body;

    await query(
      `UPDATE users SET
         email = COALESCE($1, email),
         phone = COALESCE($2, phone),
         email_notifications = COALESCE($3, email_notifications)
       WHERE id = $4`,
      [email || null, phone || null,
       emailNotifications !== undefined ? emailNotifications : null,
       req.user.id]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, getMe, changePassword, updateProfile };
