/**
 * Middleware to check if user has required role(s)
 * @param {string|string[]} allowedRoles - Role or array of roles allowed
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      const userRoleCode = req.user.role?.code || req.user.roleCode;

      if (!roles.includes(userRoleCode)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          errors: {
            required: roles,
            current: userRoleCode,
          },
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization error',
      });
    }
  };
};

/**
 * Middleware to check if user has specific permission
 * @param {string} permission - Permission name
 * @param {string} action - Action type (view, create, edit, delete, approve)
 */
const checkPermission = (permission, action = 'view') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // ADMIN has all permissions
      const userRoleCode = req.user.role?.code || req.user.roleCode;
      if (userRoleCode === 'ADMIN') {
        return next();
      }

      // Parse user permissions (stored as JSON string)
      let userPermissions = {};
      if (req.user.permissions) {
        try {
          userPermissions = JSON.parse(req.user.permissions);
        } catch (e) {
          console.error('Error parsing user permissions:', e);
        }
      }

      // Check if user has the specific permission and action
      const actionMap = {
        view: 'canView',
        create: 'canCreate',
        edit: 'canEdit',
        delete: 'canDelete',
        approve: 'canApprove',
      };

      const permKey = actionMap[action] || 'canView';

      if (userPermissions[permission] && userPermissions[permission][permKey]) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission}.${action}`,
      });
    } catch (error) {
      console.error('Permission check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization error',
      });
    }
  };
};

module.exports = {
  checkRole,
  checkPermission,
};
