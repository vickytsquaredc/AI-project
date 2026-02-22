const { query } = require('../config/database');

const logAudit = async (userId, action, entityType, entityId, details, ipAddress) => {
  try {
    await query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, action, entityType || null, entityId || null,
       details ? JSON.stringify(details) : null, ipAddress || null]
    );
  } catch (err) {
    // Audit logging should never crash the main operation
    console.error('Audit log failed:', err.message);
  }
};

module.exports = { logAudit };
