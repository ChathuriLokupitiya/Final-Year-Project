const mongoose = require('mongoose');

const loyaltyOfferSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    pointsCost: { type: Number, required: true, min: 1 },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    maxDiscountAmount: { type: Number },
    applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        count: { type: Number, default: 1 },
        usedAt: { type: Date, default: Date.now },
      },
    ],
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

loyaltyOfferSchema.methods.isCurrentlyValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (!this.usageLimit || this.usedCount < this.usageLimit)
  );
};

loyaltyOfferSchema.index({ isActive: 1, validUntil: 1 });

module.exports = mongoose.model('LoyaltyOffer', loyaltyOfferSchema);
