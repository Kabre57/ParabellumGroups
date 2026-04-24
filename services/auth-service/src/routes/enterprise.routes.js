const express = require('express');
const { body } = require('express-validator');
const {
  getAllEnterprises,
  getEnterpriseById,
  createEnterprise,
  updateEnterprise,
  deleteEnterprise,
} = require('../controllers/enterprise.controller');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const { uploadServiceImage } = require('../middleware/upload'); // Assuming uploadServiceImage is generic for any logo

const router = express.Router();

// All enterprise routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/enterprises
 * @desc    Get all enterprises
 * @access  Private
 */
router.get('/', getAllEnterprises);

/**
 * @route   GET /api/enterprises/:id
 * @desc    Get enterprise by ID
 * @access  Private
 */
router.get('/:id', getEnterpriseById);

/**
 * @route   POST /api/enterprises
 * @desc    Create new enterprise (supports multipart/form-data with logo)
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.post(
  '/',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  (req, res, next) => {
    // using uploadServiceImage from existing project for the logo
    uploadServiceImage(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Enterprise name is required')
      .isLength({ max: 100 })
      .withMessage('Enterprise name must not exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Enterprise code must not exceed 10 characters'),
    body('parentEnterpriseId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('parentEnterpriseId must be a positive integer'),
    body('isActive')
      .optional()
      .custom((v) => v === undefined || v === null || v === '' || v === true || v === 'true' || v === false || v === 'false')
      .withMessage('isActive must be a boolean'),
  ],
  createEnterprise
);

/**
 * @route   PUT /api/enterprises/:id
 * @desc    Update enterprise
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.put(
  '/:id',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  (req, res, next) => {
    uploadServiceImage(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Enterprise name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Enterprise name must not exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Enterprise code must not exceed 10 characters'),
    body('parentEnterpriseId')
      .optional({ values: 'falsy' })
      .isInt({ min: 1 })
      .withMessage('parentEnterpriseId must be a positive integer'),
    body('isActive')
      .optional()
      .custom((v) => v === undefined || v === null || v === '' || v === true || v === 'true' || v === false || v === 'false')
      .withMessage('isActive must be a boolean'),
    body('removeLogo')
      .optional()
      .custom((v) => v === undefined || v === null || v === true || v === 'true' || v === false || v === 'false')
      .withMessage('removeLogo must be a boolean'),
  ],
  updateEnterprise
);

/**
 * @route   DELETE /api/enterprises/:id
 * @desc    Delete enterprise
 * @access  Private - ADMIN
 */
router.delete('/:id', checkRole('ADMIN'), deleteEnterprise);

module.exports = router;
