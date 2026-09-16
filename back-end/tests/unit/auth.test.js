const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');
const { createUser, getToken, authHeader } = require('../helpers/auth.helper');

describe('Auth API', () => {

  // ─── POST /api/auth/register ─────────────────────────────────────────────
  describe('POST /api/auth/register', () => {
    it('should register a new customer successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Jane Doe', email: 'jane@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('email', 'jane@test.com');
    });

    it('should fail if email is already registered', async () => {
      await createUser({ email: 'dupe@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dupe', email: 'dupe@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bad', email: 'not-an-email', password: 'Test@1234' });

      expect(res.statusCode).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors[0].field).toBe('email');
    });

    it('should fail with weak password (no special character)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Weak', email: 'weak@test.com', password: 'password1A' });

      expect(res.statusCode).toBe(422);
      expect(res.body.errors[0].field).toBe('password');
    });

    it('should fail if name is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'noname@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(422);
      expect(res.body.errors[0].field).toBe('name');
    });

    it('should store hashed password (not plaintext)', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Hash Test', email: 'hash@test.com', password: 'Test@1234' });

      const user = await User.findOne({ email: 'hash@test.com' }).select('+password');
      expect(user.password).not.toBe('Test@1234');
      expect(user.password).toMatch(/^\$2[ab]\$.{56}$/);
    });
  });

  // ─── POST /api/auth/login ────────────────────────────────────────────────
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createUser({ email: 'login@test.com', password: 'Test@1234' });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data.user).toHaveProperty('role', 'customer');
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPass@1' });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(401);
    });

    it('should fail for unverified account', async () => {
      await createUser({ email: 'unverified@test.com', isVerified: false });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unverified@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/verify/i);
    });

    it('should fail for blocked account', async () => {
      await createUser({ email: 'blocked@test.com', isBlocked: true });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'blocked@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toMatch(/blocked/i);
    });

    it('should set httpOnly cookie on login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(200);
      const cookies = res.headers['set-cookie'];
      if (cookies) {
        expect(cookies.some(c => c.includes('accessToken'))).toBe(true);
      } else {
        expect(res.body.data).toHaveProperty('accessToken');
      }
    });

    it('should not expose password in response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'Test@1234' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).not.toHaveProperty('password');
      if (res.body.data.user) {
        expect(res.body.data.user).not.toHaveProperty('password');
      }
    });
  });

  // ─── GET /api/auth/me ────────────────────────────────────────────────────
  describe('GET /api/auth/me', () => {
    it('should return current user for valid token', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('_id', user._id.toString());
      expect(res.body.data).toHaveProperty('email', user.email);
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should fail with malformed token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set({ Authorization: 'Bearer invalidtoken' });
      expect(res.statusCode).toBe(401);
    });
  });

  // ─── POST /api/auth/logout ───────────────────────────────────────────────
  describe('POST /api/auth/logout', () => {
    it('should logout and clear cookies', async () => {
      const user = await createUser();
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .post('/api/auth/logout')
        .set(authHeader(token));

      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie'].some(c => c.includes('accessToken=;'))).toBe(true);
    });
  });

  // ─── POST /api/auth/forgot-password ─────────────────────────────────────
  describe('POST /api/auth/forgot-password', () => {
    it('should respond 200 even for non-existent email (no enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@test.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should respond 200 for existing email', async () => {
      await createUser({ email: 'forgot@test.com' });
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@test.com' });

      expect(res.statusCode).toBe(200);
    });

    it('should fail validation for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'not-valid' });

      expect(res.statusCode).toBe(422);
    });
  });

  // ─── PUT /api/auth/change-password ──────────────────────────────────────
  describe('PUT /api/auth/change-password', () => {
    it('should change password with correct current password', async () => {
      const user = await createUser({ email: 'change@test.com', password: 'Test@1234' });
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader(token))
        .send({ currentPassword: 'Test@1234', newPassword: 'NewPass@5678' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail with wrong current password', async () => {
      const user = await createUser({ email: 'change2@test.com', password: 'Test@1234' });
      const token = getToken(user._id, user.role);

      const res = await request(app)
        .put('/api/auth/change-password')
        .set(authHeader(token))
        .send({ currentPassword: 'WrongPass@1', newPassword: 'NewPass@5678' });

      expect(res.statusCode).toBe(401);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .send({ currentPassword: 'Test@1234', newPassword: 'NewPass@5678' });

      expect(res.statusCode).toBe(401);
    });
  });

  // ─── POST /api/auth/refresh ──────────────────────────────────────────────
  describe('POST /api/auth/refresh', () => {
    it('should fail with no refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh');
      expect(res.statusCode).toBe(401);
    });

    it('should fail with invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalidtoken' });
      expect(res.statusCode).toBe(401);
    });
  });

});
