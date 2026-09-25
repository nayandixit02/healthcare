const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');

describe('Edge Cases & System Health API Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await setupTestDb();
  });

  test('GET /health - Health check is healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  test('GET / - Root welcome endpoint', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.documentation).toBe('/docs');
  });

  test('Protected Endpoints require Bearer Authentication', async () => {
    const endpoints = [
      ['get', '/api/v1/auth/me'],
      ['get', '/api/v1/bookings'],
      ['post', '/api/v1/bookings'],
      ['post', '/payments/'],
      ['post', '/api/v1/centres'],
      ['post', '/api/v1/tests']
    ];

    for (const [method, path] of endpoints) {
      const res = await request(app)[method](path).send({});
      expect(res.status).toBe(401);
    }
  });

  test('Invalid booking ID returns 404', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/999999')
      .set('Authorization', `Bearer ${fixtures.patientToken}`);
    expect(res.status).toBe(404);
  });

  test('Invalid JWT signature returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid.token.payload');
    expect(res.status).toBe(401);
  });
});
