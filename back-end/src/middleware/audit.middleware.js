const AuditLog = require('../models/AuditLog');

const auditLog = (action, resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async (body) => {
    try {
      if (req.user) {
        await AuditLog.create({
          user: req.user._id,
          action,
          resource,
          resourceId: req.params.id || body?.data?._id,
          details: {
            method: req.method,
            url: req.originalUrl,
            body: req.method !== 'GET' ? req.body : undefined,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          status: res.statusCode < 400 ? 'success' : 'failure',
        });
      }
    } catch {
      // Audit logging errors should not break the response
    }
    return originalJson(body);
  };

  next();
};

module.exports = auditLog;
