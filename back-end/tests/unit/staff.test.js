const request = require('supertest');
const app = require('../../src/app');
const Staff = require('../../src/models/Staff');
const Appointment = require('../../src/models/Appointment');
const Service = require('../../src/models/Service');
const { createUser, createStaffUser, getToken, authHeader } = require('../helpers/auth.helper');
const { createTestService, appointmentData } = require('../helpers/fixtures');

describe('Staff API', () => {

  // ─── GET /api/staff ───────────────────────────────────────────────────────
  describe('GET /api/staff', () => {
    it('should return all active staff members publicly', async () => {
      await createStaffUser({ email: 'st1@test.com' });
      await createStaffUser({ email: 'st2@test.com' });

      const res = await request(app).get('/api/staff');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should not return inactive staff', async () => {
      await createStaffUser({ email: 'inactive@test.com' }, { isActive: false });

      const res = await request(app).get('/api/staff');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should support pagination', async () => {
      await createStaffUser({ email: 'p1@test.com' });
      await createStaffUser({ email: 'p2@test.com' });
      await createStaffUser({ email: 'p3@test.com' });

      const res = await request(app).get('/api/staff?page=1&limit=2');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.meta.totalItems).toBe(3);
    });
  });

  // ─── GET /api/staff/:id ───────────────────────────────────────────────────
  describe('GET /api/staff/:id', () => {
    it('should return staff details by ID', async () => {
      const { staff } = await createStaffUser({ email: 'byid@test.com' });

      const res = await request(app).get(`/api/staff/${staff._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(staff._id.toString());
    });

    it('should return 404 for non-existent staff', async () => {
      const res = await request(app).get('/api/staff/64b1c2d3e4f56789abcd0001');
      expect(res.statusCode).toBe(404);
    });
  });

  // ─── GET /api/staff/me/profile ────────────────────────────────────────────
  describe('GET /api/staff/me/profile', () => {
    it('should return staff member\'s own profile', async () => {
      const { user, staff } = await createStaffUser({ email: 'me_profile@test.com' });
      const token = getToken(user._id, 'staff');

      const res = await request(app)
        .get('/api/staff/me/profile')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data._id).toBe(staff._id.toString());
    });

    it('should return 403 for customer role', async () => {
      const user = await createUser({ email: 'cust_profile@test.com' });
      const token = getToken(user._id, 'customer');

      const res = await request(app)
        .get('/api/staff/me/profile')
        .set(authHeader(token));

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── PUT /api/staff/me/profile ────────────────────────────────────────────
  describe('PUT /api/staff/me/profile', () => {
    it('should allow staff to update their bio and experience', async () => {
      const { user } = await createStaffUser({ email: 'bio@test.com' });
      const token = getToken(user._id, 'staff');

      const res = await request(app)
        .put('/api/staff/me/profile')
        .set(authHeader(token))
        .send({ bio: 'Updated bio text', experience: 8 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.bio).toBe('Updated bio text');
      expect(res.body.data.experience).toBe(8);
    });
  });

  // ─── GET /api/staff/me/schedule ──────────────────────────────────────────
  // Schedule endpoints were removed; staff availability is managed elsewhere.
  describe.skip('GET /api/staff/me/schedule', () => {
    it('should return staff schedule', async () => {
      const { user } = await createStaffUser({ email: 'sched@test.com' }, {
        schedule: [{ day: 'Monday', startTime: '09:00', endTime: '17:00', isAvailable: true }],
      });
      const token = getToken(user._id, 'staff');

      const res = await request(app)
        .get('/api/staff/me/schedule')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── PUT /api/staff/me/schedule ──────────────────────────────────────────
  describe.skip('PUT /api/staff/me/schedule', () => {
    it('should update staff schedule', async () => {
      const { user } = await createStaffUser({ email: 'schedup@test.com' });
      const token = getToken(user._id, 'staff');

      const newSchedule = [
        { day: 'Monday', startTime: '08:00', endTime: '16:00', isAvailable: true },
        { day: 'Wednesday', startTime: '10:00', endTime: '18:00', isAvailable: true },
      ];

      const res = await request(app)
        .put('/api/staff/me/schedule')
        .set(authHeader(token))
        .send({ schedule: newSchedule });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].day).toBe('Monday');
    });
  });

  // ─── GET /api/staff/me/appointments ──────────────────────────────────────
  describe('GET /api/staff/me/appointments', () => {
    it('should return only appointments assigned to this staff', async () => {
      const { user, staff } = await createStaffUser({ email: 'apts_staff@test.com' });
      const token = getToken(user._id, 'staff');
      const customer = await createUser({ email: 'apts_cust@test.com' });
      const service = await createTestService();

      await Appointment.create(appointmentData(customer._id, service._id, staff._id));

      const res = await request(app)
        .get('/api/staff/me/appointments')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  // ─── POST /api/staff/me/leave ─────────────────────────────────────────────
  describe('POST /api/staff/me/leave', () => {
    it('should submit a leave request', async () => {
      const { user } = await createStaffUser({ email: 'leave@test.com' });
      const token = getToken(user._id, 'staff');

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/staff/me/leave')
        .set(authHeader(token))
        .send({ startDate: tomorrow, endDate: tomorrow, reason: 'Personal matter' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.status).toBe('pending');
      expect(res.body.data.reason).toBe('Personal matter');
    });

    it('should fail for customer role', async () => {
      const user = await createUser({ email: 'cust_leave@test.com' });
      const token = getToken(user._id, 'customer');

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/staff/me/leave')
        .set(authHeader(token))
        .send({ startDate: tomorrow, endDate: tomorrow, reason: 'Test' });

      expect(res.statusCode).toBe(403);
    });
  });

});
