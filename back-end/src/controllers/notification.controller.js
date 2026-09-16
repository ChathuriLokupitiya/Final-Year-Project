const Notification = require('../models/Notification');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getMyNotifications = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { recipient: req.user._id };
    if (req.query.unreadOnly === 'true') filter.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved.',
      data: notifications,
      meta: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        unreadCount,
      },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() }
    );
    return sendSuccess(res, 200, 'Notification marked as read.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return sendSuccess(res, 200, 'All notifications marked as read.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    return sendSuccess(res, 200, 'Notification deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
