'use strict';
const auditLogService = require('../services/auditLogService');
const { paginatedResponse } = require('../utils/apiResponse');

const getAuditLogs = async (req, res, next) => {
  try {
    const businessId = req.business.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const { rows: logs, count: totalItems } = await auditLogService.getAuditLogs(businessId, {
      limit,
      offset,
      action: req.query.action || null,
      entity_type: req.query.entity_type || null
    });

    return paginatedResponse(res, 'Audit logs retrieved successfully', { logs }, { page, limit, totalItems });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
