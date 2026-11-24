import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import api, { SERVER_URL } from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import './addfrnds.scss';

const AddFrnds = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingRequestId, setSendingRequestId] = useState(null);

  const fetchRandomUsers = async (token = accessToken) => {
    if (!token) {
      console.error('AddFrnds: No access token available');
      setError('Please login to view users');
      setLoading(false);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get('/users/random', { headers });
      setUsers(res.data || []);
      setError(null);
    } catch (err) {
      console.error('AddFrnds: Error fetching users:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (accessToken) {
      fetchRandomUsers();
    } else {
      console.error('AddFrnds: No access token, checking sessionStorage');
      setError('Please login to view users');
      setLoading(false);
    }
  }, [currentUser, accessToken, navigate]);

  const handleSendFriendRequest = async (userId) => {
    setSendingRequestId(userId);
    try {
      const headers = { Authorization: `Bearer ${accessToken}` };
      await api.post(`/users/${userId}/friend-request`, {}, { headers });
      alert('Friend request sent successfully!');
    } catch (err) {
      console.error('AddFrnds: Error sending friend request:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
        navigate('/login');
      } else {
        setError(err.response?.data?.message || 'Failed to send friend request');
      }
    } finally {
      setSendingRequestId(null);
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
    return <div className={`add-frnds ${darkMode ? 'theme-dark' : 'theme-light'}`}>Please login to add friends.</div>;
  }

  if (loading) {
    return <div className={`add-frnds ${darkMode ? 'theme-dark' : 'theme-light'}`}>Loading...</div>;
  }

  if (error) {
    return <div className={`add-frnds ${darkMode ? 'theme-dark' : 'theme-light'} error`}>{error}</div>;
  }

  return (
    <div className={`add-frnds ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <h2>Add Friends</h2>
      <div className="users-list">
        {users.length > 0 ? (
          users.map((user) => (
            <div key={user._id} className="user-card">
              <img
                src={getProfilePictureUrl(user.profilePicture)}
                alt={`${user.name}'s profile`}
                className="avatar"
                onError={(e) => {
                  console.error(`AddFrnds: Image load error for ${user.name}:`, e);
                  e.target.src = '/assets/default-avatar.png';
                }}
              />
              <div className="user-info">
                <span className="username">{user.username}</span>
                <span className="name">@{user.name}</span>
              </div>
              <button
                className="send-request-btn"
                onClick={() => handleSendFriendRequest(user._id)}
                title={`Send friend request to ${user.username}`}
                disabled={sendingRequestId === user._id}
              >
                {sendingRequestId === user._id ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  'Send Friend Request'
                )}
              </button>
            </div>
          ))
        ) : (
          <p>No users found to add as friends.</p>
        )}
      </div>
    </div>
  );
};

export default AddFrnds;