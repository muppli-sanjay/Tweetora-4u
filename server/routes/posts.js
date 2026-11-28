const express = require('express');
const { sendError } = require('../utils/errors');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
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
  fileFilter: (req, file, cb) => {
    if (!file) {
      return cb(null, false);
    }
    const extname = /^\.(jpe?g|png|gif|webp|mp4|mov|mp3|wav|ogg|m4a|aac)$/.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /^(image|video|audio)\//.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (JPEG, PNG, GIF, WebP), videos (MP4, MOV) and audio (MP3, WAV, OGG, M4A, AAC) are allowed!'));
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
    return sendError(res, err, 'posts upload');
  }
  if (err.message.includes('Only images')) {
    console.error('Posts Route: File type error:', err.message);
    return res.status(400).json({ message: err.message });
  }
  console.error('Posts Route: Unexpected error:', err.message);
  return sendError(res, err, 'posts');
};

// POST /api/posts - Create a new post
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    // if the post is rejected, don't keep the uploaded file on disk
    res.on('finish', () => {
      if (req.file && res.statusCode >= 400) fs.unlink(req.file.path, () => {});
    });
    const { userId, name, profilePicture, description, location, taggedFriends } = req.body;

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
    }

    // Create and save post
    const post = new Post(postData);
    await post.save();

    // Return the post without population for faster response
    res.status(201).json(post);

  } catch (err) {
    console.error('Posts Route: Error creating post:', err.message, err.stack);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds the limit.' });
    }
    return sendError(res, err, 'posts');
  }
}, handleMulterError);

const withCounts = (post) => ({
  ...post,
  likesCount: post.likes ? post.likes.length : 0,
  commentsCount: post.comments ? post.comments.length : 0,
  likedBy: (post.likes || []).map((u) => String(u._id || u)),
});

const User = require('../models/User');

// Standard population used by every feed-style endpoint
const populatePost = (query) =>
  query
    .populate('userId', 'username name profilePicture')
    .populate('taggedFriends', 'username name profilePicture')
    .populate('likes', 'username name profilePicture')
    .populate({
      path: 'comments',
      populate: { path: 'userId', select: 'username name profilePicture' },
    });

// Adds counts plus a per-viewer `bookmarked` flag
const decorate = async (posts, viewerId) => {
  const viewer = await User.findById(viewerId).select('bookmarks').lean();
  const saved = new Set(((viewer && viewer.bookmarks) || []).map(String));
  return posts
    .filter((p) => p.userId)
    .map((p) => ({ ...withCounts(p), bookmarked: saved.has(String(p._id)) }));
};

// GET /api/posts/liked - posts the current user has liked
router.get('/liked', verifyToken, async (req, res) => {
  try {
    const posts = await populatePost(Post.find({ likes: req.userId }).sort({ createdAt: -1 })).lean();
    res.json(await decorate(posts, req.userId));
  } catch (err) {
    return sendError(res, err, 'posts');
  }
});

// GET /api/posts/commented - posts the current user has commented on
router.get('/commented', verifyToken, async (req, res) => {
  try {
    const ids = await Comment.distinct('postId', { userId: req.userId });
    const posts = await populatePost(Post.find({ _id: { $in: ids } }).sort({ createdAt: -1 })).lean();
    res.json(await decorate(posts, req.userId));
  } catch (err) {
    return sendError(res, err, 'posts');
  }
});

// GET /api/posts/bookmarked - posts the current user has saved (most recently saved first)
router.get('/bookmarked', verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.userId).select('bookmarks').lean();
    const order = ((me && me.bookmarks) || []).map(String);
    const posts = await populatePost(Post.find({ _id: { $in: order } })).lean();
    posts.sort((a, b) => order.indexOf(String(b._id)) - order.indexOf(String(a._id)));
    res.json(await decorate(posts, req.userId));
  } catch (err) {
    return sendError(res, err, 'posts');
  }
});

// POST /api/posts/:postId/bookmark - toggle bookmark for the current user
router.post('/:postId/bookmark', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    if (!(await Post.exists({ _id: postId }))) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const me = await User.findById(req.userId).select('bookmarks');
    const already = me.bookmarks.some((id) => String(id) === postId);
    await User.updateOne(
      { _id: req.userId },
      already ? { $pull: { bookmarks: postId } } : { $addToSet: { bookmarks: postId } }
    );
    res.json({ bookmarked: !already });
  } catch (err) {
    return sendError(res, err, 'posts');
  }
});

// GET /api/posts/tagged/:userId - posts in which a user has been tagged
router.get('/tagged/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const posts = await populatePost(Post.find({ taggedFriends: userId }).sort({ createdAt: -1 })).lean();
    res.json(await decorate(posts, req.userId));
  } catch (err) {
    return sendError(res, err, 'posts');
  }
});

// GET /api/posts/user/:userId - Fetch all posts written by one user
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const posts = await Post.find({ userId })
      .sort({ createdAt: -1 })
      .populate('userId', 'username name profilePicture')
      .populate('taggedFriends', 'username name profilePicture')
      .populate('likes', 'username name profilePicture')
      .populate({
        path: 'comments',
        populate: { path: 'userId', select: 'username name profilePicture' },
      })
      .lean();
    res.status(200).json(await decorate(posts, req.userId));
  } catch (err) {
    console.error('Posts Route: Error fetching user posts:', err.message);
    return sendError(res, err, 'posts');
  }
});

// GET /api/posts - Fetch all posts
router.get('/', verifyToken, async (req, res) => {
  try {
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

    // Add likesCount, commentsCount and likedBy to each post
    const postsWithCounts = await decorate(validPosts, req.userId);

    res.status(200).json(postsWithCounts);
  } catch (err) {
    console.error('Posts Route: Error fetching posts:', err.message, err.stack);
    return sendError(res, err, 'posts');
  }
});

// GET /api/posts/:postId - Fetch a specific post
router.get('/:postId', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

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

    const [postWithCounts] = await decorate([post], req.userId);

    res.status(200).json(postWithCounts);
  } catch (err) {
    console.error('Posts Route: Error fetching post:', err.message, err.stack);
    return sendError(res, err, 'posts');
  }
});

// DELETE /api/posts/:postId - delete a post (author only)
router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (String(post.userId) !== req.userId) {
      return res.status(403).json({ message: 'You can only delete your own posts' });
    }

    await Promise.all([
      Comment.deleteMany({ postId }),
      Notification.deleteMany({ postId }),
      User.updateMany({ bookmarks: postId }, { $pull: { bookmarks: postId } }),
      Post.deleteOne({ _id: postId }),
    ]);

    // remove the uploaded media file as well (best effort)
    if (post.image && post.image.startsWith('/Uploads/')) {
      fs.unlink(path.join(uploadDir, path.basename(post.image)), () => {});
    }
    res.json({ message: 'Post deleted', postId });
  } catch (err) {
    return sendError(res, err, 'posts');
  }
});

// POST /api/posts/:postId/like - Toggle like on a post
router.post('/:postId/like', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;

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
      await Notification.deleteOne({ senderId: userId, postId, type: 'like' });
    } else {
      post.likes.push(userObjectId);
      // Create notification for post owner (if not liking own post)
      if (String(post.userId) !== String(userId)) {
        await Notification.findOneAndUpdate(
          { senderId: userId, postId, type: 'like' },
          { recipientId: post.userId, read: false, createdAt: new Date() },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
    }

    await post.save();

    // Populate likes for response
    const updatedPost = await Post.findById(postId)
      .populate('likes', 'username name profilePicture')
      .lean();

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
    return sendError(res, err, 'posts');
  }
});

// POST /api/posts/:postId/comment - Add a comment to a post
router.post('/:postId/comment', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content } = req.body;

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
    return sendError(res, err, 'posts');
  }
});

module.exports = router;