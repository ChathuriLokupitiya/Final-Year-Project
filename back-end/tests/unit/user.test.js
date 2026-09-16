const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Service = require('../../src/models/Service');
const Staff = require('../../src/models/Staff');
const Wishlist = require('../../src/models/Wishlist');
const { createUser, createStaffUser, getToken, authHeader } = require('../helpers/auth.helper');
const { createTestService } = require('../helpers/fixtures');

describe('User API', () => {

  // ─── GET /api/users/profile ───────────────────────────────────────────────
  describe('GET /api/users/profile', () => {
    it('should return user profile when authenticated', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .get('/api/users/profile')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('email', user.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/users/profile');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── PUT /api/users/profile ───────────────────────────────────────────────
  describe('PUT /api/users/profile', () => {
    it('should update name and phone successfully', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .put('/api/users/profile')
        .set(authHeader(token))
        .send({ name: 'Updated Name', phone: '+94771234567' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.phone).toBe('+94771234567');
    });

    it('should update gender and address fields', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .put('/api/users/profile')
        .set(authHeader(token))
        .send({
          gender: 'female',
          address: { city: 'New York', country: 'USA' },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.gender).toBe('female');
      expect(res.body.data.address.city).toBe('New York');
    });

    it('should reject invalid gender value', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .put('/api/users/profile')
        .set(authHeader(token))
        .send({ gender: 'alien' });

      expect(res.statusCode).toBe(422);
    });

    it('should not allow updating role via profile endpoint', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      await request(app)
        .put('/api/users/profile')
        .set(authHeader(token))
        .send({ role: 'admin' });

      const updated = await User.findById(user._id);
      expect(updated.role).toBe('customer');
    });
  });

  // ─── GET /api/users/booking-history ──────────────────────────────────────
  describe('GET /api/users/booking-history', () => {
    it('should return empty array for new user', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .get('/api/users/booking-history')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.totalItems).toBe(0);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/users/booking-history');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/users/loyalty-points ───────────────────────────────────────
  describe('GET /api/users/loyalty-points', () => {
    it('should return loyalty balance and empty transactions for new user', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .get('/api/users/loyalty-points')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data.totalEarned).toBe(0);
      expect(res.body.data.totalRedeemed).toBe(0);
      expect(res.body.data.transactions).toEqual([]);
    });
  });

  // ─── GET /api/users/wishlist ──────────────────────────────────────────────
  describe('GET /api/users/wishlist', () => {
    it('should return empty wishlist for new user', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .get('/api/users/wishlist')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.services).toEqual([]);
      expect(res.body.data.consulton).toEqual([]);
    });
  });

  // ─── POST /api/users/wishlist/services/:serviceId ─────────────────────────
  describe('POST /api/users/wishlist/services/:serviceId', () => {
    it('should add a service to wishlist', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);
      const service = await createTestService();

      const res = await request(app)
        .post(`/api/users/wishlist/services/${service._id}`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/added/i);

      const wishlist = await Wishlist.findOne({ user: user._id });
      expect(wishlist.services.map(String)).toContain(service._id.toString());
    });

    it('should remove service from wishlist on second toggle', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);
      const service = await createTestService();

      await request(app)
        .post(`/api/users/wishlist/services/${service._id}`)
        .set(authHeader(token));

      const res = await request(app)
        .post(`/api/users/wishlist/services/${service._id}`)
        .set(authHeader(token));

      expect(res.body.message).toMatch(/removed/i);
    });
  });

  // ─── POST /api/users/wishlist/consulton/:consultonId ──────────────────────
  describe('POST /api/users/wishlist/consulton/:consultonId', () => {
    it('should add a staff member to favorites', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);
      const { staff } = await createStaffUser({ email: 'wl_staff@test.com' });

      const res = await request(app)
        .post(`/api/users/wishlist/consulton/${staff._id}`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/added/i);
    });
  });

});
