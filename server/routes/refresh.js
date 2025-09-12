const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/refreshToken');
const User = require('../models/user');

router.post('/refresh', async (req, res) => {
  console.log('Refresh Route: Received POST /api/auth/refresh');
  try {
    const { refreshToken } = req.body;
    console.log('Refresh Route: Refresh token received');

    if (!refreshToken) {
      console.error('Refresh Route: No refresh token provided');
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    // Verify refresh token
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    } catch (err) {
      console.error('Refresh Route: Invalid refresh token:', err.message);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    // Check if refresh token exists in database
    const storedToken = await RefreshToken.findOne({
      userId: payload.userId,
      token: refreshToken,
    });

    if (!storedToken) {
      console.error('Refresh Route: Refresh token not found in database');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check if refresh token is expired
    if (storedToken.expiresAt < new Date()) {
      console.error('Refresh Route: Refresh token expired');
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    // Generate new access token
    const user = await User.findById(payload.userId);
    if (!user) {
      console.error('Refresh Route: User not found:', payload.userId);
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    console.log('Refresh Route: New access token generated for user:', user.username);
    res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Refresh Route: Error refreshing token:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;