const express = require('express');
const { body, query } = require('express-validator');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
} = require('../controllers/user.controller');
const {
  getUserPermissions,
  updateUserPermissions,
  checkUserPermission
} = require('../controllers/user-permission.controller');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination
 * @access  Private - ADMIN, GENERAL_DIRECTOR, SERVICE_MANAGER
 */
router.get(
  '/',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('role')
      .optional()
      .isIn(['ADMIN', 'GENERAL_DIRECTOR', 'SERVICE_MANAGER', 'EMPLOYEE', 'ACCOUNTANT', 'PURCHASING_MANAGER'])
      .withMessage('Invalid role'),
    query('serviceId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Service ID must be a positive integer'),
    query('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search term must not exceed 100 characters'),
  ],
  getAllUsers
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.post(
  '/',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 100 })
      .withMessage('First name must not exceed 100 characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 100 })
      .withMessage('Last name must not exceed 100 characters'),
    body('roleId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Role ID must be a positive integer'),
    body('serviceId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Service ID must be a positive integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  createUser
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id', getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.put(
  '/:id',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  [
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('First name must not exceed 100 characters'),
    body('lastName')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Last name must not exceed 100 characters'),
    body('roleId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Role ID must be a positive integer'),
    body('serviceId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Service ID must be a positive integer'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Phone must not exceed 50 characters'),
    body('position')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Position must not exceed 100 characters'),
    body('employeeNumber')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Employee number must not exceed 50 characters'),
  ],
  updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private - ADMIN
 */
router.delete('/:id', checkRole('ADMIN'), deleteUser);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Update user status (activate/deactivate)
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.patch(
  '/:id/status',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  [
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean'),
  ],
  updateUserStatus
);

/**
 * @route   GET /api/users/:userId/permissions
 * @desc    Get user permissions
 * @access  Private - ADMIN
 */
router.get('/:userId/permissions', checkRole('ADMIN'), getUserPermissions);

/**
 * @route   PUT /api/users/:userId/permissions
 * @desc    Update user permissions
 * @access  Private - ADMIN
 */
router.put(
  '/:userId/permissions',
  checkRole('ADMIN'),
  [
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
    body('permissionIds')
      .optional()
      .isArray()
      .withMessage('PermissionIds must be an array'),
  ],
  updateUserPermissions
);

/**
 * @route   GET /api/users/:userId/permissions/check/:permissionName
 * @desc    Check if user has specific permission
 * @access  Private
 */
router.get('/:userId/permissions/check/:permissionName', checkUserPermission);

module.exports = router;
