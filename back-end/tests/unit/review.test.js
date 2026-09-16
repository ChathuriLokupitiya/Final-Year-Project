const request = require('supertest');
const app = require('../../src/app');
const Review = require('../../src/models/Review');
const Service = require('../../src/models/Service');
const Appointment = require('../../src/models/Appointment');
const { createUser, createStaffUser, createAdmin, getToken, authHeader } = require('../helpers/auth.helper');
const { createTestService, appointmentData, reviewData } = require('../helpers/fixtures');

describe('Review API', () => {
  let customer, customerToken, service, staffDoc, completedAppt;

  beforeEach(async () => {
    customer = await createUser({ email: 'rev_cust@test.com' });
    customerToken = getToken(customer._id, 'customer');
    service = await createTestService();
    const { staff } = await createStaffUser({ email: 'rev_staff@test.com' });
    staffDoc = staff;
    completedAppt = await Appointment.create(
      appointmentData(customer._id, service._id, staffDoc._id, { status: 'completed' })
    );
  });

  // ─── POST /api/reviews ───────────────────────────────────────────────────
  describe('POST /api/reviews', () => {
    it('should create a review for a completed appointment', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set(authHeader(customerToken))
        .send({
          appointmentId: completedAppt._id,
          serviceRating: 5,
          staffRating: 4,
          comment: 'Excellent service!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.serviceRating).toBe(5);
      expect(res.body.data.staffRating).toBe(4);
      expect(res.body.data.comment).toBe('Excellent service!');
    });

    it('should fail if appointment is not completed', async () => {
      const pendingAppt = await Appointment.create(
        appointmentData(customer._id, service._id, staffDoc._id, { status: 'pending' })
      );

      const res = await request(app)
        .post('/api/reviews')
        .set(authHeader(customerToken))
        .send({ appointmentId: pendingAppt._id, serviceRating: 4 });

      expect(res.statusCode).toBe(404);
    });

    it('should not allow duplicate review for same appointment', async () => {
      await Review.create(reviewData(customer._id, completedAppt._id, service._id, staffDoc._id));

      const res = await request(app)
        .post('/api/reviews')
        .set(authHeader(customerToken))
        .send({ appointmentId: completedAppt._id, serviceRating: 3 });

      expect(res.statusCode).toBe(409);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({ appointmentId: completedAppt._id, serviceRating: 5 });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── GET /api/services/:serviceId/reviews ─────────────────────────────────
  describe('GET /api/services/:serviceId/reviews', () => {
    it('should return public approved reviews for a service', async () => {
      await Review.create(reviewData(customer._id, completedAppt._id, service._id, staffDoc._id));

      const res = await request(app).get(`/api/services/${service._id}/reviews`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should not return unapproved reviews publicly', async () => {
      await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id, { isApproved: false })
      );

      const res = await request(app).get(`/api/services/${service._id}/reviews`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ─── GET /api/staff/:staffId/reviews ─────────────────────────────────────
  describe('GET /api/staff/:staffId/reviews', () => {
    it('should return approved reviews for a staff member', async () => {
      await Review.create(reviewData(customer._id, completedAppt._id, service._id, staffDoc._id));

      const res = await request(app).get(`/api/staff/${staffDoc._id}/reviews`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
    });
  });

  // ─── GET /api/reviews/my ─────────────────────────────────────────────────
  describe('GET /api/reviews/my', () => {
    it('should return reviews written by the authenticated user', async () => {
      await Review.create(reviewData(customer._id, completedAppt._id, service._id, staffDoc._id));

      const res = await request(app)
        .get('/api/reviews/my')
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should return empty for user with no reviews', async () => {
      const newUser = await createUser({ email: 'noreview@test.com' });
      const token = getToken(newUser._id, 'customer');

      const res = await request(app)
        .get('/api/reviews/my')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  // ─── PUT /api/reviews/:id ────────────────────────────────────────────────
  describe('PUT /api/reviews/:id', () => {
    it('should allow owner to update their review', async () => {
      const review = await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id)
      );

      const res = await request(app)
        .put(`/api/reviews/${review._id}`)
        .set(authHeader(customerToken))
        .send({ comment: 'Actually even better!', serviceRating: 5 });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.comment).toBe('Actually even better!');
      expect(res.body.data.serviceRating).toBe(5);
    });

    it('should fail if another user tries to edit review', async () => {
      const review = await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id)
      );
      const other = await createUser({ email: 'other_rev@test.com' });
      const otherToken = getToken(other._id, 'customer');

      const res = await request(app)
        .put(`/api/reviews/${review._id}`)
        .set(authHeader(otherToken))
        .send({ comment: 'Hijacked!' });

      expect(res.statusCode).toBe(404);
    });
  });

  // ─── DELETE /api/reviews/:id ─────────────────────────────────────────────
  describe('DELETE /api/reviews/:id', () => {
    it('should allow owner to delete their review', async () => {
      const review = await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id)
      );

      const res = await request(app)
        .delete(`/api/reviews/${review._id}`)
        .set(authHeader(customerToken));

      expect(res.statusCode).toBe(200);
      const found = await Review.findById(review._id);
      expect(found).toBeNull();
    });

    it('should allow admin to delete any review', async () => {
      const review = await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id)
      );
      const admin = await createAdmin();
      const adminToken = getToken(admin._id, 'admin');

      const res = await request(app)
        .delete(`/api/reviews/${review._id}`)
        .set(authHeader(adminToken));

      expect(res.statusCode).toBe(200);
    });
  });

  // ─── POST /api/reviews/:id/reply (Admin only) ─────────────────────────────
  describe('POST /api/reviews/:id/reply', () => {
    it('should allow admin to reply to a review', async () => {
      const review = await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id)
      );
      const admin = await createAdmin();
      const adminToken = getToken(admin._id, 'admin');

      const res = await request(app)
        .post(`/api/reviews/${review._id}/reply`)
        .set(authHeader(adminToken))
        .send({ reply: 'Thank you for your feedback!' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.adminReply).toBe('Thank you for your feedback!');
    });

    it('should deny customer from replying', async () => {
      const review = await Review.create(
        reviewData(customer._id, completedAppt._id, service._id, staffDoc._id)
      );

      const res = await request(app)
        .post(`/api/reviews/${review._id}/reply`)
        .set(authHeader(customerToken))
        .send({ reply: 'Unauthorized reply' });

      expect(res.statusCode).toBe(403);
    });
  });

});
