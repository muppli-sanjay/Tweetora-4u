const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/post');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const verifyToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure Uploads directory exists
const uploadDir = path.join(__dirname, '../Uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(null, false);
    }
    const filetypes = /jpeg|jpg|png|gif|mp4|mov/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF) and videos (MP4, MOV) are allowed!'));
  },
});

// Multer error middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Posts Route: Multer error:', {
      code: err.code,
      message: err.message,
      field: err.field,
    });
    return res.status(400).json({ message: `Multer error: ${err.message}` });
  }
  if (err.message.includes('Only images')) {
    console.error('Posts Route: File type error:', err.message);
    return res.status(400).json({ message: err.message });
  }
  console.error('Posts Route: Unexpected error:', err.message);
  res.status(500).json({ message: 'Server error', error: err.message });
};

// Debug middleware to log request body and headers
const logRequest = (req, res, next) => {
  console.log('Posts Route: Request method:', req.method);
  console.log('Posts Route: Request path:', req.path);
  console.log('Posts Route: Request headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? 'Bearer [token]' : 'Missing',
    'content-length': req.headers['content-length']
  });
  
  if (!req.headers['content-type']?.includes('multipart/form-data')) {
    console.log('Posts Route: Request body:', req.body);
  } else {
    console.log('Posts Route: Multipart form data received');
  }
  
  next();
};

// POST /api/posts - Create a new post
router.post('/', verifyToken, logRequest, upload.single('image'), async (req, res) => {
  try {
    const { userId, name, profilePicture, description, location, taggedFriends } = req.body;

    console.log('Posts Route: Creating post with data:', {
      userId,
      name: name || '[not provided]',
      description: description || '[not provided]', 
      location: location || '[not provided]',
      taggedFriends: taggedFriends || '[not provided]',
      file: req.file ? {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
      } : 'No file uploaded'
    });

    // Validate userId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Posts Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // Parse taggedFriends
    let parsedTaggedFriends = [];
    if (taggedFriends) {
      try {
        parsedTaggedFriends = typeof taggedFriends === 'string' ? JSON.parse(taggedFriends) : taggedFriends;
        if (!Array.isArray(parsedTaggedFriends)) {
          throw new Error('taggedFriends must be an array');
        }
        // Validate each tagged friend ID
        parsedTaggedFriends.forEach((id) => {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid tagged friend ID: ${id}`);
          }
        });
      } catch (err) {
        console.error('Posts Route: Invalid taggedFriends format:', taggedFriends, err.message);
        return res.status(400).json({ message: 'Invalid taggedFriends format' });
      }
    }

    // Validate content
    if (!description && !req.file && !location && (!parsedTaggedFriends || parsedTaggedFriends.length === 0)) {
      console.error('Posts Route: No content provided for post');
      return res.status(400).json({ message: 'Please provide a description, image/video, location, or tagged friends.' });
    }

    // Prepare post data
    const postData = {
      userId,
      name: name || '',
      profilePicture: profilePicture || '',
      description: description || '',
      location: location || '',
      taggedFriends: parsedTaggedFriends || [],
    };

    if (req.file) {
      postData.image = `/Uploads/${req.file.filename}`;
      console.log('Posts Route: Image uploaded:', postData.image);
    }

    // Create and save post
    const post = new Post(postData);
    await post.save();

    // Return the post without population for faster response
    console.log('Posts Route: Post created with ID:', post._id);
    res.status(201).json(post);
    
  } catch (err) {
    console.error('Posts Route: Error creating post:', err.message, err.stack);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds the limit.' });
    }
    res.status(500).json({ message: 'Server error while creating post.', error: err.message });
  }
}, handleMulterError);

// GET /api/posts - Fetch all posts
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log(`Posts Route: Fetching posts for user ${req.userId}`);
    
    // Fetch all posts with proper validation
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'username name profilePicture')
      .populate('taggedFriends', 'username name profilePicture')
      .populate('likes', 'username name profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'username name profilePicture' },
      })
      .lean();
      
    // Filter out any posts with invalid references after fetching
    const validPosts = posts.filter(post => {
      // Check if userId is valid
      const validUserId = post.userId && mongoose.Types.ObjectId.isValid(post.userId._id || post.userId);
      
      // Check if all taggedFriends are valid
      const validTaggedFriends = !post.taggedFriends || 
        (Array.isArray(post.taggedFriends) && 
         post.taggedFriends.every(friend => 
           friend && mongoose.Types.ObjectId.isValid(friend._id || friend)
         ));
      
      return validUserId && validTaggedFriends;
    });
    
    // Add likesCount and commentsCount to each post
    const postsWithCounts = validPosts.map(post => ({
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0
    }));

    console.log(`Posts Route: Found ${postsWithCounts.length} valid posts out of ${posts.length} total`);
    res.status(200).json(postsWithCounts);
  } catch (err) {
    console.error('Posts Route: Error fetching posts:', err.message, err.stack);
    res.status(500).json({ message: 'Server error while fetching posts.', error: err.message });
  }
});

// GET /api/posts/:postId - Fetch a specific post
router.get('/:postId', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    console.log(`Posts Route: Fetching post ${postId} for user ${req.userId}`);

    // Validate postId
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error('Posts Route: Invalid post ID:', postId);
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const post = await Post.findById(postId)
      .populate('userId', 'username name profilePicture')
      .populate('taggedFriends', 'username name profilePicture')
      .populate('likes', 'username name profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'username name profilePicture' },
      })
      .lean();

    if (!post) {
      console.error('Posts Route: Post not found:', postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    // Add likesCount and commentsCount
    const postWithCounts = {
      ...post,
      likesCount: post.likes ? post.likes.length : 0,
      commentsCount: post.comments ? post.comments.length : 0
    };

    console.log(`Posts Route: Fetched post ${postId}`);
    res.status(200).json(postWithCounts);
  } catch (err) {
    console.error('Posts Route: Error fetching post:', err.message, err.stack);
    res.status(500).json({ message: 'Server error while fetching post.', error: err.message });
  }
});

// POST /api/posts/:postId/like - Toggle like on a post
router.post('/:postId/like', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

    console.log(`Posts Route: Toggling like for post ${postId} by user ${userId}`);

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error('Posts Route: Invalid post ID:', postId);
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Posts Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      console.error('Posts Route: Post not found:', postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const isLiked = post.likes.includes(userObjectId);

    if (isLiked) {
      post.likes = post.likes.filter(id => !id.equals(userObjectId));
    } else {
      post.likes.push(userObjectId);
      // Create notification for post owner (if not liking own post)
      if (String(post.userId) !== String(userId)) {
        const notification = new Notification({
          recipientId: post.userId,
          senderId: userId,
          type: 'like',
          postId,
        });
        await notification.save();
        console.log(`Posts Route: Created like notification for user ${post.userId}`);
      }
    }

    await post.save();

    // Populate likes for response
    const updatedPost = await Post.findById(postId)
      .populate('likes', 'username name profilePicture')
      .lean();

    console.log(`Posts Route: Like toggled, new likes count: ${post.likes.length}`);
    res.status(200).json({
      message: isLiked ? 'Post unliked' : 'Post liked',
      likesCount: post.likes.length,
      likes: updatedPost.likes,
      likedBy: updatedPost.likes.map(user => user._id)
    });
  } catch (err) {
    console.error('Posts Route: Error toggling like:', {
      message: err.message,
      stack: err.stack,
      postId: req.params.postId,
      userId: req.body.userId
    });
    res.status(500).json({ message: 'Server error while toggling like', error: err.message });
  }
});

// POST /api/posts/:postId/comment - Add a comment to a post
router.post('/:postId/comment', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content } = req.body;

    console.log(`Posts Route: Adding comment to post ${postId} by user ${userId}, content: ${content}`);

    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      console.error('Posts Route: Invalid post ID:', postId);
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Posts Route: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.error('Posts Route: Invalid comment content:', content);
      return res.status(400).json({ message: 'Comment content is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      console.error('Posts Route: Post not found:', postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = new Comment({
      userId,
      postId,
      content: content.trim(),
    });

    await comment.save();

    post.comments.push(comment._id);
    await post.save();

    // Create notification for post owner (if not commenting on own post)
    if (String(post.userId) !== String(userId)) {
      const notification = new Notification({
        recipientId: post.userId,
        senderId: userId,
        type: 'comment',
        postId,
        content: content.trim(),
      });
      await notification.save();
      console.log(`Posts Route: Created comment notification for user ${post.userId}`);
    }

    // Populate userId in the comment for response
    const populatedComment = await Comment.findById(comment._id)
      .populate('userId', 'username name profilePicture')
      .lean();

    // Fetch updated comments
    const updatedPost = await Post.findById(postId)
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'username name profilePicture' },
      })
      .lean();

    console.log(`Posts Route: Comment added, comment ID: ${comment._id}`);
    res.status(201).json({
      message: 'Comment added',
      commentsCount: post.comments.length,
      comments: updatedPost.comments,
      newComment: populatedComment
    });
  } catch (err) {
    console.error('Posts Route: Error adding comment:', {
      message: err.message,
      stack: err.stack,
      postId: req.params.postId,
      userId: req.body.userId,
      content: req.body.content
    });
    res.status(500).json({ message: 'Server error while adding comment', error: err.message });
  }
});

module.exports = router;