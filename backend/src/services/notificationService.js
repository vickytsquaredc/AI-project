const nodemailer = require('nodemailer');
const { query } = require('../config/database');

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  if (process.env.NODE_ENV === 'development' || !process.env.EMAIL_HOST) {
    // In development, log emails to console instead of sending
    transporter = {
      sendMail: async (opts) => {
        console.log('\n--- EMAIL ---');
        console.log('To:', opts.to);
        console.log('Subject:', opts.subject);
        console.log('Body:', opts.text || opts.html);
        console.log('-------------\n');
        return { messageId: 'dev-' + Date.now() };
      }
    };
  } else {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  return transporter;
};

/**
 * Save notification to DB and optionally send email
 */
const notifyUser = async ({ userId, type, subject, body, referenceId }) => {
  try {
    // Save to notifications table
    const result = await query(`
      INSERT INTO notifications (user_id, type, subject, body, reference_id, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id
    `, [userId, type, subject, body, referenceId || null]);

    const notificationId = result.rows[0].id;

    // Fetch user email preferences
    const userResult = await query(
      'SELECT email, email_notifications FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) return;
    const user = userResult.rows[0];

    if (user.email_notifications && user.email) {
      try {
        const mailer = getTransporter();
        await mailer.sendMail({
          from: process.env.EMAIL_FROM || 'Library System <library@school.edu>',
          to: user.email,
          subject,
          text: body,
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">School Library</h2>
            <p>${body.replace(/\n/g, '<br>')}</p>
            <hr>
            <p style="color: #6b7280; font-size: 12px;">
              Springfield School Library<br>
              Reply to this email or visit the library for assistance.
            </p>
          </div>`
        });

        await query(
          `UPDATE notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
          [notificationId]
        );
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
        await query(
          `UPDATE notifications SET status = 'failed' WHERE id = $1`,
          [notificationId]
        );
      }
    } else {
      await query(
        `UPDATE notifications SET status = 'sent', sent_at = NOW() WHERE id = $1`,
        [notificationId]
      );
    }
  } catch (err) {
    console.error('notifyUser failed:', err.message);
  }
};

/**
 * Send due date reminders for loans due soon
 */
const sendDueReminders = async () => {
  try {
    const settingResult = await query(
      `SELECT value FROM library_settings WHERE key = 'send_due_reminder_days'`
    );
    const reminderDays = parseInt(settingResult.rows[0]?.value) || 2;

    const { rows: loans } = await query(`
      SELECT
        l.id, l.due_date, l.user_id,
        b.title AS book_title,
        u.email, u.email_notifications
      FROM loans l
      JOIN books b ON b.id = l.book_id
      JOIN users u ON u.id = l.user_id
      WHERE l.status = 'active'
        AND l.due_date BETWEEN NOW() AND NOW() + INTERVAL '${reminderDays} days'
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.reference_id = l.id
            AND n.type = 'due_reminder'
            AND n.created_at > NOW() - INTERVAL '1 day'
        )
    `);

    for (const loan of loans) {
      const dueDate = new Date(loan.due_date).toDateString();
      await notifyUser({
        userId: loan.user_id,
        type: 'due_reminder',
        subject: `Reminder: "${loan.book_title}" is due ${dueDate}`,
        body: `This is a reminder that "${loan.book_title}" is due on ${dueDate}.\n\nPlease return or renew it on time to avoid fines.`,
        referenceId: loan.id
      });
    }

    if (loans.length > 0) {
      console.log(`Sent ${loans.length} due date reminders`);
    }
  } catch (err) {
    console.error('sendDueReminders failed:', err.message);
  }
};

/**
 * Send overdue notices
 */
const sendOverdueNotices = async () => {
  try {
    // Update overdue status
    await query(`
      UPDATE loans SET status = 'overdue'
      WHERE due_date < NOW() AND status = 'active'
    `);

    const { rows: loans } = await query(`
      SELECT
        l.id, l.due_date, l.user_id,
        b.title AS book_title,
        CEIL(DATE_PART('day', NOW() - l.due_date)) AS days_overdue,
        CEIL(DATE_PART('day', NOW() - l.due_date)) * $1 AS estimated_fine
      FROM loans l
      JOIN books b ON b.id = l.book_id
      WHERE l.status = 'overdue'
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.reference_id = l.id
            AND n.type = 'overdue_notice'
            AND n.created_at > NOW() - INTERVAL '1 day'
        )
    `, [parseFloat(process.env.FINE_RATE_PER_DAY) || 0.25]);

    for (const loan of loans) {
      const dueDate = new Date(loan.due_date).toDateString();
      await notifyUser({
        userId: loan.user_id,
        type: 'overdue_notice',
        subject: `Overdue: "${loan.book_title}" - ${loan.days_overdue} days overdue`,
        body: `"${loan.book_title}" was due on ${dueDate} and is now ${loan.days_overdue} day(s) overdue.\n\nEstimated fine: $${parseFloat(loan.estimated_fine).toFixed(2)}\n\nPlease return the book immediately.`,
        referenceId: loan.id
      });
    }

    if (loans.length > 0) {
      console.log(`Sent ${loans.length} overdue notices`);
    }
  } catch (err) {
    console.error('sendOverdueNotices failed:', err.message);
  }
};

/**
 * Expire holds that weren't picked up
 */
const expireHolds = async () => {
  try {
    const { rows: expiredHolds } = await query(`
      SELECT r.id, r.user_id, r.copy_id, r.book_id, b.title AS book_title
      FROM reservations r
      JOIN books b ON b.id = r.book_id
      WHERE r.status = 'ready'
        AND r.expires_at < NOW()
    `);

    for (const hold of expiredHolds) {
      // Release the copy back to available
      if (hold.copy_id) {
        await query(
          `UPDATE book_copies SET status = 'available' WHERE id = $1`,
          [hold.copy_id]
        );
      }

      await query(
        `UPDATE reservations SET status = 'expired' WHERE id = $1`,
        [hold.id]
      );

      await notifyUser({
        userId: hold.user_id,
        type: 'hold_expired',
        subject: `Hold Expired: "${hold.book_title}"`,
        body: `Your hold on "${hold.book_title}" has expired because it was not picked up in time. You may place a new hold if needed.`,
        referenceId: hold.id
      });
    }

    if (expiredHolds.length > 0) {
      console.log(`Expired ${expiredHolds.length} holds`);
    }
  } catch (err) {
    console.error('expireHolds failed:', err.message);
  }
};

module.exports = { notifyUser, sendDueReminders, sendOverdueNotices, expireHolds };
