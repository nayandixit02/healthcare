const express = require('express');
const { z } = require('zod');
const WebhookController = require('../controllers/webhookController');
const validate = require('../middleware/validate');

const router = express.Router();

const webhookSchema = z.object({
  body: z.object({
    event_id: z.string().min(1, 'event_id is required for idempotency tracking'),
    event_type: z.enum(['payment.success', 'payment.failed'], {
      errorMap: () => ({ message: 'event_type must be either payment.success or payment.failed' })
    }),
    booking_id: z.number().int().positive('Valid booking_id is required'),
    amount: z.number().positive().optional(),
    transaction_ref: z.string().optional(),
    failure_reason: z.string().optional()
  })
});

router.post('/', validate(webhookSchema), WebhookController.handleWebhook);

module.exports = router;
