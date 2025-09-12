import './profile.scss';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/authContext';
import axios from 'axios';

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { accessToken, currentUser } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsError, setPostsError] = useState(null);

  console.log('Profile: profile id=', id);
  console.log('Profile: accessToken=', accessToken || 'null');
  console.log('Profile: currentUser=', currentUser ? {
    _id: currentUser._id,
    username: currentUser.username,
    name: currentUser.name,
  } : 'null');

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      console.log('Profile: No profile picture provided, using fallback');
      return 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
    }
    if (profilePicture.startsWith('http')) {
      console.log('Profile: Using external profile picture URL:', profilePicture);
      return profilePicture;
    }
    const normalizedPath = profilePicture
      .replace(/^\/(Uploads|profile_upload)\//i, '/profile_upload/')
      .replace(/^\/profile_upload\//i, '/profile_upload/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Profile: Profile picture URL:', url);
    return url;
  };

  const getPostImageUrl = (image) => {
    if (!image) {
      console.log('Profile: No post image provided');
      return '';
    }
    if (image.startsWith('http')) {
      console.log('Profile: Using external post image URL:', image);
      return image;
    }
    const normalizedPath = image
      .replace(/^\/(Uploads|post_upload)\//i, '/post_upload/')
      .replace(/^\/post_upload\//i, '/post_upload/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Profile: Post image URL:', url);
    return url;
  };

  const fetchUser = async () => {
    if (!accessToken || !currentUser) {
      console.log('Profile: Missing accessToken or currentUser, cannot fetch user');
      setError('Please log in to view this profile.');
      setLoading(false);
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.log('Profile: Invalid user ID format:', id);
      setError('Invalid profile ID format. Please check the URL.');
      setLoading(false);
      return;
    }

    try {
      console.log(`Profile: Sending GET request to http://localhost:5000/api/users/${id}`);
      const res = await axios.get(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('Profile: Fetch user response=', {
        status: res.status,
        data: res.data ? 'data received' : 'no data',
      });

      if (!res.data || !res.data._id) {
        console.log('Profile: No valid user data returned');
        setError('No user data found for this ID.');
        setUser(null);
      } else {
        console.log('Profile: Setting user data');
        setUser(res.data);
        setError(null);
      }
    } catch (err) {
      console.error('Profile: Error fetching user:', err.message);
      console.error('Profile: Error details:', {
        status: err.response?.status,
        data: err.response?.data,
      });

      let errorMessage = 'Failed to load profile.';
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = 'Invalid user ID. Please check the URL.';
            break;
          case 401:
            errorMessage = 'Your session has expired. Please log in again.';
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            sessionStorage.removeItem('accessToken');
            sessionStorage.removeItem('user');
            setTimeout(() => navigate('/login'), 2000);
            break;
          case 404:
            errorMessage = 'User not found.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
          default:
            errorMessage = err.response.data?.message || 'Failed to load profile.';
        }
      } else {
        errorMessage = `Network error: ${err.message}`;
      }

      setError(errorMessage);
      setUser(null);
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    if (!accessToken || !currentUser || !id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      console.log('Profile: Skipping posts fetch due to invalid accessToken, currentUser, or id:', { accessToken, currentUser, id });
      setPostsError('Cannot load posts. Please log in or check the profile ID.');
      setPostsLoading(false);
      return;
    }

    try {
      console.log(`Profile: Sending GET request to http://localhost:5000/api/posts/user/${id}`);
      const res = await axios.get(`http://localhost:5000/api/posts/user/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('Profile: Fetch posts response=', {
        status: res.status,
        data: res.data ? `${res.data.length} posts received` : 'no data',
      });

      const validPosts = Array.isArray(res.data) ? res.data.filter((post) => {
        const isValid = post._id &&
                       /^[0-9a-fA-F]{24}$/.test(post._id) &&
                       post.userId &&
                       post.userId._id &&
                       post.description;
        if (!isValid) console.warn('Profile: Invalid post:', post);
        return isValid;
      }) : [];
      setPosts(validPosts);
      setPostsError(null);
    } catch (err) {
      console.error('Profile: Error fetching posts:', err.message);
      console.error('Profile: Error details:', {
        status: err.response?.status,
        data: err.response?.data,
      });

      let errorMessage = 'Failed to load posts.';
      if (err.response) {
        switch (err.response.status) {
          case 400:
            errorMessage = 'Invalid user ID for posts.';
            break;
          case 401:
            errorMessage = 'Your session has expired. Please log in again.';
            setTimeout(() => navigate('/login'), 2000);
            break;
          case 404:
            errorMessage = 'No posts found for this user.';
            setPosts([]);
            break;
          default:
            errorMessage = err.response.data?.message || 'Failed to load posts.';
        }
      } else {
        errorMessage = `Network error: ${err.message}`;
      }

      setPostsError(errorMessage);
    } finally {
      setPostsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Profile: useEffect triggered for id=', id);
    setLoading(true);
    setPostsLoading(true);
    setError(null);
    setPostsError(null);
    fetchUser();
    fetchPosts();
  }, [id, accessToken, currentUser]);

  if (!accessToken || !currentUser) {
    return (
      <div className="profile error">
        <p>Please log in to view this profile.</p>
        <button onClick={() => navigate('/login')}>
          Log In
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="profile loading">Loading profile...</div>;
  }

  if (error) {
    return (
      <div className="profile error">
        <p>{error}</p>
        <button onClick={() => { setError(null); setLoading(true); fetchUser(); }}>
          Retry
        </button>
        {error.includes('session') && (
          <button onClick={() => navigate('/login')}>
            Log In Again
          </button>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile error">
        <p>User not found.</p>
        <button onClick={() => { setError(null); setLoading(true); fetchUser(); }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="profile">
      <h1>{user._id === currentUser?._id ? 'Your Profile' : `${user.username}'s Profile`}</h1>
      <div className="profile-details">
        <img
          src={getProfilePictureUrl(user.profilePicture)}
          alt={`${user.name || user.username || 'User'}'s profile`}
          className="avatar"
          onError={(e) => {
            console.error(`Profile: Image load error for ${user.name || user.username || 'user'}:`, e);
            e.target.src = 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
          }}
        />
        <div className="info">
          <h2>{user.username || 'No username'}</h2>
          <p><strong>Name:</strong> {user.name || 'No name provided'}</p>
          <p><strong>Email:</strong> {user.email || 'No email provided'}</p>
          <p><strong>Bio:</strong> {user.bio || 'No bio provided'}</p>
          <p><strong>Born:</strong> {user.dob ? new Date(user.dob).toLocaleDateString() : 'No date of birth provided'}</p>
          <p><strong>Friends:</strong> {Array.isArray(user.friends) ? user.friends.length : 0}</p>
          {Array.isArray(user.friendRequests) && user.friendRequests.length > 0 && (
            <p><strong>Pending Friend Requests:</strong> {user.friendRequests.length}</p>
          )}
        </div>
      </div>
      <div className="posts-section">
        <h3>Posts</h3>
        {postsLoading && <p className="loading">Loading posts...</p>}
        {postsError && <p className="error">{postsError}</p>}
        {!postsLoading && !postsError && posts.length === 0 && (
          <p className="no-posts">No posts available.</p>
        )}
        {posts.map((post) => (
          <div key={post._id} className="post-card">
            <div className="post-header">
              <img
                src={getProfilePictureUrl(post.userId.profilePicture)}
                alt={`${post.userId.username}'s profile`}
                className="post-avatar"
                onError={(e) => {
                  console.error(`Profile: Post avatar load error for ${post.userId.username}:`, e);
                  e.target.src = 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
                }}
              />
              <div className="post-info">
                <span className="username">{post.userId.username}</span>
                <span className="date">{new Date(post.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="post-content">
              <p>{post.description}</p>
              {post.image && (
                <img
                  src={getPostImageUrl(post.image)}
                  alt="Post content"
                  className="post-image"
                  onError={(e) => {
                    console.error(`Profile: Post image load error for post ${post._id}:`, e);
                    e.target.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className="post-actions">
              <span>{post.likes?.length || 0} Likes</span>
              <span>{post.comments?.length || 0} Comments</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Profile;
