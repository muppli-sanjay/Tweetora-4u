const express = require('express');
const { sendError } = require('../utils/errors');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// Checks the sign-up form and returns { field: "problem" } for anything wrong
const validateRegistration = ({ username, email, password, name }) => {
  const errors = {};
  const n = (name || '').trim();
  const u = (username || '').trim();
  const e = (email || '').trim();
  const p = password || '';

  if (!n) errors.name = 'Name is required';
  else if (n.length > 50) errors.name = 'Name must be at most 50 characters';

  if (!u) errors.username = 'Username is required';
  else if (u.length < 3) errors.username = 'Username must be at least 3 characters';
  else if (u.length > 20) errors.username = 'Username must be at most 20 characters';
  else if (!/^[A-Za-z0-9_.]+$/.test(u)) errors.username = 'Username can only contain letters, numbers, dots and underscores';

  if (!e) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) errors.email = 'Please enter a valid email address';

  if (!p) errors.password = 'Password is required';
  else if (p.length < 6) errors.password = 'Password must be at least 6 characters';
  else if (p.length > 72) errors.password = 'Password must be at most 72 characters';

  return errors;
};

router.post('/register', async (req, res) => {
  try {
    const errors = validateRegistration(req.body || {});
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: Object.values(errors)[0], errors });
    }

    const username = req.body.username.trim();
    const email = req.body.email.trim().toLowerCase();
    const name = req.body.name.trim();
    const { password } = req.body;

    // Tell the user exactly which detail is already in use
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      const taken = {};
      if (existing.username === username) taken.username = 'That username is already taken';
      if (existing.email === email) taken.email = 'An account with this email already exists';
      return res.status(409).json({ message: Object.values(taken)[0], errors: taken });
    }

    const user = new User({
      username,
      email,
      password,
      name,
      profilePicture: 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600',
      coverPic: '',
      location: '',
      website: '',
      socialLinks: { facebook: '', instagram: '', twitter: '', linkedin: '', pinterest: '' },
    });

    await user.save();
    res.status(201).json({ message: 'Account created successfully' });
  } catch (error) {
    return sendError(res, error, 'register');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        profilePicture: user.profilePicture,
        coverPic: user.coverPic,
        location: user.location,
        website: user.website,
        socialLinks: user.socialLinks,
      },
    });
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    return sendError(res, error, 'auth');
  }
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        profilePicture: user.profilePicture,
        coverPic: user.coverPic,
        location: user.location,
        website: user.website,
        socialLinks: user.socialLinks,
      },
    });
  } catch (error) {
    console.error('Get /me error:', error.message, error.stack);
    res.status(401).json({ message: 'Invalid token' });
  }
});

module.exports = router;