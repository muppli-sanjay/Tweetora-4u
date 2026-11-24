const express = require('express');
const { sendError } = require('../utils/errors');
const router = express.Router();
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const verifyToken = require('../middleware/auth');

// Keeps friend-request notifications consistent with the user's real friend requests:
//  - old notifications (saved before per-request status existed) get a status; only the newest
//    one per sender can be "pending", and only if that sender's request really is pending
//  - every pending request has exactly one pending notification
const syncFriendRequestNotifications = async (userId) => {
  const user = await User.findById(userId).select('friendRequests friends');
  if (!user) return;
  const pendingSenders = new Set(
    user.friendRequests.filter((fr) => fr.status === 'pending').map((fr) => String(fr.senderId))
  );
  const friendIds = new Set(user.friends.map(String));

  const legacy = await Notification.find({
    recipientId: userId,
    type: 'friend_request',
    status: { $exists: false },
  }).sort({ createdAt: -1 });
  const claimed = new Set();
  for (const n of legacy) {
    const key = String(n.senderId);
    if (!claimed.has(key)) {
      claimed.add(key);
      n.status = pendingSenders.has(key) ? 'pending' : friendIds.has(key) ? 'accepted' : 'expired';
    } else {
      n.status = 'expired';
    }
    await n.save();
  }

  // a request that is pending but has no pending notification yet
  for (const fr of user.friendRequests) {
    if (fr.status !== 'pending') continue;
    const exists = await Notification.exists({
      recipientId: userId,
      senderId: fr.senderId,
      type: 'friend_request',
      status: 'pending',
    });
    if (!exists) {
      await Notification.create({
        recipientId: userId,
        senderId: fr.senderId,
        type: 'friend_request',
        status: 'pending',
        createdAt: fr.createdAt,
      });
    }
  }
};

// GET /api/notifications - Likes, comments, friend requests and accepted requests for the logged-in user
// (message notifications are intentionally excluded; they live under /api/messages)
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await syncFriendRequestNotifications(userId);

    const query = {
      recipientId: userId,
      type: { $in: ['like', 'comment', 'friend_request', 'friend_accept'] },
      status: { $ne: 'expired' },
    };
    if (req.query.unread === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .populate('senderId', 'username name profilePicture')
      .populate('postId', 'description image')
      .lean();

    res.status(200).json(
      notifications
        .filter((n) => n.senderId)
        .map((n) => (n.type === 'friend_request' ? { ...n, friendRequestPending: n.status === 'pending' } : n))
    );
  } catch (err) {
    return sendError(res, err, 'notifications');
  }
});

// GET /api/notifications/sent - Fetch notifications sent by the logged-in user (likes/comments)
router.get('/sent', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

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

    res.status(200).json(notifications);
  } catch (err) {
    console.error('Notifications Route: Error fetching sent notifications:', {
      message: err.message,
      stack: err.stack,
    });
    return sendError(res, err, 'notifications');
  }
});

// POST /api/notifications/mark-read - Mark all notifications as read for the user
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Notifications Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Notification.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Notifications Route: Error marking notifications as read:', {
      message: err.message,
      stack: err.stack,
    });
    return sendError(res, err, 'notifications');
  }
});

module.exports = router;
