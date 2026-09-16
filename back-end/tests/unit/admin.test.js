const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const Staff = require('../../src/models/Staff');
const Service = require('../../src/models/Service');
const Appointment = require('../../src/models/Appointment');
const Payment = require('../../src/models/Payment');
const Review = require('../../src/models/Review');
const { createUser, createStaffUser, createAdmin, getToken, authHeader } = require('../helpers/auth.helper');
const { createTestService, appointmentData, reviewData } = require('../helpers/fixtures');

describe('Admin API', () => {
  let admin, adminToken;

  beforeEach(async () => {
    admin = await createAdmin();
    adminToken = getToken(admin._id, 'admin');
  });

  // ─── GET /api/admin/dashboard ─────────────────────────────────────────────
  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard overview for admin', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('customers');
      expect(res.body.data).toHaveProperty('appointments');
      expect(res.body.data).toHaveProperty('revenue');
      expect(res.body.data).toHaveProperty('staff');
    });

    it('should return correct customer count', async () => {
      await createUser({ email: 'c1@test.com' });
      await createUser({ email: 'c2@test.com' });

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set(authHeader(adminToken));

      expect(res.body.data.customers.total).toBeGreaterThanOrEqual(2);
    });

    it('should deny customer from accessing dashboard', async () => {
      const user = await createUser({ email: 'dash_cust@test.com' });
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set(authHeader(token));

      expect(res.statusCode).toBe(403);
    });

    it('should allow staff to access dashboard', async () => {
      const { user } = await createStaffUser({ email: 'dash_staff@test.com' });
      const token = getToken(user._id, 'staff');

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
    });
  });

  // ─── GET /api/admin/customers ─────────────────────────────────────────────
  describe('GET /api/admin/customers', () => {
    it('should return all customers', async () => {
      await createUser({ email: 'adm_c1@test.com' });
      await createUser({ email: 'adm_c2@test.com' });

      const res = await request(app)
        .get('/api/admin/customers')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.every(u => u.role === 'customer')).toBe(true);
    });

    it('should support search by name', async () => {
      await createUser({ email: 'searchme@test.com', name: 'Alice Wonderland' });

      const res = await request(app)
        .get('/api/admin/customers?search=Alice')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.some(u => u.name === 'Alice Wonderland')).toBe(true);
    });

    it('should support filtering by blocked status', async () => {
      await createUser({ email: 'blocked1@test.com', isBlocked: true });

      const res = await request(app)
        .get('/api/admin/customers?isBlocked=true')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(u => u.isBlocked === true)).toBe(true);
    });
  });

  // ─── PUT /api/admin/customers/:id/block ──────────────────────────────────
  describe('PUT /api/admin/customers/:id/block', () => {
    it('should block an active user', async () => {
      const user = await createUser({ email: 'toblk@test.com' });

      const res = await request(app)
        .put(`/api/admin/customers/${user._id}/block`)
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isBlocked).toBe(true);
    });

    it('should unblock a blocked user (toggle)', async () => {
      const user = await createUser({ email: 'tounblk@test.com', isBlocked: true });

      const res = await request(app)
        .put(`/api/admin/customers/${user._id}/block`)
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isBlocked).toBe(false);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/customers/64b1c2d3e4f56789abcd0001/block')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── POST /api/admin/staff ────────────────────────────────────────────────
  describe('POST /api/admin/staff', () => {
    it('should create a new staff member', async () => {
      const res = await request(app)
        .post('/api/admin/staff')
        .set(authHeader(adminToken))
        .send({
          name: 'New Stylist',
          email: 'newstylist@test.com',
          password: 'Test@1234',
          specializations: ['haircut', 'coloring'],
          experience: 3,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.user.role).toBe('staff');
      expect(res.body.data.staff.specializations).toContain('haircut');
    });

    it('should fail for duplicate email', async () => {
      await createUser({ email: 'dupstaff@test.com' });

      const res = await request(app)
        .post('/api/admin/staff')
        .set(authHeader(adminToken))
        .send({
          name: 'Dup Staff',
          email: 'dupstaff@test.com',
          password: 'Test@1234',
        });

      expect(res.statusCode).toBe(409);
    });

    it('should fail with validation errors', async () => {
      const res = await request(app)
        .post('/api/admin/staff')
        .set(authHeader(adminToken))
        .send({ email: 'incomplete@test.com' });

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── DELETE /api/admin/staff/:id ─────────────────────────────────────────
  describe('DELETE /api/admin/staff/:id', () => {
    it('should deactivate a staff member', async () => {
      const { staff } = await createStaffUser({ email: 'del_staff@test.com' });

      const res = await request(app)
        .delete(`/api/admin/staff/${staff._id}`)
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);

      const updated = await Staff.findById(staff._id);
      expect(updated.isActive).toBe(false);
    });
  });

  // ─── GET /api/admin/appointments ─────────────────────────────────────────
  describe('GET /api/admin/appointments', () => {
    it('should return all appointments', async () => {
      const customer = await createUser({ email: 'adm_appt_cust@test.com' });
      const service = await createTestService();
      await Appointment.create(appointmentData(customer._id, service._id, null));

      const res = await request(app)
        .get('/api/admin/appointments')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter appointments by status', async () => {
      const customer = await createUser({ email: 'adm_appt_flt@test.com' });
      const service = await createTestService({ name: 'Filter Test Svc' });
      await Appointment.create(appointmentData(customer._id, service._id, null, { status: 'confirmed' }));
      await Appointment.create(appointmentData(customer._id, service._id, null, { status: 'pending' }));

      const res = await request(app)
        .get('/api/admin/appointments?status=confirmed')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(a => a.status === 'confirmed')).toBe(true);
    });
  });

  // ─── PUT /api/admin/appointments/:id/assign ───────────────────────────────
  describe('PUT /api/admin/appointments/:id/assign', () => {
    it('should assign a staff member to an appointment', async () => {
      const customer = await createUser({ email: 'assign_cust@test.com' });
      const service = await createTestService({ name: 'Assign Svc' });
      const { staff } = await createStaffUser({ email: 'assign_staff@test.com' });
      const appt = await Appointment.create(appointmentData(customer._id, service._id, null));

      const res = await request(app)
        .put(`/api/admin/appointments/${appt._id}/assign`)
        .set(authHeader(adminToken))
        .send({ staffId: staff._id });

      expect(res.statusCode).toBe(200);
    });
  });

  // ─── GET /api/admin/analytics/revenue ────────────────────────────────────
  describe('GET /api/admin/analytics/revenue', () => {
    it('should return revenue analytics', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/revenue')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support period=daily query', async () => {
      const res = await request(app)
        .get('/api/admin/analytics/revenue?period=daily')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
    });
  });

  // ─── PUT /api/admin/users/:id/role ───────────────────────────────────────
  describe('PUT /api/admin/users/:id/role', () => {
    it('should change user role to staff', async () => {
      const user = await createUser({ email: 'rolechange@test.com' });

      const res = await request(app)
        .put(`/api/admin/users/${user._id}/role`)
        .set(authHeader(adminToken))
        .send({ role: 'staff' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.role).toBe('staff');
    });

    it('should fail with invalid role value', async () => {
      const user = await createUser({ email: 'badrole@test.com' });

      const res = await request(app)
        .put(`/api/admin/users/${user._id}/role`)
        .set(authHeader(adminToken))
        .send({ role: 'superuser' });

      expect(res.statusCode).toBe(400);
    });

    it('should not allow admin to change own role', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${admin._id}/role`)
        .set(authHeader(adminToken))
        .send({ role: 'customer' });

      expect(res.statusCode).toBe(400);
    });
  });

  // ─── PUT /api/admin/reviews/:id/moderate ─────────────────────────────────
  describe('PUT /api/admin/reviews/:id/moderate', () => {
    it('should hide a review', async () => {
      const customer = await createUser({ email: 'mod_cust@test.com' });
      const service = await createTestService({ name: 'Mod Svc' });
      const { staff } = await createStaffUser({ email: 'mod_staff@test.com' });
      const appt = await Appointment.create(appointmentData(customer._id, service._id, staff._id, { status: 'completed' }));
      const review = await Review.create(reviewData(customer._id, appt._id, service._id, staff._id));

      const res = await request(app)
        .put(`/api/admin/reviews/${review._id}/moderate`)
        .set(authHeader(adminToken))
        .send({ isApproved: false });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.isApproved).toBe(false);
    });
  });

  // ─── GET /api/admin/audit-logs ────────────────────────────────────────────
  describe('GET /api/admin/audit-logs', () => {
    it('should return audit logs for admin', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should deny non-admin access', async () => {
      const user = await createUser({ email: 'audit_cust@test.com' });
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set(authHeader(token));

      expect(res.statusCode).toBe(403);
    });
  });

});
