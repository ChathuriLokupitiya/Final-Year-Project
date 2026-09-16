const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    type: { type: String, enum: ['support', 'consultation'], default: 'support' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    isActive: { type: Boolean, default: true },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

const chatMessageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String },
    messageType: { type: String, enum: ['text', 'image', 'file', 'system'], default: 'text' },
    fileUrl: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatMessageSchema.index({ room: 1, createdAt: -1 });

const ChatRoom = mongoose.model('ChatRoom', chatRoomSchema);
const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = { ChatRoom, ChatMessage };
