const express = require('express');
const { z } = require('zod');
const BookingController = require('../controllers/bookingController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const createBookingSchema = z.object({
  body: z.object({
    centre_id: z.number().int().positive('Valid centre ID is required'),
    test_id: z.number().int().positive('Valid test ID is required'),
    appointment_datetime: z.string().datetime({ message: 'Valid ISO future datetime is required' }).or(z.string().min(10)),
    notes: z.string().max(1000).optional()
  })
});

router.post('/', requireAuth, validate(createBookingSchema), BookingController.createBooking);
router.get('/', requireAuth, BookingController.listBookings);
router.get('/:id', requireAuth, BookingController.getBooking);
router.post('/:id/cancel', requireAuth, BookingController.cancelBooking);

module.exports = router;
