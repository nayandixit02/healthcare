const db = require('../db');
const logger = require('../config/logger');

class BookingService {
  static async createBooking(user, data) {
    const { centre_id, test_id, appointment_datetime, notes } = data;

    // 1. Validate centre exists and is active
    const centreRes = await db.query(
      'SELECT * FROM diagnostic_centres WHERE id = $1 AND is_active = true',
      [centre_id]
    );
    if (centreRes.rows.length === 0) {
      const err = new Error(`Diagnostic centre with ID ${centre_id} not found or inactive`);
      err.statusCode = 404;
      throw err;
    }
    const centre = centreRes.rows[0];

    // 2. Validate test exists and is active
    const testRes = await db.query(
      'SELECT * FROM diagnostic_tests WHERE id = $1 AND is_active = true',
      [test_id]
    );
    if (testRes.rows.length === 0) {
      const err = new Error(`Diagnostic test with ID ${test_id} not found or inactive`);
      err.statusCode = 404;
      throw err;
    }
    const test = testRes.rows[0];

    // 3. Validate centre offers this test
    const offerRes = await db.query(
      'SELECT * FROM centre_test_offers WHERE centre_id = $1 AND test_id = $2 AND is_available = true',
      [centre_id, test_id]
    );
    if (offerRes.rows.length === 0) {
      const err = new Error(`Diagnostic test '${test.name}' is not offered by centre '${centre.name}'`);
      err.statusCode = 400;
      throw err;
    }
    const offer = offerRes.rows[0];

    // 4. Validate future datetime
    const apptDate = new Date(appointment_datetime);
    if (isNaN(apptDate.getTime()) || apptDate <= new Date()) {
      const err = new Error('Appointment date and time must be in the future');
      err.statusCode = 400;
      throw err;
    }

    // 5. Create booking with locked price amount and status PENDING
    const insertRes = await db.query(
      `INSERT INTO bookings (user_id, centre_id, test_id, appointment_datetime, amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user.id, centre_id, test_id, apptDate.toISOString(), offer.price, 'PENDING', notes || null]
    );

    const booking = insertRes.rows[0];
    logger.info(`Booking created: ID ${booking.id} for user ${user.id} at centre ${centre.name}`);

    return this.getBookingById(booking.id, user);
  }

  static async getBookingById(bookingId, currentUser) {
    const res = await db.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (res.rows.length === 0) {
      const err = new Error(`Booking with ID ${bookingId} not found`);
      err.statusCode = 404;
      throw err;
    }

    const booking = res.rows[0];

    // Authorization check
    if (currentUser.role !== 'admin' && currentUser.role !== 'staff' && booking.user_id !== currentUser.id) {
      const err = new Error('You do not have permission to access this booking');
      err.statusCode = 403;
      throw err;
    }

    // Fetch related centre and test
    const centreRes = await db.query('SELECT id, name, address, city, contact_phone FROM diagnostic_centres WHERE id = $1', [booking.centre_id]);
    const testRes = await db.query('SELECT id, name, code, category, default_price FROM diagnostic_tests WHERE id = $1', [booking.test_id]);

    return {
      ...booking,
      amount: Number(booking.amount),
      centre: centreRes.rows[0] || null,
      test: testRes.rows[0] ? { ...testRes.rows[0], default_price: Number(testRes.rows[0].default_price) } : null
    };
  }

  static async listBookings(currentUser, options = {}) {
    const { status: statusFilter, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    let res = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
    let rows = res.rows;

    if (currentUser.role !== 'admin' && currentUser.role !== 'staff') {
      rows = rows.filter(b => b.user_id === currentUser.id);
    }

    if (statusFilter) {
      rows = rows.filter(b => b.status === statusFilter);
    }

    const total = rows.length;
    const paged = rows.slice(offset, offset + limit);

    // Hydrate centre and test summaries
    const items = await Promise.all(paged.map(async (b) => {
      const centreRes = await db.query('SELECT id, name, address, city FROM diagnostic_centres WHERE id = $1', [b.centre_id]);
      const testRes = await db.query('SELECT id, name, code, category FROM diagnostic_tests WHERE id = $1', [b.test_id]);
      return {
        ...b,
        amount: Number(b.amount),
        centre: centreRes.rows[0] || null,
        test: testRes.rows[0] || null
      };
    }));

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      total_pages: Math.ceil(total / limit) || 1
    };
  }

  static async cancelBooking(bookingId, currentUser, reason) {
    const booking = await this.getBookingById(bookingId, currentUser);

    if (booking.status === 'CANCELLED') {
      const err = new Error('Booking is already cancelled');
      err.statusCode = 400;
      throw err;
    }

    if (booking.status === 'FAILED') {
      const err = new Error('Cannot cancel a failed booking');
      err.statusCode = 400;
      throw err;
    }

    const cancelReason = reason || 'Cancelled by user';
    await db.query(
      'UPDATE bookings SET status = $1, cancellation_reason = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      ['CANCELLED', cancelReason, bookingId]
    );

    return this.getBookingById(bookingId, currentUser);
  }
}

module.exports = BookingService;
