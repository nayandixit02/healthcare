const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../config/logger');

class PaymentService {
  static async processSimulatedPayment(user, payload) {
    const { booking_id, simulate_status = 'SUCCESS', payment_method = 'mock_card', failure_reason } = payload;

    // 1. Fetch booking
    const bookingRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bookingRes.rows.length === 0) {
      const err = new Error(`Booking with ID ${booking_id} not found`);
      err.statusCode = 404;
      throw err;
    }
    const booking = bookingRes.rows[0];

    // 2. Check authorization
    if (user.role !== 'admin' && user.role !== 'staff' && booking.user_id !== user.id) {
      const err = new Error('You are not authorized to make a payment for this booking');
      err.statusCode = 403;
      throw err;
    }

    // 3. State validations
    if (booking.status === 'CONFIRMED') {
      const err = new Error('Payment cannot be processed because this booking is already CONFIRMED');
      err.statusCode = 400;
      throw err;
    }

    if (booking.status === 'CANCELLED') {
      const err = new Error('Payment cannot be processed because this booking has been CANCELLED');
      err.statusCode = 400;
      throw err;
    }

    // 4. Determine outcomes
    const txRef = `txn_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const paymentStatus = simulate_status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
    const newBookingStatus = simulate_status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
    const failReason = simulate_status === 'FAILED' ? (failure_reason || 'Simulated transaction decline') : null;

    // 5. Update booking status
    await db.query(
      'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newBookingStatus, booking.id]
    );

    // 6. Create payment audit record
    const paymentRes = await db.query(
      `INSERT INTO payments (booking_id, user_id, amount, status, payment_method, transaction_ref, failure_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [booking.id, booking.user_id, booking.amount, paymentStatus, payment_method, txRef, failReason]
    );

    const payment = paymentRes.rows[0];
    logger.info(`Simulated payment ${payment.id}: status=${paymentStatus}, booking=${booking.id} -> ${newBookingStatus}`);

    return {
      ...payment,
      amount: Number(payment.amount),
      booking_status: newBookingStatus
    };
  }

  static async getPaymentById(paymentId, currentUser) {
    const res = await db.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
    if (res.rows.length === 0) {
      const err = new Error(`Payment with ID ${paymentId} not found`);
      err.statusCode = 404;
      throw err;
    }
    const payment = res.rows[0];
    if (currentUser.role !== 'admin' && currentUser.role !== 'staff' && payment.user_id !== currentUser.id) {
      const err = new Error('You do not have permission to view this payment');
      err.statusCode = 403;
      throw err;
    }
    return {
      ...payment,
      amount: Number(payment.amount)
    };
  }
}

module.exports = PaymentService;
