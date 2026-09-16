const request = require('supertest');
const app = require('../../src/app');
const Appointment = require('../../src/models/Appointment');
const Service = require('../../src/models/Service');
const { createUser, createStaffUser, createAdmin, getToken, authHeader } = require('../helpers/auth.helper');
const { createTestService, appointmentData } = require('../helpers/fixtures');

describe('Appointment API', () => {
  let customer, customerToken, service, staffDoc;

  beforeEach(async () => {
    customer = await createUser({ email: 'appt_customer@test.com' });
    customerToken = getToken(customer._id, 'customer');
    service = await createTestService();
    const result = await createStaffUser({ email: 'appt_staff@test.com' });
    staffDoc = result.staff;
  });

  const futureDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  // ─── POST /api/appointments ───────────────────────────────────────────────
  describe('POST /api/appointments', () => {
    it('should book an appointment successfully', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(customerToken))
        .send({
          serviceId: service._id,
          staffId: staffDoc._id,
          appointmentDate: futureDate(),
          startTime: '10:00',
          type: 'appointment',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('bookingReference');
      expect(res.body.data.status).toBe('pending');
    });

    it('should calculate endTime automatically from service duration', async () => {
      const svc = await createTestService({ duration: 90 });
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(customerToken))
        .send({
          serviceId: svc._id,
          appointmentDate: futureDate(),
          startTime: '09:00',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.endTime).toBe('10:30');
    });

    it('should fail for appointment in the past', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(customerToken))
        .send({
          serviceId: service._id,
          appointmentDate: '2020-01-01',
          startTime: '10:00',
        });

      expect(res.statusCode).toBe(422);
    });

    it('should fail with missing serviceId', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(customerToken))
        .send({ appointmentDate: futureDate(), startTime: '10:00' });

      expect(res.statusCode).toBe(422);
    });

    it('should fail for inactive service', async () => {
      const inactiveSvc = await createTestService({ isActive: false });
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(customerToken))
        .send({
          serviceId: inactiveSvc._id,
          appointmentDate: futureDate(),
          startTime: '10:00',
        });

      expect(res.statusCode).toBe(404);
    });

    it('should prevent double-booking on same time slot for same staff', async () => {
      const date = futureDate();
      await request(app)
        .post('/api/appointments')
        .set(authHeader(customerToken))
        .send({ serviceId: service._id, staffId: staffDoc._id, appointmentDate: date, startTime: '10:00' });

      const customer2 = await createUser({ email: 'second@test.com' });
      const res = await request(app)
        .post('/api/appointments')
        .set(authHeader(getToken(customer2._id, 'customer')))
        .send({ serviceId: service._id, staffId: staffDoc._id, appointmentDate: date, startTime: '10:00' });

      expect(res.statusCode).toBe(409);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .send({ serviceId: service._id, appointmentDate: futureDate(), startTime: '10:00' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/appointments/my ─────────────────────────────────────────────
  describe('GET /api/appointments/my', () => {
    it('should return customer\'s own appointments', async () => {
      await Appointment.create(appointmentData(customer._id, service._id, staffDoc._id));

      const res = await request(app)
        .get('/api/appointments/my')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should not return other customers\' appointments', async () => {
      const other = await createUser({ email: 'other_appt@test.com' });
      await Appointment.create(appointmentData(other._id, service._id, staffDoc._id));

      const res = await request(app)
        .get('/api/appointments/my')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should filter by status', async () => {
      await Appointment.create(appointmentData(customer._id, service._id, null, { status: 'confirmed' }));
      await Appointment.create(appointmentData(customer._id, service._id, null, { status: 'cancelled' }));

      const res = await request(app)
        .get('/api/appointments/my?status=confirmed')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(a => a.status === 'confirmed')).toBe(true);
    });
  });

  // ─── GET /api/appointments/:id ────────────────────────────────────────────
  describe('GET /api/appointments/:id', () => {
    it('should return appointment details for the owner', async () => {
      const appt = await Appointment.create(appointmentData(customer._id, service._id, staffDoc._id));

      const res = await request(app)
        .get(`/api/appointments/${appt._id}`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.bookingReference).toBe(appt.bookingReference);
    });

    it('should return 403 if customer accesses another\'s appointment', async () => {
      const other = await createUser({ email: 'otherget@test.com' });
      const appt = await Appointment.create(appointmentData(other._id, service._id, null));

      const res = await request(app)
        .get(`/api/appointments/${appt._id}`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(403);
    });

    it('should return 404 for non-existent appointment', async () => {
      const fakeId = '64b1c2d3e4f56789abcd0001';
      const res = await request(app)
        .get(`/api/appointments/${fakeId}`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── PUT /api/appointments/:id/cancel ─────────────────────────────────────
  describe('PUT /api/appointments/:id/cancel', () => {
    it('should cancel a pending appointment', async () => {
      const appt = await Appointment.create(appointmentData(customer._id, service._id, null, { status: 'pending' }));

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/cancel`)
        .set(authHeader(customerToken))
        .send({ cancelReason: 'Changed my mind' });

      expect(res.statusCode).toBe(200);
      const updated = await Appointment.findById(appt._id);
      expect(updated.status).toBe('cancelled');
      expect(updated.cancelReason).toBe('Changed my mind');
    });

    it('should fail to cancel an already completed appointment', async () => {
      const appt = await Appointment.create(appointmentData(customer._id, service._id, null, { status: 'completed' }));

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/cancel`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(400);
    });

    it('should fail if customer tries to cancel someone else\'s appointment', async () => {
      const other = await createUser({ email: 'other_cancel@test.com' });
      const appt = await Appointment.create(appointmentData(other._id, service._id, null));

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/cancel`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(403);
    });
  });

  // ─── PUT /api/appointments/:id/reschedule ─────────────────────────────────
  describe('PUT /api/appointments/:id/reschedule', () => {
    it('should reschedule a confirmed appointment', async () => {
      const appt = await Appointment.create(
        appointmentData(customer._id, service._id, null, { status: 'confirmed' })
      );

      const newDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/reschedule`)
        .set(authHeader(customerToken))
        .send({ appointmentDate: newDate, startTime: '14:00' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('rescheduled');
      expect(res.body.data.startTime).toBe('14:00');
    });

    it('should fail to reschedule to a past date', async () => {
      const appt = await Appointment.create(
        appointmentData(customer._id, service._id, null, { status: 'confirmed' })
      );

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/reschedule`)
        .set(authHeader(customerToken))
        .send({ appointmentDate: '2020-01-01', startTime: '10:00' });

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── PUT /api/appointments/:id/status (Staff/Admin only) ──────────────────
  describe('PUT /api/appointments/:id/status', () => {
    it('should allow staff to update appointment status', async () => {
      const { user: staffUser } = await createStaffUser({ email: 'status_staff@test.com' });
      const staffToken = getToken(staffUser._id, 'staff');
      const appt = await Appointment.create(appointmentData(customer._id, service._id, staffDoc._id, { status: 'confirmed' }));

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/status`)
        .set(authHeader(staffToken))
        .send({ status: 'in_progress' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('in_progress');
    });

    it('should deny customer from updating status', async () => {
      const appt = await Appointment.create(appointmentData(customer._id, service._id, null));

      const res = await request(app)
        .put(`/api/appointments/${appt._id}/status`)
        .set(authHeader(customerToken))
        .send({ status: 'completed' });

      expect(res.statusCode).toBe(403);
    });
  });

});
