const request = require('supertest');
const app = require('../src/app');
const { setupTestDb } = require('./helpers');
const db = require('../src/db');

describe('Payment Webhook (Idempotency) API Tests', () => {
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

  test('POST /payments/webhook/ - Process payment.success event', async () => {
    const payload = {
      event_id: 'evt_test_success_101',
      event_type: 'payment.success',
      booking_id: sampleBooking.id,
      amount: 380.00,
      transaction_ref: 'tx_provider_success_9988'
    };

    const res = await request(app)
      .post('/payments/webhook/')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PROCESSED');
    expect(res.body.is_duplicate).toBe(false);
    expect(res.body.booking_status).toBe('CONFIRMED');

    // Verify booking updated
    const bookingCheck = await request(app)
      .get(`/api/v1/bookings/${sampleBooking.id}`)
      .set('Authorization', `Bearer ${fixtures.patientToken}`);
    expect(bookingCheck.body.data.status).toBe('CONFIRMED');
  });

  test('POST /payments/webhook/ - Strict Idempotency & Duplicate Prevention', async () => {
    const payload = {
      event_id: 'evt_duplicate_idempotency_202',
      event_type: 'payment.success',
      booking_id: sampleBooking.id,
      amount: 380.00
    };

    // 1st delivery
    const res1 = await request(app)
      .post('/payments/webhook/')
      .send(payload);
    expect(res1.status).toBe(200);
    expect(res1.body.status).toBe('PROCESSED');
    expect(res1.body.is_duplicate).toBe(false);

    const initialPayments = await db.query('SELECT * FROM payments WHERE booking_id = $1', [sampleBooking.id]);
    expect(initialPayments.rows.length).toBe(1);

    // 2nd delivery (Duplicate event_id)
    const res2 = await request(app)
      .post('/payments/webhook/')
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.status).toBe('DUPLICATE_IGNORED');
    expect(res2.body.is_duplicate).toBe(true);

    // 3rd delivery on API route
    const res3 = await request(app)
      .post('/api/v1/payments/webhook')
      .send(payload);
    expect(res3.status).toBe(200);
    expect(res3.body.status).toBe('DUPLICATE_IGNORED');
    expect(res3.body.is_duplicate).toBe(true);

    // Verify NO duplicate payment records were created
    const finalPayments = await db.query('SELECT * FROM payments WHERE booking_id = $1', [sampleBooking.id]);
    expect(finalPayments.rows.length).toBe(1);
  });

  test('POST /payments/webhook/ - Process payment.failed event', async () => {
    const payload = {
      event_id: 'evt_test_failed_303',
      event_type: 'payment.failed',
      booking_id: sampleBooking.id,
      failure_reason: 'Bank server timeout'
    };

    const res = await request(app)
      .post('/payments/webhook/')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PROCESSED');
    expect(res.body.booking_status).toBe('FAILED');
  });

  test('POST /payments/webhook/ - Nonexistent Booking returns 404', async () => {
    const payload = {
      event_id: 'evt_nonexistent_404',
      event_type: 'payment.success',
      booking_id: 999999
    };

    const res = await request(app)
      .post('/payments/webhook/')
      .send(payload);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('does not exist');
  });

  test('POST /payments/webhook/ - Preserves CANCELLED booking state', async () => {
    // Cancel booking first
    await request(app)
      .post(`/api/v1/bookings/${sampleBooking.id}/cancel`)
      .set('Authorization', `Bearer ${fixtures.patientToken}`);

    const payload = {
      event_id: 'evt_cancelled_state_505',
      event_type: 'payment.success',
      booking_id: sampleBooking.id
    };

    const res = await request(app)
      .post('/payments/webhook/')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.booking_status).toBe('CANCELLED');
  });
});
