const express = require('express');
const { z } = require('zod');
const TestController = require('../controllers/testController');
const { requireAuth, requireStaffOrAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

const createTestSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    code: z.string().min(2, 'Code must be at least 2 characters'),
    category: z.string().min(2, 'Category must be at least 2 characters'),
    description: z.string().optional(),
    default_price: z.number().nonnegative('Default price must be 0 or higher'),
    is_active: z.boolean().optional()
  })
});

router.get('/', TestController.listTests);
router.get('/:id', TestController.getTest);
router.post('/', requireAuth, requireStaffOrAdmin, validate(createTestSchema), TestController.createTest);
router.put('/:id', requireAuth, requireStaffOrAdmin, TestController.updateTest);

module.exports = router;
