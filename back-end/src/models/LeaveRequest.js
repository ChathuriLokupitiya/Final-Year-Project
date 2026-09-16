const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
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
    adminComment: { type: String },
    isUnpaid: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
