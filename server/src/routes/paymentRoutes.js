const express = require('express');
const { z } = require('zod');
const PaymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const simulatePaymentSchema = z.object({
  body: z.object({
    booking_id: z.number().int().positive('Valid booking ID is required'),
    simulate_status: z.enum(['SUCCESS', 'FAILED']).default('SUCCESS'),
    payment_method: z.string().default('mock_card'),
    failure_reason: z.string().optional()
  })
});

router.post('/', requireAuth, validate(simulatePaymentSchema), PaymentController.simulatePayment);
router.get('/:id', requireAuth, PaymentController.getPayment);

module.exports = router;
