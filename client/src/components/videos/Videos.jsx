import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/authContext';
import api from '../../api/axios';
import Post from '../post/Post';
import './videos.scss';

const Videos = () => {
  const { accessToken } = useContext(AuthContext);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getMediaType = (mediaUrl) => {
    if (!mediaUrl) return null;
    const ext = mediaUrl.split('.').pop().toLowerCase();
    if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
    return null;
  };

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) {
        throw new Error('No authentication token found. Please log in.');
      }
      const res = await api.get('/posts', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const videoPosts = res.data
        .filter((post) => getMediaType(post.image) === 'video')
        .map((post) => ({
          ...post,
          media: post.image, // Map image to media
          desc: post.description || post.desc, // Map description to desc
        }));
      setVideos(videoPosts);
    } catch (err) {
      console.error('Videos: Error fetching posts:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.message || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchVideos();
    } else {
      setError('Please log in to view videos');
      setLoading(false);
    }

    const handleNewPost = () => {
      fetchVideos();
    };
    window.addEventListener('newPost', handleNewPost);
    return () => window.removeEventListener('newPost', handleNewPost);
  }, [accessToken]);

  return (
    <div className="videos">
      {loading && <p className="loading">Loading videos...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && videos.length === 0 ? (
        <p className="no-videos">No videos available</p>
      ) : (
        videos.map((post) => <Post key={post._id} post={post} />)
      )}
    </div>
  );
};

export default Videos;