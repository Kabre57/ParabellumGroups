const express = require('express');
const { body, query } = require('express-validator');
const {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  updateRolePermission,
  deleteRolePermission,
} = require('../controllers/permission.controller');
const {
  getPermissionCategories
} = require('../controllers/user-permission.controller');
const authenticate = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All permission routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/permissions
 * @desc    Get all permissions
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.get(
  '/',
  checkRole(['ADMIN', 'GENERAL_DIRECTOR']),
  [
    query('category')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Category must not exceed 100 characters'),
  ],
  getAllPermissions
);

/**
 * @route   GET /api/permissions/categories
 * @desc    Get all permission categories
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.get('/categories', checkRole(['ADMIN', 'GENERAL_DIRECTOR']), getPermissionCategories);

/**
 * @route   GET /api/permissions/:id
 * @desc    Get permission by ID
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.get('/:id', checkRole(['ADMIN', 'GENERAL_DIRECTOR']), getPermissionById);

/**
 * @route   POST /api/permissions
 * @desc    Create new permission
 * @access  Private - ADMIN
 */
router.post(
  '/',
  checkRole('ADMIN'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Permission name is required')
      .isLength({ max: 100 })
      .withMessage('Permission name must not exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('category')
      .trim()
      .notEmpty()
      .withMessage('Category is required')
      .isLength({ max: 100 })
      .withMessage('Category must not exceed 100 characters'),
  ],
  createPermission
);

/**
 * @route   PUT /api/permissions/:id
 * @desc    Update permission
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
      .withMessage('Permission name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Permission name must not exceed 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must not exceed 500 characters'),
    body('category')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Category cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Category must not exceed 100 characters'),
  ],
  updatePermission
);

/**
 * @route   DELETE /api/permissions/:id
 * @desc    Delete permission
 * @access  Private - ADMIN
 */
router.delete('/:id', checkRole('ADMIN'), deletePermission);

/**
 * @route   GET /api/permissions/roles/:role
 * @desc    Get role permissions
 * @access  Private - ADMIN, GENERAL_DIRECTOR
 */
router.get('/roles/:role', checkRole(['ADMIN', 'GENERAL_DIRECTOR']), getRolePermissions);

/**
 * @route   PUT /api/permissions/roles/:role/:permissionId
 * @desc    Update role permission
 * @access  Private - ADMIN
 */
router.put(
  '/roles/:role/:permissionId',
  checkRole('ADMIN'),
  [
    body('canView')
      .optional()
      .isBoolean()
      .withMessage('canView must be a boolean'),
    body('canCreate')
      .optional()
      .isBoolean()
      .withMessage('canCreate must be a boolean'),
    body('canEdit')
      .optional()
      .isBoolean()
      .withMessage('canEdit must be a boolean'),
    body('canDelete')
      .optional()
      .isBoolean()
      .withMessage('canDelete must be a boolean'),
    body('canApprove')
      .optional()
      .isBoolean()
      .withMessage('canApprove must be a boolean'),
  ],
  updateRolePermission
);

/**
 * @route   DELETE /api/permissions/roles/:role/:permissionId
 * @desc    Delete role permission
 * @access  Private - ADMIN
 */
router.delete('/roles/:role/:permissionId', checkRole('ADMIN'), deleteRolePermission);

module.exports = router;
