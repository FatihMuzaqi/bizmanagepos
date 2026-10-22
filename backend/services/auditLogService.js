'use strict';
const { AuditLog } = require('../models');

/**
 * Record an audit log event
 * @param {Object} params
 * @param {number} params.business_id
 * @param {number} [params.user_id]
 * @param {string} params.action - e.g. 'PRODUCT_CREATED', 'TRANSACTION_CANCELLED'
 * @param {string} params.entity_type - e.g. 'PRODUCT', 'TRANSACTION', 'STOCK'
 * @param {string|number} [params.entity_id]
 * @param {Object} [params.metadata]
 * @param {Object} [params.transaction] - Sequelize transaction instance
 */
const recordAuditLog = async ({
  business_id,
  user_id = null,
  action,
  entity_type,
  entity_id = null,
  metadata = null,
  transaction = null
}) => {
  try {
    return await AuditLog.create(
      {
        business_id,
        user_id,
        action,
        entity_type,
        entity_id: entity_id ? entity_id.toString() : null,
        metadata,
        created_at: new Date()
      },
      { transaction }
    );
  } catch (err) {
    // Non-blocking error logging to ensure core business flow succeeds even if audit fails
    console.error(`[AuditLog Error] Failed to record action ${action}:`, err.message);
    return null;
  }
};

/**
 * Retrieve audit logs for business
 */
const getAuditLogs = async (business_id, { limit = 50, offset = 0, action = null, entity_type = null } = {}) => {
  const whereClause = { business_id };
  if (action) whereClause.action = action;
  if (entity_type) whereClause.entity_type = entity_type;

  return await AuditLog.findAndCountAll({
    where: whereClause,
    order: [['created_at', 'DESC']],
    limit,
    offset
  });
};

module.exports = {
  recordAuditLog,
  getAuditLogs
};
