const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    type: { type: String, required: true },
    beforeImage: { type: String },
    afterImage: { type: String },
    image: { type: String },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublic: { type: Boolean, default: true },
    tags: [{ type: String }],
    likes: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Gallery', gallerySchema);
