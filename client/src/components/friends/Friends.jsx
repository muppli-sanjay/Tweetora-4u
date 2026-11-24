import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import api, { SERVER_URL } from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import './friends.scss';

const Friends = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [removingFriendId, setRemovingFriendId] = useState(null);

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
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get(`/users/${currentUser.id}`, { headers });
      setFriends(res.data.friends || []);
      setError(null);
    } catch (err) {
      console.error('Friends: Error fetching friends:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load friends');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      setError('Please login to view friends');
      navigate('/login');
      return;
    }

    fetchFriends();
  }, [currentUser, accessToken, navigate]);

  const handleRemoveFriend = async (friendId) => {
    setRemovingFriendId(friendId);
    try {
      const token = accessToken || sessionStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No access token available');
      }
      const headers = { Authorization: `Bearer ${token}` };
      await api.delete(`/users/${friendId}/friends`, { headers });
      setFriends(friends.filter((friend) => friend._id !== friendId));
      alert('Friend removed successfully!');
    } catch (err) {
      console.error('Friends: Error removing friend:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to remove friend');
      }
    } finally {
      setRemovingFriendId(null);
    }
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      return '/assets/default-avatar.png';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    const normalizedPath = profilePicture.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `${SERVER_URL}${normalizedPath}?t=${new Date().getTime()}`;
    return url;
  };

  if (!currentUser) {
    return <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'}`}>Please log in to view friends.</div>;
  }

  if (loading) {
    return <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'}`}>Loading...</div>;
  }

  if (error) {
    return <div className={`friends ${darkMode ? 'theme-dark' : 'theme-light'} error`}>{error}</div>;
  }

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
