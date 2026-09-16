const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    code: {
      type: String,
      uppercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    promoType: {
      type: String,
      enum: ['catalog', 'coupon'],
      default: 'catalog',
    },
    targetType: {
      type: String,
      // catalog: which catalog items get discountPrice
      // coupon: optional service restriction for redeem
      enum: ['selected', 'all_services', 'all_consultations', 'all'],
      default: 'selected',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    sentToUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: null,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Promotion', promotionSchema);
