const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
    avatar: { type: String, default: '' },
    /** Salon desk / walk-in placeholder account (no login, no emails) */
    isWalkIn: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    blockReason: { type: String, default: '' },
    unblockReason: { type: String, default: '' },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, sparse: true },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
    passwordResetOTP: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', ''] },
    loyaltyPoints: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastLogin: { type: Date },
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    /** User accepted Terms of Service & Privacy Policy at signup */
    agreements: {
      termsAccepted: { type: Boolean, default: false },
      privacyAccepted: { type: Boolean, default: false },
      acceptedAt: { type: Date },
      termsVersion: { type: String, default: '' },
      privacyVersion: { type: String, default: '' },
    },
    permissions: {
      tabs: { 
        type: [String], 
        default: ['Dashboard', 'Appointments', 'Customers', 'Staff', 'Services', 'Gallery', 'Promotions', 'Finances', 'Reports', 'Settings'] 
      },
      actions: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
      }
    }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.emailVerificationToken;
  delete obj.passwordResetOTP;
  delete obj.passwordResetToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
