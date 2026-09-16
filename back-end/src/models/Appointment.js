const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    bookingReference: { type: String, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    appointmentDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    type: { type: String, enum: ['appointment', 'consultation'], default: 'appointment' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled', 'no_show'],
      default: 'pending',
    },
    notes: { type: String },
    /** Optional name/phone when booking under the shared walk-in customer */
    guestName: { type: String, trim: true },
    guestPhone: { type: String, trim: true },
    consultationNotes: { type: String },
    beforeImage: { type: String },
    afterImage: { type: String },
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    loyaltyOfferApplied: { type: mongoose.Schema.Types.ObjectId, ref: 'LoyaltyOffer' },
    loyaltyPointsUsed: { type: Number, default: 0 },
    loyaltyPointsEarned: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'refunded', 'partial'], default: 'pending' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    reminderSent: { type: Boolean, default: false },
    cancelReason: { type: String },
    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    staffRecommendations: [{ type: String }],
  },
  { timestamps: true }
);

appointmentSchema.pre('save', async function (next) {
  if (!this.bookingReference) {
    const date = new Date();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.bookingReference = `SAL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${random}`;
  }
  next();
});

appointmentSchema.index({ customer: 1, appointmentDate: -1 });
appointmentSchema.index({ staff: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1, appointmentDate: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
