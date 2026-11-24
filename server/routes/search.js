const express = require('express');
const { sendError } = require('../utils/errors');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const verifyToken = require('../middleware/auth');

// GET /api/search?q=<query> - Search users and posts
router.get('/', verifyToken, async (req, res) => {
  try {
    const query = req.query.q ? req.query.q.trim() : '';

    if (!query) {
      return res.status(200).json({ users: [], posts: [] });
    }

    // Search users by username or name (case-insensitive, partial match)
    const userQuery = {
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } },
      ],
    };
    const users = await User.find(userQuery)
      .select('_id username name profilePicture')
      .limit(5)
      .lean();

    // Search posts by description (case-insensitive, partial match)
    const postQuery = {
      description: { $regex: query, $options: 'i' },
    };
    const posts = await Post.find(postQuery)
      .populate('userId', 'username name profilePicture')
      .select('_id description image userId')
      .limit(5)
      .lean();

    res.status(200).json({ users, posts });
  } catch (err) {
    console.error('Search Route: Error searching:', {
      message: err.message,
      stack: err.stack,
    });
    return sendError(res, err, 'search');
  }
});

module.exports = router;