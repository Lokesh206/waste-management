const request = require('supertest');
const app = require('../server');

describe('Smart Bins Management Endpoints', () => {
  let adminToken = '';

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@swms.com', password: 'admin123' });
    adminToken = res.body.token;
  });

  it('GET /api/bins - Should return list of active bins', async () => {
    const res = await request(app).get('/api/bins');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.bins)).toBe(true);
    expect(res.body.bins.length).toBeGreaterThanOrEqual(10);
  });

  it('GET /api/bins/:id - Should return single bin with readings', async () => {
    const listRes = await request(app).get('/api/bins');
    const firstBin = listRes.body.bins[0];
    const res = await request(app).get(`/api/bins/${firstBin.id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.bin.bin_code).toBe(firstBin.bin_code);
  });

  it('POST /api/bins - Should allow admin to register a new bin', async () => {
    const newBin = {
      bin_code: `TEST-BIN-${Date.now()}`,
      location_name: 'Test Campus Green Zone',
      latitude: 12.9810,
      longitude: 77.5910,
      capacity: 100,
      waste_type: 'Plastic',
    };

    const res = await request(app)
      .post('/api/bins')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newBin);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.bin.bin_code).toBe(newBin.bin_code);
  });
});

