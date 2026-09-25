const express = require('express');
const { z } = require('zod');
const CentreController = require('../controllers/centreController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const createCentreSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    address: z.string().min(5, 'Address must be at least 5 characters'),
    city: z.string().min(2, 'City must be at least 2 characters'),
    contact_phone: z.string().optional(),
    is_active: z.boolean().optional()
  })
});

const addOfferSchema = z.object({
  body: z.object({
    test_id: z.number().int().positive('Test ID is required'),
    price: z.number().positive('Price must be positive'),
    turn_around_hours: z.number().int().positive().optional(),
    is_available: z.boolean().optional()
  })
});

router.get('/', CentreController.listCentres);
router.get('/:id', CentreController.getCentre);
router.post('/', requireAuth, requireStaffOrAdmin, validate(createCentreSchema), CentreController.createCentre);
router.put('/:id', requireAuth, requireStaffOrAdmin, CentreController.updateCentre);
router.post('/:id/tests', requireAuth, requireStaffOrAdmin, validate(addOfferSchema), CentreController.addTestOffer);
router.delete('/:id/tests/:test_id', requireAuth, requireStaffOrAdmin, CentreController.removeTestOffer);

module.exports = router;
