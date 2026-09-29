const request = require('supertest');
const app = require('../server');

describe('Authentication & Role Authorization Endpoints', () => {
  const testUser = {
    name: 'Test Citizen User',
    email: `test_citizen_${Date.now()}@swms.com`,
    password: 'password123',
    role: 'citizen',
  };

  let token = '';

  it('POST /api/auth/register - Should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('POST /api/auth/register - Should fail on duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - Should login successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  it('POST /api/auth/login - Should fail with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me - Should fetch profile with valid JWT token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it('GET /api/admin/dashboard - Should block citizen from accessing admin dashboard (403)', async () => {
    const res = await request(app)
      .get('/api/analytics/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  it('GET /api/auth/users - Should block citizen from viewing all users (403)', async () => {
    const res = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(403);
  });

  it('GET /api/auth/users - Should allow admin to fetch and filter registered users', async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@swms.com', password: 'admin123' });
    const adminToken = adminLogin.body.token;

    const resAll = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAll.statusCode).toBe(200);
    expect(resAll.body.success).toBe(true);
    expect(Array.isArray(resAll.body.users)).toBe(true);
    expect(resAll.body.users.length).toBeGreaterThan(0);

    const resCollectors = await request(app)
      .get('/api/auth/users?role=collector')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resCollectors.statusCode).toBe(200);
    expect(resCollectors.body.users.every(u => u.role === 'collector')).toBe(true);
  });
});

