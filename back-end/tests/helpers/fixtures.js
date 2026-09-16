const Category = require('../../src/models/Category');
const Service = require('../../src/models/Service');

const customerData = (overrides = {}) => ({
  name: 'Test Customer',
  email: 'customer@test.com',
  password: 'Test@1234',
  role: 'customer',
  isVerified: true,
  ...overrides,
});

const staffUserData = (overrides = {}) => ({
  name: 'Test Stylist',
  email: 'staff@test.com',
  password: 'Test@1234',
  role: 'staff',
  isVerified: true,
  ...overrides,
});

const adminData = (overrides = {}) => ({
  name: 'Admin User',
  email: 'admin@test.com',
  password: 'Test@1234',
  role: 'admin',
  isVerified: true,
  ...overrides,
});

const ensureCategory = async (name = 'Haircut') => {
  let category = await Category.findOne({ name });
  if (!category) {
    category = await Category.create({
      name,
      description: `${name} category`,
      isActive: true,
    });
  }
  return category;
};

/** Plain service payload. Pass `category` as ObjectId (use createTestService for convenience). */
const serviceData = (overrides = {}) => ({
  name: 'Hair Cut',
  description: 'Professional hair cutting service',
  price: 50,
  duration: 60,
  isActive: true,
  ...overrides,
});

/** Create a service with a real Category ObjectId. */
const createTestService = async (overrides = {}) => {
  const { categoryName, category, ...rest } = overrides;
  let categoryId = category;
  if (!categoryId) {
    const cat = await ensureCategory(categoryName || 'Haircut');
    categoryId = cat._id;
  }
  return Service.create(serviceData({ ...rest, category: categoryId }));
};

const appointmentData = (customerId, serviceId, staffId, overrides = {}) => ({
  customer: customerId,
  service: serviceId,
  staff: staffId || null,
  appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
  startTime: '10:00',
  endTime: '11:00',
  totalAmount: 50,
  status: 'pending',
  type: 'appointment',
  ...overrides,
});

const couponData = (overrides = {}) => ({
  code: 'SAVE20',
  description: '20% off',
  discountType: 'percentage',
  discountValue: 20,
  minOrderAmount: 0,
  validFrom: new Date(Date.now() - 1000),
  validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  isActive: true,
  ...overrides,
});

const reviewData = (customerId, appointmentId, serviceId, staffId, overrides = {}) => ({
  customer: customerId,
  appointment: appointmentId,
  service: serviceId,
  staff: staffId,
  serviceRating: 4,
  staffRating: 5,
  comment: 'Great service!',
  isApproved: true,
  isPublic: true,
  ...overrides,
});

module.exports = {
  customerData,
  staffUserData,
  adminData,
  ensureCategory,
  serviceData,
  createTestService,
  appointmentData,
  couponData,
  reviewData,
};
