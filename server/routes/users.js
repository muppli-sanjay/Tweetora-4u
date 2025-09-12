const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const User = require('../models/user');
const Message = require('../models/message');
const router = express.Router();

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../Uploads');
const profileUploadDir = path.join(__dirname, '../profile_upload');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(profileUploadDir, { recursive: true });

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in profile_upload directory for consistency
    cb(null, profileUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only .jpg, .jpeg, or .png files are allowed!'));
  },
});

// JWT Verification Middleware
const verifyToken = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error('Users: No Authorization header provided');
      return res.status(401).json({ message: 'Access denied: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Users: Invalid Authorization header format:', authHeader);
      return res.status(401).json({ message: 'Access denied: Invalid token format' });
    }

    // Verify the token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Users: Token verified successfully for user:', decoded.id);
      req.userId = decoded.id;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.error('Users: Token expired');
        return res.status(401).json({ message: 'Session expired. Please log in again.', expired: true });
      }
      console.error('Users: Invalid token:', err.message);
      return res.status(401).json({ message: 'Invalid token', error: err.message });
    }
  } catch (err) {
    console.error('Users: Error in verifyToken middleware:', err.message);
    return res.status(500).json({ message: 'Authentication error', error: err.message });
  }
};

// Get all users (excluding current user)
router.get('/all', verifyToken, async (req, res) => {
  try {
    console.log('Users: Fetching all users for userId:', req.userId);
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      console.error('Users: Invalid userId:', req.userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const userId = new mongoose.Types.ObjectId(req.userId);
    const users = await User.find({ _id: { $ne: userId } })
      .select('_id username name profilePicture')
      .lean();
    console.log('Users: All users found:', users.length);
    res.status(200).json(users);
  } catch (err) {
    console.error('Users: Error fetching all users:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get random users (excluding current user and friends)
router.get('/random', verifyToken, async (req, res) => {
  try {
    console.log('Users: Fetching random users for userId:', req.userId);
    if (!mongoose.Types.ObjectId.isValid(req.userId)) {
      console.error('Users: Invalid userId:', req.userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const userId = new mongoose.Types.ObjectId(req.userId);
    const currentUser = await User.findById(userId).select('friends');
    if (!currentUser) {
      console.error('Users: Current user not found:', req.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    const excludeIds = [userId, ...currentUser.friends];
    const users = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $sample: { size: 5 } },
      { $project: { _id: 1, username: 1, name: 1, profilePicture: 1 } },
    ]);
    console.log('Users: Random users found:', users.length);
    res.status(200).json(users);
  } catch (err) {
    console.error('Users: Error fetching random users:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get user by ID (or 'me' for current user)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    let { id } = req.params;
    console.log('Users: Fetching user by ID:', id, 'for requester:', req.userId);
    
    // Handle "me" parameter
    if (id === 'me') {
      id = req.userId;
      console.log('Users: Resolved "me" to user ID:', id);
    }
    
    // Validate the ID format
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      console.error('Users: Invalid or missing user ID:', id);
      return res.status(400).json({ message: 'Invalid or missing user ID' });
    }
    
    // Convert to ObjectId for MongoDB query
    const objectId = new mongoose.Types.ObjectId(id);
    
    // Query the database
    const user = await User.findById(objectId)
      .select('-password')
      .populate('friends', '_id username name profilePicture')
      .populate('friendRequests.senderId', '_id username name profilePicture')
      .lean();
    
    // Check if user exists
    if (!user) {
      console.error('Users: User not found:', id);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Process the user data for response
    const userData = {
      _id: user._id.toString(),
      username: user.username || 'Unknown',
      name: user.name || 'No name provided',
      email: user.email || 'No email provided',
      profilePicture: user.profilePicture || '',
      bio: user.bio || 'No bio provided',
      dob: user.dob || null,
      friends: Array.isArray(user.friends) ? user.friends : [],
      friendRequests: Array.isArray(user.friendRequests) ? user.friendRequests : [],
    };
    
    console.log('Users: User fetched successfully:', userData.username);
    res.status(200).json(userData);
  } catch (err) {
    console.error('Users: Error fetching user by ID:', {
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Update user profile
router.put('/:id', verifyToken, upload.single('profilePicture'), async (req, res) => {
  try {
    console.log('Users: Received update request for user:', req.params.id);
    console.log('Users: Request body:', req.body);
    console.log('Users: Uploaded file:', req.file ? {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'none');

    const { id } = req.params;
    if (id !== req.userId) {
      console.error('Users: Unauthorized update attempt:', { userId: req.userId, targetId: id });
      return res.status(403).json({ message: 'Unauthorized: You can only update your own profile' });
    }

    const updateData = {};
    const { username, name, bio, dob } = req.body || {};

    if (!username || !name) {
      console.error('Users: Username and name are required');
      return res.status(400).json({ message: 'Username and name are required' });
    }

    updateData.username = username;
    updateData.name = name;
    updateData.bio = bio || '';
    if (dob) {
      updateData.dob = new Date(dob);
    }

    if (req.file) {
      // Ensure consistent path format
      updateData.profilePicture = `/profile_upload/${req.file.filename}`;
      console.log('Users: Profile picture uploaded:', updateData.profilePicture);
    }

    console.log('Users: Update data:', updateData);
    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) {
      console.error('Users: User not found:', id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Users: User updated:', user.username);
    res.status(200).json(user);
  } catch (err) {
    console.error('Users: Error updating user:', err.message);
    if (err.message.includes('Only .jpg, .jpeg, or .png files are allowed')) {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 5MB limit.' });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Send friend request
router.post('/:userId/friend-request', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Users: Sending friend request to userId:', userId, 'from:', req.userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Users: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const recipientId = new mongoose.Types.ObjectId(userId);
    const senderId = new mongoose.Types.ObjectId(req.userId);

    if (recipientId.equals(senderId)) {
      console.error('Users: Cannot send friend request to self:', userId);
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientId);

    if (!sender || !recipient) {
      console.error('Users: User not found:', !sender ? senderId : recipientId);
      return res.status(404).json({ message: 'User not found' });
    }

    if (sender.friends.includes(recipientId) || recipient.friends.includes(senderId)) {
      console.error('Users: Already friends:', senderId, recipientId);
      return res.status(400).json({ message: 'Already friends' });
    }

    const existingRequest = recipient.friendRequests.find(
      (req) => req.senderId.equals(senderId) && req.status === 'pending'
    );
    if (existingRequest) {
      console.error('Users: Friend request already sent:', senderId, recipientId);
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    recipient.friendRequests.push({ senderId });
    await recipient.save({ validateBeforeSave: true });

    console.log('Users: Friend request sent from', senderId, 'to', recipientId);
    res.status(200).json({ message: 'Friend request sent successfully' });
  } catch (err) {
    console.error('Users: Error sending friend request:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get pending friend requests
router.get('/friend-requests/pending', verifyToken, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    console.log('Users: Fetching pending friend requests for userId:', userId);
    const user = await User.findById(userId)
      .select('friendRequests')
      .populate('friendRequests.senderId', '_id username name profilePicture');
    if (!user) {
      console.error('Users: User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }
    const pendingRequests = user.friendRequests.filter((req) => req.status === 'pending');
    console.log('Users: Pending friend requests count:', pendingRequests.length);
    res.status(200).json(pendingRequests);
  } catch (err) {
    console.error('Users: Error fetching pending friend requests:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Accept or reject friend request
router.post('/friend-requests/:senderId', verifyToken, async (req, res) => {
  try {
    const { senderId } = req.params;
    let { action } = req.body;
    console.log('Users: Processing friend request from senderId:', senderId, 'action:', action);
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      console.error('Users: Invalid sender ID:', senderId);
      return res.status(400).json({ message: 'Invalid sender ID' });
    }

    if (action === 'accept') action = 'accepted';
    if (action === 'reject') action = 'rejected';
    if (!['accepted', 'rejected'].includes(action)) {
      console.error('Users: Invalid action:', action);
      return res.status(400).json({ message: 'Invalid action' });
    }

    const recipientId = new mongoose.Types.ObjectId(req.userId);
    const senderObjectId = new mongoose.Types.ObjectId(senderId);

    const recipient = await User.findById(recipientId);
    const sender = await User.findById(senderObjectId);

    if (!recipient || !sender) {
      console.error('Users: User not found:', !recipient ? recipientId : senderObjectId);
      return res.status(404).json({ message: 'User not found' });
    }

    const request = recipient.friendRequests.find(
      (req) => req.senderId.equals(senderObjectId) && req.status === 'pending'
    );
    if (!request) {
      console.error('Users: Friend request not found:', senderId);
      return res.status(404).json({ message: 'Friend request not found' });
    }

    request.status = action;

    if (action === 'accepted') {
      recipient.friends.push(senderObjectId);
      sender.friends.push(recipientId);
      await sender.save();
    }

    await recipient.save();
    console.log('Users: Friend request from', senderId, action, 'by', recipientId);
    res.status(200).json({ message: `Friend request ${action} successfully` });
  } catch (err) {
    console.error('Users: Error processing friend request:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Remove friend
router.delete('/:userId/friends', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Users: Removing friend userId:', userId, 'for:', req.userId);
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Users: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const friendId = new mongoose.Types.ObjectId(userId);
    const currentUserId = new mongoose.Types.ObjectId(req.userId);

    if (friendId.equals(currentUserId)) {
      console.error('Users: Cannot remove yourself:', userId);
      return res.status(400).json({ message: 'Cannot remove yourself' });
    }

    const currentUser = await User.findById(currentUserId);
    const friend = await User.findById(friendId);

    if (!currentUser || !friend) {
      console.error('Users: User not found:', !currentUser ? currentUserId : friendId);
      return res.status(404).json({ message: 'User not found' });
    }

    if (!currentUser.friends.includes(friendId) || !friend.friends.includes(currentUserId)) {
      console.error('Users: Not friends:', currentUserId, friendId);
      return res.status(400).json({ message: 'Not friends' });
    }

    currentUser.friends = currentUser.friends.filter((id) => !id.equals(friendId));
    friend.friends = friend.friends.filter((id) => !id.equals(currentUserId));

    await currentUser.save();
    await friend.save();

    console.log('Users: Friendship removed between', currentUserId, 'and', friendId);
    res.status(200).json({ message: 'Friend removed successfully' });
  } catch (err) {
    console.error('Users: Error removing friend:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Send message to a friend
router.post('/messages', verifyToken, async (req, res) => {
  try {
    const { recipientId, content } = req.body;
    console.log('Users: Sending message from:', req.userId, 'to:', recipientId);
    if (!mongoose.Types.ObjectId.isValid(recipientId)) {
      console.error('Users: Invalid recipient ID:', recipientId);
      return res.status(400).json({ message: 'Invalid recipient ID' });
    }
    if (!content || typeof content !== 'string' || content.trim() === '') {
      console.error('Users: Invalid message content:', content);
      return res.status(400).json({ message: 'Message content is required' });
    }

    const senderId = new mongoose.Types.ObjectId(req.userId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);

    if (senderId.equals(recipientObjectId)) {
      console.error('Users: Cannot send message to self:', recipientId);
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const sender = await User.findById(senderId);
    const recipient = await User.findById(recipientObjectId);

    if (!sender || !recipient) {
      console.error('Users: User not found:', !sender ? senderId : recipientId);
      return res.status(404).json({ message: 'User not found' });
    }

    if (!sender.friends.includes(recipientObjectId) || !recipient.friends.includes(senderId)) {
      console.error('Users: Not friends:', senderId, recipientId);
      return res.status(400).json({ message: 'You can only message friends' });
    }

    const message = new Message({
      senderId,
      recipientId: recipientObjectId,
      content: content.trim(),
    });
    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', '_id username name profilePicture')
      .populate('recipientId', '_id username name profilePicture')
      .lean();

    console.log('Users: Message sent from', senderId, 'to', recipientId);
    res.status(200).json({ message: 'Message sent successfully', message: populatedMessage });
  } catch (err) {
    console.error('Users: Error sending message:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get messages with a friend
router.get('/messages/:friendId', verifyToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    console.log('Users: Fetching messages between:', req.userId, 'and:', friendId);
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
      console.error('Users: Invalid friend ID:', friendId);
      return res.status(400).json({ message: 'Invalid friend ID' });
    }

    const userId = new mongoose.Types.ObjectId(req.userId);
    const friendObjectId = new mongoose.Types.ObjectId(friendId);

    const user = await User.findById(userId);
    if (!user || !user.friends.includes(friendObjectId)) {
      console.error('Users: Not friends or user not found:', userId, friendId);
      return res.status(400).json({ message: 'You can only view messages with friends' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, recipientId: friendObjectId },
        { senderId: friendObjectId, recipientId: userId },
      ],
    })
      .sort({ timestamp: 1 })
      .populate('senderId', '_id username name profilePicture')
      .populate('recipientId', '_id username name profilePicture')
      .lean();

    console.log('Users: Messages fetched:', messages.length);
    res.status(200).json(messages);
  } catch (err) {
    console.error('Users: Error fetching messages:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;