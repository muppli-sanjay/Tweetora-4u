const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Message = require('../models/message');
const User = require('../models/user');
const router = express.Router();

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('Messages Route: No token provided');
    return res.status(401).json({ message: 'Access denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Messages Route: Decoded token:', decoded);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error('Messages Route: Token verification error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get unread message notifications
router.get('/notifications', verifyToken, async (req, res) => {
  console.log('Messages Route: Fetching message notifications for userId:', req.userId);
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

    console.log('Messages Route: Messages fetched:', JSON.stringify(messages, null, 2));
    console.log('Messages Route: Messages count:', messages.length);
    res.status(200).json(messages);
  } catch (err) {
    console.error('Messages Route: Error fetching notifications:', err.message);
    console.error('Messages Route: Error details:', JSON.stringify(err, null, 2));
    res.status(500).json({ message: 'Server error while fetching notifications.' });
  }
});

// Mark all messages as read
router.post('/mark-read', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    console.log(`Messages Route: Marking messages as read for user ${userId}`);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Messages Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Message.updateMany(
      { recipientId: userId, read: false },
      { $set: { read: true } }
    );

    console.log('Messages Route: Messages marked as read');
    res.status(200).json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Messages Route: Error marking messages as read:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error while marking messages as read', error: err.message });
  }
});

// Get messages between two users
router.get('/:friendId', verifyToken, async (req, res) => {
  const { friendId } = req.params;
  console.log(`Messages Route: Fetching messages between user ${req.userId} and friend ${friendId}`);
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

    console.log('Messages Route: Found messages:', messages.length);
    await Message.updateMany(
      { recipientId: req.userId, senderId: friendId, read: false },
      { read: true }
    );
    res.status(200).json(messages);
  } catch (err) {
    console.error('Messages Route: Error fetching messages:', err.message);
    res.status(500).json({ message: 'Server error while fetching messages.' });
  }
});

// Send a new message
router.post('/', verifyToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    console.log(`Messages Route: Sending message from ${req.userId} to ${recipientId}`);
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      console.log('Messages Route: Invalid recipient ID:', recipientId);
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      console.log('Messages Route: Invalid message content:', content);
      return res.status(400).json({ message: 'Message content is required' });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    const recipient = await User.findById(recipientObjectId);
    if (!recipient) {
      console.log('Messages Route: Recipient not found:', recipientId);
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = new Message({
      senderId: userId,
      recipientId: recipientObjectId,
      content: content.trim(),
    });

    await message.save();
    console.log('Messages Route: Message saved:', message);
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'username name profilePicture')
      .lean();
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Messages Route: Error sending message:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;