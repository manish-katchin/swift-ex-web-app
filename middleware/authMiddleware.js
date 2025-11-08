const jwt = require('jsonwebtoken');

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', { message: error.message, stack: error.stack });
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};