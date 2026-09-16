const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ChatRoom, ChatMessage } = require('../models/ChatMessage');
const logger = require('../utils/logger.util');

const initSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required.'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('name role avatar isBlocked');

      if (!user || user.isBlocked) return next(new Error('Unauthorized.'));

      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.user.name} (${socket.user._id})`);

    socket.join(socket.user._id.toString());

    socket.on('join_room', async (roomId) => {
      const room = await ChatRoom.findOne({ _id: roomId, participants: socket.user._id });
      if (room) {
        socket.join(roomId);
        socket.emit('room_joined', { roomId });
      }
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
    });

    socket.on('send_message', async ({ roomId, message, messageType }) => {
      try {
        const room = await ChatRoom.findOne({ _id: roomId, participants: socket.user._id });
        if (!room) return;

        const msg = await ChatMessage.create({
          room: roomId,
          sender: socket.user._id,
          message,
          messageType: messageType || 'text',
        });

        room.lastMessage = message;
        room.lastMessageAt = new Date();
        await room.save();

        const populated = await msg.populate('sender', 'name avatar role');

        io.to(roomId).emit('message_received', populated);

        room.participants.forEach((pid) => {
          if (pid.toString() !== socket.user._id.toString()) {
            io.to(pid.toString()).emit('new_message_notification', {
              roomId,
              message: message.substring(0, 50),
              senderName: socket.user.name,
            });
          }
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message.' });
      }
    });

    socket.on('typing_start', ({ roomId }) => {
      socket.to(roomId).emit('user_typing', { userId: socket.user._id, name: socket.user.name });
    });

    socket.on('typing_stop', ({ roomId }) => {
      socket.to(roomId).emit('user_stopped_typing', { userId: socket.user._id });
    });

    socket.on('mark_read', async ({ roomId }) => {
      await ChatMessage.updateMany(
        { room: roomId, sender: { $ne: socket.user._id }, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      socket.to(roomId).emit('messages_read', { userId: socket.user._id });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.user.name}`);
    });
  });
};

module.exports = initSocket;
