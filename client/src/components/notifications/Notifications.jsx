import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import { useNavigate } from 'react-router-dom';
import api, { SERVER_URL, getErrorMessage } from '../../api/axios';
import './notifications.scss';

const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return '/assets/default-avatar.png';
  if (profilePicture.startsWith('http')) return profilePicture;
  return `${SERVER_URL}${profilePicture}`;
};

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [['d', 86400], ['h', 3600], ['m', 60]];
  for (const [label, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return 'just now';
};

// Likes, comments, friend requests and accepted requests. Messages have their own page and badge.
const Notifications = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      const list = Array.isArray(res.data) ? res.data : [];
      setNotifications(list);
      setError(null);
      if (list.some((n) => !n.read)) {
        await api.post('/notifications/mark-read');
      }
    } catch (err) {
      if (err.response?.status === 401) return;
      setError(getErrorMessage(err, 'Failed to load notifications.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !accessToken) {
      navigate('/login');
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser, accessToken, fetchNotifications, navigate]);

  const handleFriendRequestAction = async (notif, action) => {
    setBusyId(notif._id);
    try {
      await api.post(`/users/friend-requests/${notif.senderId._id}`, {
        action: action === 'accept' ? 'accepted' : 'rejected',
      });
      await fetchNotifications();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${action} friend request.`));
    } finally {
      setBusyId(null);
    }
  };

  const describe = (n) => {
    const name = n.senderId.name || n.senderId.username;
    if (n.type === 'like') return `${name} liked your post`;
    if (n.type === 'comment') return `${name} commented on your post: ${n.content}`;
    if (n.type === 'friend_accept') return `${name} accepted your friend request. You are now friends!`;
    if (n.status === 'accepted') return `${name} sent you a friend request. You accepted it.`;
    if (n.status === 'rejected') return `${name} sent you a friend request. You declined it.`;
    return `${name} sent you a friend request`;
  };

  const handleClick = (n) => {
    if (n.type === 'friend_request' || n.type === 'friend_accept') {
      return navigate(`/profile/${n.senderId._id}`);
    }
    const postId = n.postId?._id || n.postId;
    // Likes/comments open the post itself; if it was deleted, fall back to your profile
    navigate(postId ? `/post/${postId}` : `/profile/${currentUser._id}`);
  };

  if (!currentUser || !accessToken) {
    return <div className={`notifications ${darkMode ? 'theme-dark' : 'theme-light'}`}>Please log in to view notifications.</div>;
  }

  return (
    <div className={`notifications ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <h3>Notifications</h3>
      {loading && <p className="loading">Loading notifications...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && notifications.length === 0 && (
        <p className="no-notifications">No notifications yet.</p>
      )}
      <div className="notifications-list">
        {notifications.map((n) => (
          <div key={n._id} className="notification-card">
            <div className="notification-info" onClick={() => handleClick(n)} style={{ cursor: 'pointer' }}>
              <img
                src={getProfilePictureUrl(n.senderId.profilePicture)}
                alt={`${n.senderId.username}'s profile`}
                className="avatar"
                onError={(e) => { e.target.src = '/assets/default-avatar.png'; }}
              />
              <div className="details">
                <span className="username">{n.senderId.username}</span>
                <span className="message">{describe(n)}</span>
                <span className="message">{timeAgo(n.createdAt)}</span>
              </div>
            </div>
            {n.type === 'friend_request' && n.friendRequestPending && (
              <div className="actions">
                <button className="accept-btn" disabled={busyId === n._id} onClick={() => handleFriendRequestAction(n, 'accept')}>
                  Accept
                </button>
                <button className="reject-btn" disabled={busyId === n._id} onClick={() => handleFriendRequestAction(n, 'reject')}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
