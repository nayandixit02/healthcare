const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');
const db = require('../src/db');

describe('Bookings API Tests', () => {
  let fixtures;

  beforeEach(async () => {
    fixtures = await setupTestDb();
  });

  test('POST /api/v1/bookings - Success', async () => {
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        centre_id: fixtures.centre.id,
        test_id: fixtures.testItem.id,
        appointment_datetime: futureDate,
        notes: 'Fasting 12 hours required'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.amount).toBe(380.00);
    expect(res.body.data.centre_id).toBe(fixtures.centre.id);
  });

  test('POST /api/v1/bookings - Past Date Fails', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        centre_id: fixtures.centre.id,
        test_id: fixtures.testItem.id,
        appointment_datetime: pastDate
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('future');
  });

  test('POST /api/v1/bookings - Unoffered Test Fails', async () => {
    // Create new unlinked test
    const unlinkedRes = await db.query(
      `INSERT INTO diagnostic_tests (name, code, category, default_price, is_active)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      ['Unlinked MRI', 'UNLINKED_MRI', 'Radiology', 5000.00, true]
    );

    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        centre_id: fixtures.centre.id,
        test_id: unlinkedRes.rows[0].id,
        appointment_datetime: futureDate
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('not offered');
  });

  test('GET /api/v1/bookings/:id - Authorization Checks', async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        centre_id: fixtures.centre.id,
        test_id: fixtures.testItem.id,
        appointment_datetime: futureDate
      });

    const bookingId = bookRes.body.data.id;

    // Owner can access
    const ownerRes = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${fixtures.patientToken}`);
    expect(ownerRes.status).toBe(200);

    // Admin can access
    const adminRes = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${fixtures.adminToken}`);
    expect(adminRes.status).toBe(200);

    // Other patient cannot access (403)
    const otherRes = await request(app)
      .get(`/api/v1/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${fixtures.otherPatientToken}`);
    expect(otherRes.status).toBe(403);
  });

  test('POST /api/v1/bookings/:id/cancel - Success', async () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        centre_id: fixtures.centre.id,
        test_id: fixtures.testItem.id,
        appointment_datetime: futureDate
      });

    const bookingId = bookRes.body.data.id;

    const cancelRes = await request(app)
      .post(`/api/v1/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({ cancellation_reason: 'Rescheduled appointment' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
    expect(cancelRes.body.data.cancellation_reason).toBe('Rescheduled appointment');
  });
});
