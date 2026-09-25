const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');

describe('Diagnostic Centres & Tests API Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await setupTestDb();
  });

  test('GET /api/v1/centres - List Centres', async () => {
    const res = await request(app).get('/api/v1/centres');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0].name).toBe(fixtures.centre.name);
  });

  test('GET /api/v1/centres/:id - Details with offered tests', async () => {
    const res = await request(app).get(`/api/v1/centres/${fixtures.centre.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(fixtures.centre.id);
    expect(res.body.data.test_offers.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.test_offers[0].price).toBe(380.00);
  });

  test('POST /api/v1/centres - Admin Only (Patient 403, Admin 201)', async () => {
    const payload = {
      name: 'Mumbai City Diagnostics',
      address: '22 Marine Drive',
      city: 'Mumbai',
      contact_phone: '+91-22-33445566'
    };

    // Patient forbidden
    const patientRes = await request(app)
      .post('/api/v1/centres')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send(payload);
    expect(patientRes.status).toBe(403);

    // Admin allowed
    const adminRes = await request(app)
      .post('/api/v1/centres')
      .set('Authorization', `Bearer ${fixtures.adminToken}`)
      .send(payload);
    expect(adminRes.status).toBe(201);
    expect(adminRes.body.data.name).toBe('Mumbai City Diagnostics');
  });

  test('POST /api/v1/tests - Admin creates test', async () => {
    const payload = {
      name: 'Lipid Profile Panel',
      code: 'LIPID_TEST',
      category: 'Biochemistry',
      description: 'Cholesterol profile',
      default_price: 750.00
    };

    const res = await request(app)
      .post('/api/v1/tests')
      .set('Authorization', `Bearer ${fixtures.adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('LIPID_TEST');
  });

  test('POST /api/v1/centres/:id/tests - Add custom test offer', async () => {
    const payload = {
      test_id: fixtures.testItem.id,
      price: 360.00,
      turn_around_hours: 8,
      is_available: true
    };

    const res = await request(app)
      .post(`/api/v1/centres/${fixtures.centre.id}/tests`)
      .set('Authorization', `Bearer ${fixtures.adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.price).toBe(360.00);
  });
});
