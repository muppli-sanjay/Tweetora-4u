import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import './friends.scss';

const Friends = () => {
  const { currentUser, accessToken, refreshAccessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingFriendId, setRemovingFriendId] = useState(null);

  console.log('Friends: Initial render, currentUser=', currentUser ? JSON.stringify(currentUser, null, 2) : 'null');
  console.log('Friends: accessToken=', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
  console.log('Friends: sessionStorage.accessToken=', sessionStorage.getItem('accessToken') || 'null');

  const fetchFriends = async (token = accessToken || sessionStorage.getItem('accessToken')) => {
    if (!token) {
      console.error('Friends: No access token available in AuthContext or sessionStorage');
      setError('Please login to view friends');
      setLoading(false);
      return;
    }

    if (!currentUser?.id) {
      console.error('Friends: currentUser.id is undefined', currentUser);
      setError('User ID is missing');
      setLoading(false);
      return;
    }

    try {
      console.log(`Friends: Fetching friends for user ID: ${currentUser.id}`);
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Friends: Sending headers:', headers.Authorization.substring(0, 30) + '...');
      const res = await axios.get(`http://localhost:5000/api/users/${currentUser.id}`, { headers });
      console.log('Friends: Fetched friends:', JSON.stringify(res.data.friends, null, 2));
      res.data.friends.forEach((friend) => {
        console.log(`Friends: Friend ${friend.name} profilePicture:`, friend.profilePicture);
      });
      setFriends(res.data.friends || []);
      setError(null);
    } catch (err) {
      console.error('Friends: Error fetching friends:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        try {
          console.log('Friends: Token expired, attempting to refresh');
          const newToken = await refreshAccessToken();
          const headers = { Authorization: `Bearer ${newToken}` };
          console.log('Friends: Retry headers:', headers.Authorization.substring(0, 30) + '...');
          const retryRes = await axios.get(`http://localhost:5000/api/users/${currentUser.id}`, { headers });
          console.log('Friends: Fetched friends after refresh:', JSON.stringify(retryRes.data.friends, null, 2));
          setFriends(retryRes.data.friends || []);
          setError(null);
        } catch (refreshErr) {
          console.error('Friends: Refresh failed:', refreshErr.message);
          setError('Session expired. Please login again.');
          navigate('/login');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to load friends');
      }
    } finally {
      setLoading(false);
      console.log('Friends: fetchFriends completed, loading=', false);
      console.log('Friends: friends=', JSON.stringify(friends, null, 2));
      console.log('Friends: error=', error);
    }
  };

  useEffect(() => {
    console.log('Friends: useEffect triggered, currentUser=', currentUser ? JSON.stringify(currentUser, null, 2) : 'null');
    console.log('Friends: accessToken=', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
    if (!currentUser) {
      console.log('Friends: No currentUser, redirecting to login');
      setError('Please login to view friends');
      navigate('/login');
      return;
    }

    fetchFriends();
  }, [currentUser, accessToken, navigate]);

  const handleRemoveFriend = async (friendId) => {
    setRemovingFriendId(friendId);
    try {
      console.log(`Friends: Removing friend with ID: ${friendId}`);
      const token = accessToken || sessionStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token available');
      }
      const headers = { Authorization: `Bearer ${token}` };
      console.log('Friends: Remove friend headers:', headers.Authorization.substring(0, 30) + '...');
      const res = await axios.delete(`http://localhost:5000/api/users/${friendId}/friends`, { headers });
      console.log('Friends: Friend removed:', res.data);
      setFriends(friends.filter((friend) => friend._id !== friendId));
      alert('Friend removed successfully!');
    } catch (err) {
      console.error('Friends: Error removing friend:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        try {
          console.log('Friends: Token expired, attempting to refresh');
          const newToken = await refreshAccessToken();
          const headers = { Authorization: `Bearer ${newToken}` };
          console.log('Friends: Remove friend retry headers:', headers.Authorization.substring(0, 30) + '...');
          const retryRes = await axios.delete(`http://localhost:5000/api/users/${friendId}/friends`, { headers });
          console.log('Friends: Friend removed after refresh:', retryRes.data);
          setFriends(friends.filter((friend) => friend._id !== friendId));
          alert('Friend removed successfully!');
        } catch (refreshErr) {
          console.error('Friends: Refresh failed:', refreshErr.message);
          setError('Session expired. Please login again.');
          navigate('/login');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to remove friend');
      }
    } finally {
      setRemovingFriendId(null);
    }
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      console.log('Friends: No profile picture provided, using default');
      return '/assets/default-avatar.png';
    }
    if (profilePicture.startsWith('http')) {
      console.log('Friends: Using external profile picture URL:', profilePicture);
      return profilePicture;
    }
    const normalizedPath = profilePicture.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Friends: Profile picture URL:', url);
    return url;
  };

  if (!currentUser) {
    console.log('Friends: Rendering no currentUser state');
    return <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'}`}>Please log in to view friends.</div>;
  }

  if (loading) {
    console.log('Friends: Rendering loading state');
    return <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'}`}>Loading...</div>;
  }

  if (error) {
    console.log('Friends: Rendering error state:', error);
    return <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'} error`}>{error}</div>;
  }

  console.log('Friends: Rendering friends list, count=', friends.length);

  return (
    <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <h2>{currentUser.name}'s Friends</h2>
      <div className="friends-list">
        {friends.length > 0 ? (
          friends.map((friend) => (
            <div key={friend._id} className="friend-card">
              <img
                src={getProfilePictureUrl(friend.profilePicture)}
                alt={`${friend.name}'s profile`}
                className="avatar"
                onError={(e) => {
                  console.error(`Friends: Image load error for ${friend.name}:`, e);
                  e.target.src = '/assets/default-avatar.png';
                }}
              />
              <div className="friend-info">
                <span className="username">{friend.username}</span>
                <span className="name">@{friend.name}</span>
              </div>
              <button
                className="remove-friend-btn"
                onClick={() => handleRemoveFriend(friend._id)}
                title={`Remove ${friend.username} as a friend`}
                disabled={removingFriendId === friend._id}
              >
                {removingFriendId === friend._id ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <>
                    <DeleteIcon /> Remove Friend
                  </>
                )}
              </button>
            </div>
          ))
        ) : (
          <p>No friends found.</p>
        )}
      </div>
    </div>
  );
};

export default Friends;
