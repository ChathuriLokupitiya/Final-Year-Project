const request = require('supertest');
const app = require('../../src/app');
const Service = require('../../src/models/Service');
const { createUser, createAdmin, getToken, authHeader } = require('../helpers/auth.helper');
const { serviceData, createTestService, ensureCategory } = require('../helpers/fixtures');

describe('Service API', () => {

  // ─── GET /api/services ───────────────────────────────────────────────────
  describe('GET /api/services', () => {
    it('should return empty list when no services exist', async () => {
      const res = await request(app).get('/api/services');
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.totalItems).toBe(0);
    });

    it('should return paginated list of active services', async () => {
      await createTestService({ name: 'Haircut', isActive: true });
      await createTestService({ name: 'Coloring', categoryName: 'Coloring', isActive: true });
      await createTestService({ name: 'Inactive', isActive: false });

      const res = await request(app).get('/api/services');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by category', async () => {
      const haircut = await ensureCategory('Haircut');
      const coloring = await ensureCategory('Coloring');
      await createTestService({ name: 'Cut', category: haircut._id });
      await createTestService({ name: 'Color', category: coloring._id });

      const res = await request(app).get(`/api/services?category=${haircut._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.every((s) => String(s.category._id || s.category) === String(haircut._id))).toBe(true);
    });

    it('should support pagination (limit and page)', async () => {
      for (let i = 0; i < 5; i += 1) {
        await createTestService({ name: `Service ${i}` });
      }

      const res = await request(app).get('/api/services?page=1&limit=3');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(3);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('should filter by price range', async () => {
      await createTestService({ name: 'Cheap', price: 20 });
      await createTestService({ name: 'Mid', price: 50 });
      await createTestService({ name: 'Expensive', price: 150 });

      const res = await request(app).get('/api/services?minPrice=30&maxPrice=100');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.every((s) => s.price >= 30 && s.price <= 100)).toBe(true);
    });

    it('should be accessible without authentication (public)', async () => {
      const res = await request(app).get('/api/services');
      expect(res.statusCode).toBe(200);
    });
  });

  // ─── GET /api/services/:id ───────────────────────────────────────────────
  describe('GET /api/services/:id', () => {
    it('should return a single service by ID', async () => {
      const service = await createTestService();

      const res = await request(app).get(`/api/services/${service._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(service._id.toString());
      expect(res.body.data.name).toBe(service.name);
    });

    it('should return 404 for non-existent service', async () => {
      const fakeId = '64b1c2d3e4f56789abcd0001';
      const res = await request(app).get(`/api/services/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });

    it('should return 400 for invalid MongoDB ID format', async () => {
      const res = await request(app).get('/api/services/not-a-valid-id');
      expect(res.statusCode).toBe(400);
    });
  });

  // ─── GET /api/services/categories ───────────────────────────────────────
  describe('GET /api/services/categories', () => {
    it('should return distinct active service categories', async () => {
      await ensureCategory('Haircut');
      await ensureCategory('Coloring');

      const res = await request(app).get('/api/services/categories');
      expect(res.statusCode).toBe(200);
      const names = res.body.data.map((c) => c.name || c);
      expect(names).toContain('Haircut');
      expect(names).toContain('Coloring');
      expect(new Set(names).size).toBe(names.length);
    });
  });

  // ─── POST /api/services (Admin only) ─────────────────────────────────────
  describe('POST /api/services', () => {
    it('should create a service when admin is authenticated', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');
      const category = await ensureCategory();

      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send(serviceData({ name: 'New Service', category: category._id.toString() }));

      expect(res.statusCode).toBe(201);
      expect(res.body.data.name).toBe('New Service');
    });

    it('should fail for non-admin user (customer)', async () => {
      const user = await createUser();
      const token = getToken(user._id, 'customer');
      const category = await ensureCategory();

      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send(serviceData({ category: category._id.toString() }));

      expect(res.statusCode).toBe(403);
    });

    it('should fail without authentication', async () => {
      const category = await ensureCategory();
      const res = await request(app)
        .post('/api/services')
        .send(serviceData({ category: category._id.toString() }));
      expect(res.statusCode).toBe(401);
    });

    it('should fail with missing required fields', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send({ name: 'Incomplete' });

      expect(res.statusCode).toBe(422);
    });

    it('should fail with invalid category', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');

      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send(serviceData({ category: 'invalid-cat' }));

      expect(res.statusCode).toBe(422);
    });

    it('should fail with negative price', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');
      const category = await ensureCategory();

      const res = await request(app)
        .post('/api/services')
        .set(authHeader(token))
        .send(serviceData({ category: category._id.toString(), price: -10 }));

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── PUT /api/services/:id (Admin only) ──────────────────────────────────
  describe('PUT /api/services/:id', () => {
    it('should update a service when admin', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');
      const service = await createTestService();

      const res = await request(app)
        .put(`/api/services/${service._id}`)
        .set(authHeader(token))
        .send({ price: 75, name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.price).toBe(75);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('should return 403 for customer role', async () => {
      const user = await createUser();
      const token = getToken(user._id, 'customer');
      const service = await createTestService();

      const res = await request(app)
        .put(`/api/services/${service._id}`)
        .set(authHeader(token))
        .send({ price: 99 });

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── DELETE /api/services/:id (Admin only) ───────────────────────────────
  describe('DELETE /api/services/:id', () => {
    it('should soft-delete (deactivate) a service', async () => {
      const admin = await createAdmin();
      const token = getToken(admin._id, 'admin');
      const service = await createTestService();

      const res = await request(app)
        .delete(`/api/services/${service._id}`)
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);

      const updated = await Service.findById(service._id);
      expect(updated.isActive).toBe(false);
    });
  });

});
