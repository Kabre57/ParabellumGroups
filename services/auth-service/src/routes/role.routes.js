const express = require('express');
const { body, query } = require('express-validator');
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/role.controller');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All role routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/roles
 * @desc    Get all roles
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.get(
  '/',
  [
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  getAllRoles
);

/**
 * @route   GET /api/roles/:id
 * @desc    Get role by ID
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.get('/:id', getRoleById);

/**
 * @route   POST /api/roles
 * @desc    Create new role
 * @access  Private - ADMIN
 */
router.post(
  '/',
  checkRole('ADMIN'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Role name is required')
      .isLength({ max: 100 })
      .withMessage('Role name must not exceed 100 characters'),
    body('code')
      .trim()
      .notEmpty()
      .withMessage('Role code is required')
      .isLength({ max: 50 })
      .withMessage('Role code must not exceed 50 characters')
      .matches(/^[A-Z_]+$/)
      .withMessage('Role code must contain only uppercase letters and underscores'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  createRole
);

/**
 * @route   PUT /api/roles/:id
 * @desc    Update role
 * @access  Private - ADMIN
 */
router.put(
  '/:id',
  checkRole('ADMIN'),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Role name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Role name must not exceed 100 characters'),
    body('code')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Role code cannot be empty')
      .isLength({ max: 50 })
      .withMessage('Role code must not exceed 50 characters')
      .matches(/^[A-Z_]+$/)
      .withMessage('Role code must contain only uppercase letters and underscores'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  updateRole
);

/**
 * @route   DELETE /api/roles/:id
 * @desc    Delete role
 * @access  Private - ADMIN
 */
router.delete('/:id', checkRole('ADMIN'), deleteRole);

module.exports = router;
