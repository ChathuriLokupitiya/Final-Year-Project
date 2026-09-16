const { sendError } = require('../utils/response.util');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Authentication required.');
    }
    if (!roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`
      );
    }
    next();
  };
};

const isAdmin = authorize('admin');
const isStaff = authorize('staff', 'admin');
const isCustomer = authorize('customer', 'admin');
const isOwner = (getOwnerId) => async (req, res, next) => {
  try {
    const ownerId = await getOwnerId(req);
    if (req.user.role === 'admin') return next();
    if (!ownerId || ownerId.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied. You do not own this resource.');
    }
    next();
  } catch {
    return sendError(res, 500, 'Authorization error.');
  }
};

module.exports = { authorize, isAdmin, isStaff, isCustomer, isOwner };
