import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/authContext';
import api from '../../api/axios';
import Post from '../post/Post';
import './posts.scss';

const Posts = ({ endpoint = '/posts', emptyText = 'No posts to display.', removeOnUnbookmark = false }) => {
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
      const res = await api.get(endpoint, {
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

  const handleLike = async (postId) => {
    try {
      if (!accessToken || !currentUser || !currentUser._id) {
        throw new Error('No authentication token or user ID found.');
      }
      
      const userId = String(currentUser._id);
      
      const res = await api.post(
        `/posts/${postId}/like`,
        { userId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
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
      fetchPosts();
    } else {
      setError('Please log in to view posts');
    }

    const handleNewPost = () => {
      fetchPosts();
    };
    window.addEventListener('newPost', handleNewPost);
    return () => window.removeEventListener('newPost', handleNewPost);
  }, [accessToken, currentUser, endpoint]);

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
            onBookmarkChange={removeOnUnbookmark ? (id, on) => { if (!on) setPosts((prev) => prev.filter((p) => p._id !== id)); } : undefined}
          />
        ))
      ) : (
        <div className="no-posts">{emptyText}</div>
      )}
    </div>
  );
};

export default Posts;