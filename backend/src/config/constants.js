require('dotenv').config();

module.exports = {
  ROLES: {
    STUDENT: 'student',
    STAFF: 'staff',
    LIBRARIAN: 'librarian',
    ADMIN: 'admin',
  },

  BOOK_STATUS: {
    AVAILABLE: 'available',
    CHECKED_OUT: 'checked_out',
    RESERVED: 'reserved',
    LOST: 'lost',
    DAMAGED: 'damaged',
    PROCESSING: 'processing',
  },

  LOAN_STATUS: {
    ACTIVE: 'active',
    RETURNED: 'returned',
    OVERDUE: 'overdue',
    LOST: 'lost',
  },

  RESERVATION_STATUS: {
    PENDING: 'pending',
    READY: 'ready',
    FULFILLED: 'fulfilled',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
  },

  FINE_STATUS: {
    UNPAID: 'unpaid',
    PAID: 'paid',
    WAIVED: 'waived',
  },

  FINE_TYPE: {
    OVERDUE: 'overdue',
    LOST: 'lost',
    DAMAGED: 'damaged',
  },

  // Library policy settings (from env or defaults)
  FINE_RATE_PER_DAY: parseFloat(process.env.FINE_RATE_PER_DAY) || 0.25,
  MAX_BOOKS_STUDENT: parseInt(process.env.MAX_BOOKS_PER_STUDENT) || 3,
  MAX_BOOKS_STAFF: parseInt(process.env.MAX_BOOKS_PER_STAFF) || 5,
  LOAN_PERIOD_DAYS: parseInt(process.env.LOAN_PERIOD_DAYS) || 14,
  RENEWAL_PERIOD_DAYS: parseInt(process.env.RENEWAL_PERIOD_DAYS) || 7,
  MAX_RENEWALS: parseInt(process.env.MAX_RENEWALS) || 2,
  HOLD_EXPIRY_DAYS: parseInt(process.env.HOLD_EXPIRY_DAYS) || 3,
};
