const request = require('supertest');
const app = require('../../src/app');
const Notification = require('../../src/models/Notification');
const { createUser, createAdmin, getToken, authHeader } = require('../helpers/auth.helper');

const makeNotification = (userId, overrides = {}) => ({
  recipient: userId,
  type: 'booking_confirmation',
  title: 'Test Notification',
  message: 'This is a test message.',
  isRead: false,
  ...overrides,
});

describe('Notification API', () => {
  let user, userToken;

  beforeEach(async () => {
    user = await createUser({ email: 'notif_user@test.com' });
    userToken = getToken(user._id, 'customer');
  });

  // ─── GET /api/notifications ───────────────────────────────────────────────
  describe('GET /api/notifications', () => {
    it('should return user\'s notifications', async () => {
      await Notification.insertMany([
        makeNotification(user._id, { title: 'Notif 1' }),
        makeNotification(user._id, { title: 'Notif 2' }),
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it('should return unread count in meta', async () => {
      await Notification.insertMany([
        makeNotification(user._id, { isRead: false }),
        makeNotification(user._id, { isRead: false }),
        makeNotification(user._id, { isRead: true }),
      ]);

      const res = await request(app)
        .get('/api/notifications')
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.meta.unreadCount).toBe(2);
    });

    it('should not show another user\'s notifications', async () => {
      const other = await createUser({ email: 'other_notif@test.com' });
      await Notification.create(makeNotification(other._id));

      const res = await request(app)
        .get('/api/notifications')
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should filter unread only', async () => {
      await Notification.insertMany([
        makeNotification(user._id, { isRead: false }),
        makeNotification(user._id, { isRead: true }),
      ]);

      const res = await request(app)
        .get('/api/notifications?unreadOnly=true')
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(n => n.isRead === false)).toBe(true);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── PUT /api/notifications/:id/read ─────────────────────────────────────
  describe('PUT /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notif = await Notification.create(makeNotification(user._id, { isRead: false }));

      const res = await request(app)
        .put(`/api/notifications/${notif._id}/read`)
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);

      const updated = await Notification.findById(notif._id);
      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should require authentication', async () => {
      const notif = await Notification.create(makeNotification(user._id));
      const res = await request(app).put(`/api/notifications/${notif._id}/read`);
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── PUT /api/notifications/read-all ─────────────────────────────────────
  describe('PUT /api/notifications/read-all', () => {
    it('should mark all user notifications as read', async () => {
      await Notification.insertMany([
        makeNotification(user._id, { isRead: false }),
        makeNotification(user._id, { isRead: false }),
        makeNotification(user._id, { isRead: false }),
      ]);

      const res = await request(app)
        .put('/api/notifications/read-all')
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);

      const unread = await Notification.countDocuments({ recipient: user._id, isRead: false });
      expect(unread).toBe(0);
    });

    it('should only mark current user\'s notifications, not others\'', async () => {
      const other = await createUser({ email: 'other_readall@test.com' });
      await Notification.create(makeNotification(other._id, { isRead: false }));

      await request(app)
        .put('/api/notifications/read-all')
        .set(authHeader(userToken));

      const otherUnread = await Notification.countDocuments({ recipient: other._id, isRead: false });
      expect(otherUnread).toBe(1);
    });
  });

  // ─── DELETE /api/notifications/:id ───────────────────────────────────────
  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      const notif = await Notification.create(makeNotification(user._id));

      const res = await request(app)
        .delete(`/api/notifications/${notif._id}`)
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);

      const found = await Notification.findById(notif._id);
      expect(found).toBeNull();
    });

    it('should not delete another user\'s notification', async () => {
      const other = await createUser({ email: 'other_del_notif@test.com' });
      const notif = await Notification.create(makeNotification(other._id));

      const res = await request(app)
        .delete(`/api/notifications/${notif._id}`)
        .set(authHeader(userToken));

      expect(res.statusCode).toBe(200);

      const found = await Notification.findById(notif._id);
      expect(found).not.toBeNull();
    });
  });

  // ─── POST /api/admin/notifications/bulk (Admin only) ─────────────────────
  describe('POST /api/admin/notifications/bulk', () => {
    it('should send bulk notification to all customers', async () => {
      await createUser({ email: 'bulk1@test.com' });
      await createUser({ email: 'bulk2@test.com' });

      const admin = await createAdmin();
      const adminToken = getToken(admin._id, 'admin');

      const res = await request(app)
        .post('/api/admin/notifications/bulk')
        .set(authHeader(adminToken))
        .send({
          targetRole: 'customer',
          title: 'Special Offer!',
          message: 'Get 20% off this weekend!',
          type: 'promotional',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toMatch(/\d+ users/i);

      const notifications = await Notification.find({ type: 'promotional' });
      expect(notifications.length).toBeGreaterThanOrEqual(2);
    });

    it('should deny non-admin from sending bulk notifications', async () => {
      const res = await request(app)
        .post('/api/admin/notifications/bulk')
        .set(authHeader(userToken))
        .send({ title: 'Test', message: 'Test', type: 'promotional' });

      expect(res.statusCode).toBe(403);
    });
  });

});
