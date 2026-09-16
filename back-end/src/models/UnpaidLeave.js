const mongoose = require('mongoose');

const unpaidLeaveSchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isUnpaid: { type: Boolean, default: true },
    adminComment: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UnpaidLeave', unpaidLeaveSchema);
