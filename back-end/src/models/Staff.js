const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    isConsultant: { type: Boolean, default: false },
    /** Fee charged for consultation bookings with this consultant */
    consultationPrice: { type: Number, min: 0, default: null },
    specializations: [{ type: String }],
    bio: { type: String, maxlength: 1000 },
    experience: { type: Number, default: 0 },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    maximumLeaves: { type: Number, default: 20 },
    leavesTaken: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0 },
    totalAppointments: { type: Number, default: 0 },
    completedAppointments: { type: Number, default: 0 },
    maxConsultationsPerDay: { type: Number, default: 4 },
    maxServiceAppointmentsPerDay: { type: Number, default: 10 },
    isActive: { type: Boolean, default: true },
    profileImages: [{ type: String }],
    socialLinks: {
      instagram: String,
      facebook: String,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

staffSchema.virtual('leaveRequests', {
  ref: 'LeaveRequest',
  localField: '_id',
  foreignField: 'staff'
});

staffSchema.virtual('assignmentHistory', {
  ref: 'AssignmentHistory',
  localField: '_id',
  foreignField: 'staff'
});

module.exports = mongoose.model('Staff', staffSchema);
