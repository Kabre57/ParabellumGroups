const express = require('express');
const { body } = require('express-validator');
const {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
} = require('../controllers/service.controller');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All service routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/services
 * @desc    Get all services
 * @access  Private
 */
router.get('/', getAllServices);

/**
 * @route   GET /api/services/:id
 * @desc    Get service by ID
 * @access  Private
 */
router.get('/:id', getServiceById);

/**
 * @route   POST /api/services
 * @desc    Create new service
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.post(
  '/',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Service name is required')
      .isLength({ max: 100 })
      .withMessage('Service name must not exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Service code must not exceed 10 characters'),
    body('parentId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Parent ID must be a positive integer'),
    body('managerId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Manager ID must be a positive integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  createService
);

/**
 * @route   PUT /api/services/:id
 * @desc    Update service
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.put(
  '/:id',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Service name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Service name must not exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('code')
      .optional()
      .trim()
      .isLength({ max: 10 })
      .withMessage('Service code must not exceed 10 characters'),
    body('parentId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Parent ID must be a positive integer'),
    body('managerId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Manager ID must be a positive integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  updateService
);

/**
 * @route   DELETE /api/services/:id
 * @desc    Delete service
 * @access  Private - ADMIN
 */
router.delete('/:id', checkRole('ADMIN'), deleteService);

module.exports = router;
