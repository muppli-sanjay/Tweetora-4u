import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/authContext';
import axios from 'axios';
import Post from '../post/Post';
import './posts.scss';

const Posts = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) {
        throw new Error('No authentication token found. Please log in.');
      }
      console.log('Posts: Fetching posts');
      const res = await axios.get('http://localhost:5000/api/posts', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const mappedPosts = res.data.map((post) => {
        let userId = post.userId;
        if (userId && typeof userId === 'object') {
          userId = {
            _id: String(userId._id),
            username: userId.username || 'Unknown',
            name: userId.name || 'Unknown',
            profilePicture: userId.profilePicture || '',
          };
        } else if (userId) {
          userId = {
            _id: String(userId),
            username: 'Unknown',
            name: post.name || 'Unknown',
            profilePicture: post.profilePicture || '',
          };
        }
        
        return {
          ...post,
          media: post.image,
          desc: post.description || post.desc,
        };
      });
      
      console.log('Posts: Fetched posts:', mappedPosts.length);
      setPosts(mappedPosts || []);
    } catch (err) {
      console.error('Posts: Error fetching posts:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPostDetails = async (postId) => {
    try {
      if (!accessToken) {
        throw new Error('No authentication token found.');
      }
      console.log(`Posts: Fetching details for post ${postId}`);
      const res = await axios.get(`http://localhost:5000/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`Posts: Fetched post details for ${postId}:`, res.data);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: res.data.likes,
                likesCount: res.data.likesCount,
                comments: res.data.comments,
                commentsCount: res.data.commentsCount,
                likedBy: res.data.likes.map(user => String(user._id)),
              }
            : post
        )
      );
    } catch (err) {
      console.error('Posts: Error fetching post details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.message || 'Failed to load post details');
    }
  };

  const handleLike = async (postId) => {
    try {
      if (!accessToken || !currentUser || !currentUser._id) {
        throw new Error('No authentication token or user ID found.');
      }
      
      const userId = String(currentUser._id);
      console.log(`Posts: Liking post ${postId} with userId: ${userId}`);
      
      const res = await axios.post(
        `http://localhost:5000/api/posts/${postId}/like`,
        { userId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log(`Posts: Like response for post ${postId}:`, res.data);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likes: res.data.likes,
                likesCount: res.data.likesCount,
                likedBy: res.data.likedBy,
              }
            : post
        )
      );
    } catch (err) {
      console.error('Posts: Error toggling like:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.message || 'Failed to like post');
    }
  };

  const handleCommentSubmit = (postId, commentData) => {
    setPosts((prev) =>
      prev.map((post) =>
        post._id === postId
          ? {
              ...post,
              comments: commentData.comments,
              commentsCount: commentData.commentsCount,
            }
          : post
      )
    );
  };

  useEffect(() => {
    if (accessToken && currentUser) {
      console.log('Current user in Posts:', {
        id: currentUser._id,
        idType: typeof currentUser._id,
        username: currentUser.username,
        accessToken: accessToken ? 'Present' : 'Missing',
      });
      fetchPosts();
    } else {
      console.warn('Posts: Missing auth data:', {
        accessToken: !!accessToken,
        currentUser: !!currentUser,
      });
      setError('Please log in to view posts');
    }

    const handleNewPost = () => {
      console.log('Posts: New post event received');
      fetchPosts();
    };
    window.addEventListener('newPost', handleNewPost);
    return () => window.removeEventListener('newPost', handleNewPost);
  }, [accessToken, currentUser]);

  if (loading) return <div className="posts">Loading posts...</div>;
  if (error) return <div className="posts error">{error}</div>;

  return (
    <div className="posts">
      {posts.length > 0 ? (
        posts.map((post) => (
          <Post
            key={post._id}
            post={post}
            onLike={handleLike}
            onCommentSubmit={handleCommentSubmit}
          />
        ))
      ) : (
        <div className="no-posts">No posts to display.</div>
      )}
    </div>
  );
};

export default Posts;