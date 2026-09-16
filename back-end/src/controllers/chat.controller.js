const { ChatRoom, ChatMessage } = require('../models/ChatMessage');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getOrCreateRoom = async (req, res) => {
  try {
    const { participantId, type, appointmentId } = req.body;
    const userId = req.user._id;

    let room = await ChatRoom.findOne({
      participants: { $all: [userId, participantId] },
      type: type || 'support',
    });

    if (!room) {
      room = await ChatRoom.create({
        participants: [userId, participantId],
        type: type || 'support',
        appointment: appointmentId,
      });
    }

    const populated = await room.populate('participants', 'name avatar role');
    return sendSuccess(res, 200, 'Chat room retrieved.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getMyRooms = async (req, res) => {
  try {
    const rooms = await ChatRoom.find({ participants: req.user._id, isActive: true })
      .populate('participants', 'name avatar role')
      .sort({ lastMessageAt: -1 });

    return sendSuccess(res, 200, 'Chat rooms retrieved.', rooms);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getRoomMessages = async (req, res) => {
  try {
    const room = await ChatRoom.findOne({ _id: req.params.roomId, participants: req.user._id });
    if (!room) return sendError(res, 404, 'Chat room not found or access denied.');

    const { page, limit, skip } = getPagination(req.query);
    const [messages, total] = await Promise.all([
      ChatMessage.find({ room: room._id, isDeleted: false })
        .populate('sender', 'name avatar role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ChatMessage.countDocuments({ room: room._id, isDeleted: false }),
    ]);

    await ChatMessage.updateMany(
      { room: room._id, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return sendPaginated(res, messages.reverse(), page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const room = await ChatRoom.findOne({ _id: req.params.roomId, participants: req.user._id });
    if (!room) return sendError(res, 404, 'Chat room not found.');

    const { message, messageType } = req.body;
    const fileUrl = req.file ? req.file.path : undefined;

    const msg = await ChatMessage.create({
      room: room._id,
      sender: req.user._id,
      message,
      messageType: messageType || 'text',
      fileUrl,
    });

    room.lastMessage = message || 'Attachment';
    room.lastMessageAt = new Date();
    await room.save();

    const populated = await msg.populate('sender', 'name avatar role');

    const io = req.app.get('io');
    if (io) {
      room.participants.forEach((participantId) => {
        if (participantId.toString() !== req.user._id.toString()) {
          io.to(participantId.toString()).emit('new_message', populated);
        }
      });
    }

    return sendSuccess(res, 201, 'Message sent.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const msg = await ChatMessage.findOneAndUpdate(
      { _id: req.params.messageId, sender: req.user._id },
      { isDeleted: true, message: 'This message was deleted.' },
      { new: true }
    );
    if (!msg) return sendError(res, 404, 'Message not found.');
    return sendSuccess(res, 200, 'Message deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
