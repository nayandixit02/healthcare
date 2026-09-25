const BookingService = require('../services/bookingService');

class BookingController {
  static async createBooking(req, res, next) {
    try {
      const booking = await BookingService.createBooking(req.user, req.body);
      res.status(201).json({
        status: 'success',
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  static async listBookings(req, res, next) {
    try {
      const { status, page, limit } = req.query;
      const result = await BookingService.listBookings(req.user, { status, page, limit });
      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getBooking(req, res, next) {
    try {
      const { id } = req.params;
      const booking = await BookingService.getBookingById(id, req.user);
      res.status(200).json({
        status: 'success',
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  static async cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const { cancellation_reason } = req.body || {};
      const booking = await BookingService.cancelBooking(id, req.user, cancellation_reason);
      res.status(200).json({
        status: 'success',
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = BookingController;
