const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  // roles can be a single role string or array
  if (typeof roles === 'string') roles = [roles];

  return (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || 'supersecret';
      const payload = jwt.verify(token, secret);
      req.user = payload;
      if (roles.length && !roles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden - insufficient role' });
      }
      next();
    } catch (err) {
      console.error('JWT error', err);
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
};

module.exports = auth;
