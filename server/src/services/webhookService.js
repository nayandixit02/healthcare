const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('../config/logger');

class WebhookService {
  static async processWebhook(payload) {
    const {
      event_id,
      event_type,
      booking_id,
      amount,
      transaction_ref,
      failure_reason
    } = payload;

    logger.info(`Incoming Webhook: Event=${event_id}, Type=${event_type}, Booking=${booking_id}`);

    // 1. Idempotency Check: Look up event_id in webhook_events table
    const existingRes = await db.query(
      'SELECT * FROM webhook_events WHERE event_id = $1',
      [event_id]
    );

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      logger.warn(`Duplicate webhook event received: ${event_id}. Preserving idempotency.`);

      // Increment retry_count
      await db.query(
        'UPDATE webhook_events SET retry_count = retry_count + 1 WHERE id = $1',
        [existing.id]
      );

      // Get current booking status for informational response
      const bookingRes = await db.query('SELECT status FROM bookings WHERE id = $1', [booking_id]);
      const currentBookingStatus = bookingRes.rows.length > 0 ? bookingRes.rows[0].status : null;

      return {
        status: 'DUPLICATE_IGNORED',
        event_id,
        message: 'Duplicate webhook event detected and safely ignored. No state modified.',
        booking_id,
        booking_status: currentBookingStatus,
        is_duplicate: true
      };
    }

    // 2. Validate booking exists
    const bookingRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (bookingRes.rows.length === 0) {
      // Record failed event for audit trail
      try {
        await db.query(
          `INSERT INTO webhook_events (event_id, event_type, booking_id, payload, status, error_message)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [event_id, event_type, booking_id, JSON.stringify(payload), 'FAILED', `Booking with ID ${booking_id} not found`]
        );
      } catch (e) {}

      const err = new Error(`Booking with ID ${booking_id} specified in webhook does not exist`);
      err.statusCode = 404;
      throw err;
    }

    const booking = bookingRes.rows[0];
    const txRef = transaction_ref || `webhook_tx_${uuidv4().replace(/-/g, '').slice(0, 14)}`;
    const paymentAmount = amount !== undefined && amount !== null ? Number(amount) : Number(booking.amount);
    let message = '';
    let paymentId = null;

    // 3. Process event type with state-machine safety
    if (event_type === 'payment.success') {
      if (booking.status === 'CONFIRMED') {
        message = 'Booking was already CONFIRMED. Webhook recorded without state corruption.';
      } else if (booking.status === 'CANCELLED') {
        message = 'Booking was previously CANCELLED. Status preserved as CANCELLED.';
      } else {
        await db.query(
          'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['CONFIRMED', booking.id]
        );
        booking.status = 'CONFIRMED';
        message = 'Booking successfully marked as CONFIRMED via webhook.';
      }

      // Record successful payment
      const pRes = await db.query(
        `INSERT INTO payments (booking_id, user_id, amount, status, payment_method, transaction_ref)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [booking.id, booking.user_id, paymentAmount, 'SUCCESS', 'webhook_gateway', txRef]
      );
      paymentId = pRes.rows[0].id;
    } else if (event_type === 'payment.failed') {
      if (booking.status === 'CONFIRMED') {
        message = 'Booking is already CONFIRMED. Failure webhook logged without corrupting confirmation.';
      } else if (booking.status === 'CANCELLED') {
        message = 'Booking is CANCELLED. Failure webhook recorded.';
      } else {
        await db.query(
          'UPDATE bookings SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['FAILED', booking.id]
        );
        booking.status = 'FAILED';
        message = 'Booking updated to FAILED via webhook.';
      }

      // Record failed payment
      const pRes = await db.query(
        `INSERT INTO payments (booking_id, user_id, amount, status, payment_method, transaction_ref, failure_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [booking.id, booking.user_id, paymentAmount, 'FAILED', 'webhook_gateway', txRef, failure_reason || 'Simulated provider failure']
      );
      paymentId = pRes.rows[0].id;
    }

    // 4. Save processed webhook event
    await db.query(
      `INSERT INTO webhook_events (event_id, event_type, booking_id, payment_id, payload, status, response_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [event_id, event_type, booking.id, paymentId, JSON.stringify(payload), 'PROCESSED', message]
    );

    logger.info(`Processed webhook event ${event_id}: ${message}`);

    return {
      status: 'PROCESSED',
      event_id,
      message,
      booking_id: booking.id,
      booking_status: booking.status,
      is_duplicate: false
    };
  }
}

module.exports = WebhookService;
