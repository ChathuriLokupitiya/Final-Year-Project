const mongoose = require('mongoose');

const blockHistorySchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['blocked', 'unblocked'],
      required: true,
    },
    reason: {
      type: String,
      default: '',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlockHistory', blockHistorySchema);
