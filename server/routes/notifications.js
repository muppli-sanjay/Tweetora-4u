const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/auth');

// GET /api/notifications - Fetch notifications for the logged-in user (received)
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`Notifications Route: Fetching received notifications for user ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Notifications Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const query = { recipientId: userId };
    if (req.query.unread === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate('senderId', 'username name profilePicture')
      .populate('postId', 'description image')
      .lean();

    console.log(`Notifications Route: Found ${notifications.length} received notifications`);
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Notifications Route: Error fetching received notifications:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error while fetching notifications', error: err.message });
  }
});

// GET /api/notifications/sent - Fetch notifications sent by the logged-in user (likes/comments)
router.get('/sent', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`Notifications Route: Fetching sent notifications for user ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Notifications Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const notifications = await Notification.find({
      senderId: userId,
      type: { $in: ['like', 'comment'] },
    })
      .sort({ createdAt: -1 })
      .populate('recipientId', 'username name profilePicture')
      .populate('postId', 'description image')
      .lean();

    console.log(`Notifications Route: Found ${notifications.length} sent notifications`);
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Notifications Route: Error fetching sent notifications:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error while fetching sent notifications', error: err.message });
  }
});

// POST /api/notifications/mark-read - Mark all notifications as read for the user
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`Notifications Route: Marking notifications as read for user ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Notifications Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Notification.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );

    console.log('Notifications Route: Notifications marked as read');
    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Notifications Route: Error marking notifications as read:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error while marking notifications as read', error: err.message });
  }
});

module.exports = router;
