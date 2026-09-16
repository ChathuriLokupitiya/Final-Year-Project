const User = require('../models/User');

const WALKIN_EMAIL = 'walkin@aura.local';

/**
 * Ensures a single default walk-in customer exists (no password, emails disabled).
 */
const ensureWalkInCustomer = async () => {
  let user = await User.findOne({ email: WALKIN_EMAIL });
  if (user) {
    let dirty = false;
    if (!user.isWalkIn) {
      user.isWalkIn = true;
      dirty = true;
    }
    if (user.notificationPreferences?.email !== false) {
      user.notificationPreferences = { email: false, push: false };
      dirty = true;
    }
    if (!user.isVerified) {
      user.isVerified = true;
      dirty = true;
    }
    if (dirty) await user.save();
    return user;
  }

  user = await User.create({
    name: 'Walk-in Customer',
    email: WALKIN_EMAIL,
    role: 'customer',
    isWalkIn: true,
    isVerified: true,
    notificationPreferences: { email: false, push: false },
  });
  return user;
};

module.exports = { ensureWalkInCustomer, WALKIN_EMAIL };
