const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    serviceRating: { type: Number, min: 1, max: 5 },
    staffRating: { type: Number, min: 1, max: 5 },
    comment: { type: String, maxlength: 1000 },
    images: [{ type: String }],
    isPublic: { type: Boolean, default: true },
    isApproved: { type: Boolean, default: true },
    adminReply: { type: String },
    adminRepliedAt: { type: Date },
    helpfulCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

reviewSchema.index({ service: 1, isApproved: 1 });
reviewSchema.index({ staff: 1, isApproved: 1 });
reviewSchema.index({ customer: 1, appointment: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
