const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');

describe('Simulated Payments API Tests', () => {
  let fixtures;
  let sampleBooking;

  beforeEach(async () => {
    fixtures = await setupTestDb();
    const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const bookRes = await request(app)
      .post('/api/v1/bookings')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        centre_id: fixtures.centre.id,
        test_id: fixtures.testItem.id,
        appointment_datetime: futureDate
      });
    sampleBooking = bookRes.body.data;
  });

  test('POST /payments/ - Simulated Payment SUCCESS updates Booking to CONFIRMED', async () => {
    const res = await request(app)
      .post('/payments/')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        booking_id: sampleBooking.id,
        simulate_status: 'SUCCESS',
        payment_method: 'mock_card'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUCCESS');
    expect(res.body.data.booking_status).toBe('CONFIRMED');
    expect(res.body.data.transaction_ref).toBeDefined();

    // Verify booking query returns CONFIRMED
    const checkRes = await request(app)
      .get(`/api/v1/bookings/${sampleBooking.id}`)
      .set('Authorization', `Bearer ${fixtures.patientToken}`);
    expect(checkRes.body.data.status).toBe('CONFIRMED');
  });

  test('POST /api/v1/payments/ - Simulated Payment FAILED updates Booking to FAILED', async () => {
    const res = await request(app)
      .post('/api/v1/payments/')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        booking_id: sampleBooking.id,
        simulate_status: 'FAILED',
        failure_reason: 'Insufficient funds in test account'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FAILED');
    expect(res.body.data.booking_status).toBe('FAILED');
    expect(res.body.data.failure_reason).toBe('Insufficient funds in test account');
  });

  test('POST /payments/ - Double Payment on CONFIRMED booking fails', async () => {
    // 1st payment succeeds
    await request(app)
      .post('/payments/')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        booking_id: sampleBooking.id,
        simulate_status: 'SUCCESS'
      });

    // 2nd payment attempt
    const res = await request(app)
      .post('/payments/')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        booking_id: sampleBooking.id,
        simulate_status: 'SUCCESS'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('already CONFIRMED');
  });

  test('POST /payments/ - Payment on CANCELLED booking fails', async () => {
    await request(app)
      .post(`/api/v1/bookings/${sampleBooking.id}/cancel`)
      .set('Authorization', `Bearer ${fixtures.patientToken}`);

    const res = await request(app)
      .post('/payments/')
      .set('Authorization', `Bearer ${fixtures.patientToken}`)
      .send({
        booking_id: sampleBooking.id,
        simulate_status: 'SUCCESS'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('CANCELLED');
  });

  test('POST /payments/ - Unauthorized user cannot pay for another user booking', async () => {
    const res = await request(app)
      .post('/payments/')
      .set('Authorization', `Bearer ${fixtures.otherPatientToken}`)
      .send({
        booking_id: sampleBooking.id,
        simulate_status: 'SUCCESS'
      });

    expect(res.status).toBe(403);
  });
});
