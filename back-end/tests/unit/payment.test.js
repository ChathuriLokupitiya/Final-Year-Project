const request = require('supertest');
const app = require('../../src/app');
const Payment = require('../../src/models/Payment');
const Appointment = require('../../src/models/Appointment');
const Service = require('../../src/models/Service');
const { createUser, createStaffUser, getToken, authHeader } = require('../helpers/auth.helper');
const { createTestService, appointmentData } = require('../helpers/fixtures');

describe('Payment API', () => {
  let customer, customerToken, service, appt;

  beforeEach(async () => {
    customer = await createUser({ email: 'pay_cust@test.com' });
    customerToken = getToken(customer._id, 'customer');
    service = await createTestService({ price: 80 });
    const { staff } = await createStaffUser({ email: 'pay_staff@test.com' });
    appt = await Appointment.create(
      appointmentData(customer._id, service._id, staff._id, {
        status: 'pending',
        totalAmount: 80,
        paymentStatus: 'pending',
      })
    );
  });

  // ─── GET /api/payments/my ─────────────────────────────────────────────────
  describe('GET /api/payments/my', () => {
    it('should return empty list when customer has no payments', async () => {
      const res = await request(app)
        .get('/api/payments/my')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.totalItems).toBe(0);
    });

    it('should return customer\'s payments', async () => {
      await Payment.create({
        appointment: appt._id,
        customer: customer._id,
        amount: 80,
        method: 'cash',
        status: 'completed',
      });

      const res = await request(app)
        .get('/api/payments/my')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should not return other customers\' payments', async () => {
      const other = await createUser({ email: 'other_pay@test.com' });
      const svc = await createTestService({ name: 'Other Service' });
      const { staff: s2 } = await createStaffUser({ email: 'pay2_staff@test.com' });
      const otherAppt = await Appointment.create(appointmentData(other._id, svc._id, s2._id));

      await Payment.create({
        appointment: otherAppt._id,
        customer: other._id,
        amount: 50,
        method: 'cash',
        status: 'completed',
      });

      const res = await request(app)
        .get('/api/payments/my')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/payments/my');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── POST /api/payments/confirm (cash payment) ───────────────────────────
  describe('POST /api/payments/confirm', () => {
    it('should confirm a cash payment and mark appointment as paid', async () => {
      const res = await request(app)
        .post('/api/payments/confirm')
        .set(authHeader(customerToken))
        .send({ appointmentId: appt._id, method: 'cash' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.method).toBe('cash');

      const updatedAppt = await Appointment.findById(appt._id);
      expect(updatedAppt.paymentStatus).toBe('paid');
      expect(updatedAppt.status).toBe('confirmed');
    });

    it('should fail for non-existent appointment', async () => {
      const res = await request(app)
        .post('/api/payments/confirm')
        .set(authHeader(customerToken))
        .send({ appointmentId: '64b1c2d3e4f56789abcd0001', method: 'cash' });

      expect(res.statusCode).toBe(404);
    });

    it('should fail for appointment that is already paid', async () => {
      await Appointment.findByIdAndUpdate(appt._id, { paymentStatus: 'paid' });

      const res = await request(app)
        .post('/api/payments/confirm')
        .set(authHeader(customerToken))
        .send({ appointmentId: appt._id, method: 'cash' });

      expect(res.statusCode).toBe(400);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/payments/confirm')
        .send({ appointmentId: appt._id, method: 'cash' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/payments/:id/invoice ───────────────────────────────────────
  describe('GET /api/payments/:id/invoice', () => {
    it('should return PDF invoice for payment owner', async () => {
      const payment = await Payment.create({
        appointment: appt._id,
        customer: customer._id,
        amount: 80,
        method: 'cash',
        status: 'completed',
      });

      const res = await request(app)
        .get(`/api/payments/${payment._id}/invoice`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/pdf/);
    });

    it('should return 404 for payment not belonging to user', async () => {
      const other = await createUser({ email: 'inv_other@test.com' });
      const svc = await createTestService({ name: 'Other Svc' });
      const { staff: s3 } = await createStaffUser({ email: 'inv_staff@test.com' });
      const otherAppt = await Appointment.create(appointmentData(other._id, svc._id, s3._id));
      const payment = await Payment.create({
        appointment: otherAppt._id,
        customer: other._id,
        amount: 50,
        method: 'cash',
        status: 'completed',
      });

      const res = await request(app)
        .get(`/api/payments/${payment._id}/invoice`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(404);
    });
  });

});
