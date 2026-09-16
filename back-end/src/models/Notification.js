const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'booking_confirmation',
        'appointment_reminder',
        'cancellation',
        'rescheduled',
        'payment_success',
        'payment_failed',
        'promotional',
        'review_request',
        'staff_announcement',
        'system',
        'loyalty_points',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    channels: {
      email: { type: Boolean, default: false },
      push: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
