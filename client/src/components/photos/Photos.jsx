import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/authContext';
import api from '../../api/axios';
import Post from '../post/Post';
import './photos.scss';

const Photos = () => {
  const { accessToken } = useContext(AuthContext);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getMediaType = (mediaUrl) => {
    if (!mediaUrl) return null;
    const ext = mediaUrl.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    return null;
  };

  const fetchPhotos = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!accessToken) {
        throw new Error('No authentication token found. Please log in.');
      }
      const res = await api.get('/posts', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const imagePosts = res.data
        .filter((post) => getMediaType(post.image) === 'image')
        .map((post) => ({
          ...post,
          media: post.image, // Map image to media
          desc: post.description || post.desc, // Map description to desc
        }));
      setPhotos(imagePosts);
    } catch (err) {
      console.error('Photos: Error fetching posts:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.message || 'Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchPhotos();
    } else {
      setError('Please log in to view photos');
      setLoading(false);
    }

    const handleNewPost = () => {
      fetchPhotos();
    };
    window.addEventListener('newPost', handleNewPost);
    return () => window.removeEventListener('newPost', handleNewPost);
  }, [accessToken]);

  return (
    <div className="photos">
      {loading && <p className="loading">Loading photos...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && photos.length === 0 ? (
        <p className="no-photos">No photos available</p>
      ) : (
        photos.map((post) => <Post key={post._id} post={post} />)
      )}
    </div>
  );
};

export default Photos;
