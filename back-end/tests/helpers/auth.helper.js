const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Staff = require('../../src/models/Staff');
const { customerData, staffUserData, adminData } = require('./fixtures');

const createUser = async (overrides = {}) => {
  const data = customerData(overrides);
  return User.create(data);
};

const createStaffUser = async (userOverrides = {}, staffOverrides = {}) => {
  const user = await User.create(staffUserData(userOverrides));
  const staff = await Staff.create({
    user: user._id,
    specializations: ['haircut', 'styling'],
    bio: 'Experienced stylist',
    experience: 5,
    isActive: true,
    ...staffOverrides,
  });
  return { user, staff };
};

const createAdmin = async (overrides = {}) => {
  return User.create(adminData(overrides));
};

const getToken = (userId, role = 'customer') => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_min_32_chars_long',
    { expiresIn: '1h' }
  );
};

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { createUser, createStaffUser, createAdmin, getToken, authHeader };
