const mongoose = require('mongoose');

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['earned', 'redeemed', 'expired', 'bonus', 'referral'], required: true },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

loyaltyTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);
