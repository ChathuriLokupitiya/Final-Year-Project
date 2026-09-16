const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'lkr' },
    method: { type: String, enum: ['stripe', 'cash', 'bank_transfer', 'loyalty_points'], required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'], default: 'pending' },
    stripePaymentIntentId: { type: String },
    stripeChargeId: { type: String },
    transactionId: { type: String, unique: true, sparse: true },
    invoiceNumber: { type: String, unique: true, sparse: true },
    refundAmount: { type: Number, default: 0 },
    refundReason: { type: String },
    refundedAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

paymentSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const date = new Date();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.invoiceNumber = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${random}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
