const request = require('supertest');
const app = require('../server');

describe('Collection Lifecycle & Recording Endpoints', () => {
  let adminToken = '';
  let collectorToken = '';
  let collectorId = 0;
  let requestId = 0;
  let targetBinId = 0;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@swms.com', password: 'admin123' });
    adminToken = adminLogin.body.token;

    const collectorLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'collector@swms.com', password: 'collector123' });
    collectorToken = collectorLogin.body.token;
    collectorId = collectorLogin.body.user.id;

    const binsRes = await request(app).get('/api/bins');
    targetBinId = binsRes.body.bins[0].id;
  });

  it('POST /api/collections - Should create a manual collection request', async () => {
    const res = await request(app)
      .post('/api/collections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bin_id: targetBinId,
        priority: 'High',
        notes: 'Manual campus pickup scheduled.',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    requestId = res.body.request.id;
  });

  it('PUT /api/collections/:id/assign - Admin should assign collector to task', async () => {
    const res = await request(app)
      .put(`/api/collections/${requestId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        collector_id: collectorId,
        priority: 'Critical',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.assigned_collector_id).toBe(collectorId);
    expect(res.body.request.status).toBe('Assigned');
  });

  it('PUT /api/collections/:id/status - Collector should accept the task', async () => {
    const res = await request(app)
      .put(`/api/collections/${requestId}/status`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .send({ status: 'Accepted' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.request.status).toBe('Accepted');
  });

  it('POST /api/collections/:id/collect - Collector records quantity and resets bin', async () => {
    const res = await request(app)
      .post(`/api/collections/${requestId}/collect`)
      .set('Authorization', `Bearer ${collectorToken}`)
      .field('collected_quantity', '25.0')
      .field('unit', 'kg');

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.record.collected_quantity).toBe(25.0);

    // Verify bin fill percentage was reset back to 0.0
    const binRes = await request(app).get(`/api/bins/${targetBinId}`);
    expect(binRes.body.bin.current_fill_percentage).toBe(0);
    expect(binRes.body.bin.status).toBe('Normal');
  });
});

