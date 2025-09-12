const jwt = require('jsonwebtoken');
const User = require('../models/user');
const mongoose = require('mongoose');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.error('authenticateToken: No token provided');
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('authenticateToken: Decoded token=', JSON.stringify(decoded, null, 2));

    if (!decoded.id) {
      console.error('authenticateToken: No id in decoded token');
      return res.status(403).json({ message: 'Invalid token: No user ID' });
    }

    if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
      console.error(`authenticateToken: Invalid ObjectId: ${decoded.id}`);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.error(`authenticateToken: User not found for ID: ${decoded.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    req.userId = user._id.toString();
    console.log('authenticateToken: req.userId set=', req.userId);
    next();
  } catch (err) {
    console.error('authenticateToken: Error=', err.message);
    if (err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    return res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = authenticateToken;