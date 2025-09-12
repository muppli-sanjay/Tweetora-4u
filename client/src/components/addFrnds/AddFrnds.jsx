import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import './addfrnds.scss';

const AddFrnds = () => {
  const { currentUser, accessToken, refreshAccessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingRequestId, setSendingRequestId] = useState(null);

  console.log('AddFrnds: currentUser:', JSON.stringify(currentUser, null, 2));
  console.log('AddFrnds: accessToken:', accessToken ? accessToken : 'None');

  const fetchRandomUsers = async (token = accessToken) => {
    if (!token) {
      console.error('AddFrnds: No access token available');
      const storedToken = sessionStorage.getItem('accessToken');
      console.log('AddFrnds: sessionStorage accessToken:', storedToken ? storedToken : 'None');
      setError('Please login to view users');
      setLoading(false);
      return;
    }

    try {
      console.log('AddFrnds: Fetching random users');
      const headers = { Authorization: `Bearer ${token}` };
      console.log('AddFrnds: Sending headers:', headers);
      const res = await axios.get('http://localhost:5000/api/users/random', { headers });
      console.log('AddFrnds: Fetched users:', JSON.stringify(res.data, null, 2));
      setUsers(res.data || []);
      setError(null);
    } catch (err) {
      console.error('AddFrnds: Error fetching users:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        try {
          console.log('AddFrnds: Token expired or invalid, attempting to refresh');
          const newToken = await refreshAccessToken();
          console.log('AddFrnds: New accessToken:', newToken);
          const headers = { Authorization: `Bearer ${newToken}` };
          console.log('AddFrnds: Retry headers:', headers);
          const retryRes = await axios.get('http://localhost:5000/api/users/random', { headers });
          console.log('AddFrnds: Fetched users after refresh:', JSON.stringify(retryRes.data, null, 2));
          setUsers(retryRes.data || []);
        } catch (refreshErr) {
          console.error('AddFrnds: Refresh failed:', refreshErr.message, refreshErr.response?.data);
          setError('Session expired. Please login again.');
          navigate('/login');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to load users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('AddFrnds: useEffect triggered');
    if (!currentUser) {
      console.log('AddFrnds: No currentUser, redirecting to login');
      navigate('/login');
      return;
    }

    if (accessToken) {
      fetchRandomUsers();
    } else {
      console.error('AddFrnds: No access token, checking sessionStorage');
      const storedToken = sessionStorage.getItem('accessToken');
      console.log('AddFrnds: sessionStorage accessToken:', storedToken ? storedToken : 'None');
      setError('Please login to view users');
      setLoading(false);
    }
  }, [currentUser, accessToken, navigate]);

  const handleSendFriendRequest = async (userId) => {
    setSendingRequestId(userId);
    try {
      console.log(`AddFrnds: Sending friend request to user ID: ${userId}`);
      const headers = { Authorization: `Bearer ${accessToken}` };
      console.log('AddFrnds: Send request headers:', headers);
      const res = await axios.post(`http://localhost:5000/api/users/${userId}/friend-request`, {}, { headers });
      console.log('AddFrnds: Friend request sent:', res.data);
      alert('Friend request sent successfully!');
    } catch (err) {
      console.error('AddFrnds: Error sending friend request:', err.message, err.response?.data);
      if (err.response?.status === 401) {
        try {
          console.log('AddFrnds: Token expired or invalid, attempting to refresh');
          const newToken = await refreshAccessToken();
          console.log('AddFrnds: New accessToken:', newToken);
          const headers = { Authorization: `Bearer ${newToken}` };
          console.log('AddFrnds: Retry headers:', headers);
          const retryRes = await axios.post(`http://localhost:5000/api/users/${userId}/friend-request`, {}, { headers });
          console.log('AddFrnds: Friend request sent after refresh:', retryRes.data);
          alert('Friend request sent successfully!');
        } catch (refreshErr) {
          console.error('AddFrnds: Refresh failed:', refreshErr.message, refreshErr.response?.data);
          setError('Session expired. Please login again.');
          navigate('/login');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to send friend request');
      }
    } finally {
      setSendingRequestId(null);
    }
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      console.log('AddFrnds: No profile picture provided, using default');
      return '/assets/default-avatar.png';
    }
    if (profilePicture.startsWith('http')) {
      console.log('AddFrnds: Using external profile picture URL:', profilePicture);
      return profilePicture;
    }
    const normalizedPath = profilePicture.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('AddFrnds: Profile picture URL:', url);
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