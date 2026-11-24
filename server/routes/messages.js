const express = require('express');
const { sendError } = require('../utils/errors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('Messages Route: Token verification error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get unread message notifications
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const query = { recipientId: req.userId };
    if (req.query.unread === 'true') {
      query.read = false;
    }

    const messages = await Message.find(query)
      .populate({
        path: 'senderId',
        select: '_id username name profilePicture',
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(messages);
  } catch (err) {
    console.error('Messages Route: Error fetching notifications:', err.message);
    console.error('Messages Route: Error details:', JSON.stringify(err, null, 2));
    return sendError(res, err, 'messages');
  }
});

// Mark all messages as read
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Messages Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Message.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Messages Route: Error marking messages as read:', {
      message: err.message,
      stack: err.stack,
    });
    return sendError(res, err, 'messages');
  }
});

// Get messages between two users
router.get('/:friendId', verifyToken, async (req, res) => {
  const { friendId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      console.error(`Messages Route: Invalid friend ID: ${friendId}`);
      return res.status(400).json({ message: 'Invalid friend ID' });
    }
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, recipientId: friendId },
        { senderId: friendId, recipientId: req.userId },
      ],
    })
      .populate('senderId', '_id username name profilePicture')
      .sort({ createdAt: 1 })
      .limit(50);

    await Message.updateMany(
      { recipientId: req.userId, senderId: friendId, read: false },
      { read: true }
    );
    res.status(200).json(messages);
  } catch (err) {
    console.error('Messages Route: Error fetching messages:', err.message);
    return sendError(res, err, 'messages');
  }
});

// Send a new message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    const recipient = await User.findById(recipientObjectId);
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new Message({
      senderId: userId,
      recipientId: recipientObjectId,
      content: content.trim(),
    });

    await message.save();
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'username name profilePicture')
      .lean();
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Messages Route: Error sending message:', err.message);
    return sendError(res, err, 'messages');
  }
});

module.exports = router;