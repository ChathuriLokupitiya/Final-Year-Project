const request = require('supertest');
const app = require('../../src/app');
const Coupon = require('../../src/models/Coupon');
const { createUser, createAdmin, getToken, authHeader } = require('../helpers/auth.helper');
const { couponData } = require('../helpers/fixtures');

describe('Coupon API', () => {

  // ─── POST /api/coupons/validate ───────────────────────────────────────────
  describe('POST /api/coupons/validate', () => {
    it('should validate a valid percentage coupon', async () => {
      await Coupon.create(couponData({ code: 'PCTOFF', discountType: 'percentage', discountValue: 20 }));
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'PCTOFF', amount: 100 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.discountAmount).toBe(20);
      expect(res.body.data.finalAmount).toBe(80);
    });

    it('should validate a fixed discount coupon', async () => {
      await Coupon.create(couponData({ code: 'FIXED15', discountType: 'fixed', discountValue: 15 }));
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'FIXED15', amount: 100 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.discountAmount).toBe(15);
      expect(res.body.data.finalAmount).toBe(85);
    });

    it('should return 404 for non-existent coupon code', async () => {
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'INVALID999', amount: 50 });

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for expired coupon', async () => {
      await Coupon.create(couponData({
        code: 'EXPIRED',
        validUntil: new Date(Date.now() - 1000),
      }));
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'EXPIRED', amount: 50 });

      expect(res.statusCode).toBe(404);
    });

    it('should return 404 for inactive coupon', async () => {
      await Coupon.create(couponData({ code: 'INACTIVE', isActive: false }));
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'INACTIVE', amount: 50 });

      expect(res.statusCode).toBe(404);
    });

    it('should return 400 if amount is below minimum order amount', async () => {
      await Coupon.create(couponData({ code: 'MINORDER', minOrderAmount: 100 }));
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'MINORDER', amount: 50 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/minimum/i);
    });

    it('should cap discount at maxDiscountAmount', async () => {
      await Coupon.create(couponData({
        code: 'CAPPED',
        discountType: 'percentage',
        discountValue: 50,
        maxDiscountAmount: 20,
      }));
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons/validate')
        .set(authHeader(token))
        .send({ code: 'CAPPED', amount: 200 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.discountAmount).toBe(20);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'TEST', amount: 100 });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── POST /api/coupons (Admin only) ──────────────────────────────────────
  describe('POST /api/coupons', () => {
    it('should allow admin to create a coupon', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .post('/api/coupons')
        .set(authHeader(token))
        .send(couponData({ code: 'NEWCOUPON' }));

      expect(res.statusCode).toBe(201);
      expect(res.body.data.code).toBe('NEWCOUPON');
    });

    it('should prevent duplicate coupon codes', async () => {
      await Coupon.create(couponData({ code: 'DUPLICATE' }));
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .post('/api/coupons')
        .set(authHeader(token))
        .send(couponData({ code: 'DUPLICATE' }));

      expect(res.statusCode).toBe(409);
    });

    it('should deny customer from creating coupons', async () => {
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .post('/api/coupons')
        .set(authHeader(token))
        .send(couponData({ code: 'UNAUTHORIZED' }));

      expect(res.statusCode).toBe(403);
    });

    it('should validate validUntil is after validFrom', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .post('/api/coupons')
        .set(authHeader(token))
        .send({
          ...couponData(),
          validFrom: new Date('2026-12-31').toISOString(),
          validUntil: new Date('2026-01-01').toISOString(),
        });

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── GET /api/coupons (Admin only) ───────────────────────────────────────
  describe('GET /api/coupons', () => {
    it('should return all coupons for admin', async () => {
      await Coupon.insertMany([
        couponData({ code: 'A1' }),
        couponData({ code: 'B2' }),
      ]);
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .get('/api/coupons')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should deny customer from listing coupons', async () => {
      const user = await createUser();
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .get('/api/coupons')
        .set(authHeader(token));

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── PUT /api/coupons/:id ─────────────────────────────────────────────────
  describe('PUT /api/coupons/:id', () => {
    it('should update a coupon', async () => {
      const coupon = await Coupon.create(couponData({ code: 'UPDATEME' }));
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .put(`/api/coupons/${coupon._id}`)
        .set(authHeader(token))
        .send({ discountValue: 30, isActive: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.discountValue).toBe(30);
      expect(res.body.data.isActive).toBe(false);
    });
  });

  // ─── DELETE /api/coupons/:id ─────────────────────────────────────────────
  describe('DELETE /api/coupons/:id', () => {
    it('should delete a coupon', async () => {
      const coupon = await Coupon.create(couponData({ code: 'DELETEME' }));
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .delete(`/api/coupons/${coupon._id}`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      const found = await Coupon.findById(coupon._id);
      expect(found).toBeNull();
    });
  });

});
