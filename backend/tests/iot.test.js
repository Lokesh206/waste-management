const request = require('supertest');
const app = require('../server');

describe('IoT Sensor Telemetry Endpoints', () => {
  const IOT_KEY = 'swms_iot_device_secure_token_998877';

  it('POST /api/iot/bin-reading - Should reject telemetry without x-api-key header', async () => {
    const res = await request(app)
      .post('/api/iot/bin-reading')
      .send({
        bin_code: 'BIN-001',
        fill_percentage: 50,
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/iot/bin-reading - Should process valid simulated reading for BIN-002', async () => {
    const res = await request(app)
      .post('/api/iot/bin-reading')
      .set('x-api-key', IOT_KEY)
      .send({
        bin_code: 'BIN-002',
        fill_percentage: 45.0,
        temperature: 25.4,
        sensor_status: 'OK',
        is_simulated: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('Normal');
    expect(res.body.is_simulated).toBe(true);
  });

  it('POST /api/iot/bin-reading - Should trigger Critical status and auto-alert when fill is 92%', async () => {
    const res = await request(app)
      .post('/api/iot/bin-reading')
      .set('x-api-key', IOT_KEY)
      .send({
        bin_code: 'BIN-001',
        fill_percentage: 92.0,
        temperature: 27.1,
        sensor_status: 'OK',
        is_simulated: true,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('Critical');
    expect(res.body.alert_generated).toBe(true);
    expect(res.body.priority).toBe('Critical');
  });
});

