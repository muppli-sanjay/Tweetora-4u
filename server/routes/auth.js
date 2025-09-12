const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const router = express.Router();

router.post('/register', async (req, res) => {
  console.log('Received registration request:', req.body);
  try {
    const { username, email, password, name } = req.body;
    if (!username || !email || !password || !name) {
      console.log('Missing required fields:', req.body);
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      console.log('User already exists:', { username, email });
      return res.status(400).json({ message: 'Username or email already exists' });
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
      socialLinks: {
        facebook: '',
        instagram: '',
        twitter: '',
        linkedin: '',
        pinterest: '',
      },
    });

    console.log('Saving user:', user);
    await user.save();
    console.log('User saved successfully:', user._id);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error.message, error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  console.log('Received login request:', req.body);
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      console.log('Missing required fields:', req.body);
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log('Login successful, token generated:', user._id);
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
    res.status(500).json({ message: 'Server error', error: error.message });
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