const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true
    },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0 },
    duration: { type: Number, required: true, min: 1 },
    images: [{ type: String }],
    isActive: { type: Boolean, default: true },
    isConsultation: { type: Boolean, default: false },
    availableStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalBookings: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

serviceSchema.index({ name: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
