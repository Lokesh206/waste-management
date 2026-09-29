/**
 * Role-Based Access Control Middleware
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 */
function roleMiddleware(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Access denied for role '${req.user.role}'. Required role(s): ${roles.join(', ')}.`,
      });
    }

    next();
  };
}

module.exports = roleMiddleware;
module.exports.roleMiddleware = roleMiddleware;
module.exports.requireRole = roleMiddleware;

