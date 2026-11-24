const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'friend_request', 'friend_accept', 'message'],
    required: true,
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: function() { return ['like', 'comment'].includes(this.type); },
  },
  content: {
    type: String,
    required: function() { return this.type === 'comment'; },
  },
  // Only used by friend_request: where this particular request stands
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model('Notification', NotificationSchema);