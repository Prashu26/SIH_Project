const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  // roles can be a single role string or array
  if (typeof roles === 'string') roles = [roles];
  const normalizedRoles = roles.map((role) => role.toLowerCase());

  return (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Auth failed: No Bearer token');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || 'supersecret';
      const payload = jwt.verify(token, secret);
      const normalizedRole = (payload.role || '').toLowerCase();
      req.user = { ...payload, role: normalizedRole };
      console.log(`Auth check - User role: "${normalizedRole}", Required roles: [${normalizedRoles.join(', ')}], Path: ${req.path}`);
      if (normalizedRoles.length && !normalizedRoles.includes(normalizedRole)) {
        console.log(`Auth DENIED - Role "${normalizedRole}" not in [${normalizedRoles.join(', ')}]`);
        return res.status(403).json({ message: 'Forbidden - insufficient role' });
      }
      console.log('Auth PASSED');
      next();
    } catch (err) {
      console.error('JWT error', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};

module.exports = auth;
