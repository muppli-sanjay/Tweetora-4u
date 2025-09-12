import { useContext, useEffect, useState, useCallback } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './notifications.scss';

const Notifications = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState([]);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [sentPostNotifications, setSentPostNotifications] = useState([]);
  const [receivedPostNotifications, setReceivedPostNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);

  console.log('Notifications: Initial render, currentUser=', currentUser ? currentUser._id : 'null');
  console.log('Notifications: accessToken=', accessToken || 'null');

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      console.log('Notifications: No profile picture provided, using default');
      return '/assets/default-avatar.png';
    }
    if (profilePicture.startsWith('http')) {
      console.log('Notifications: Using external profile picture URL:', profilePicture);
      return profilePicture;
    }
    const normalizedPath = profilePicture
      .replace(/^\/(Uploads|post_upload|profile_upload)\//i, '/$1/')
      .replace(/^\/(post_upload|profile_upload)\//i, '/$1/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Notifications: Profile picture URL:', url);
    return url;
  };

  const markNotificationsRead = async () => {
    try {
      console.log('Notifications: Marking notifications as read');
      await axios.post('http://localhost:5000/api/notifications/mark-read', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('Notifications: Marking message notifications as read');
      await axios.post('http://localhost:5000/api/messages/mark-read', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log('Notifications: Notifications marked as read');
    } catch (err) {
      console.error('Notifications: Error marking notifications as read:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError('Failed to mark notifications as read.');
    }
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!accessToken || !currentUser) {
      console.error('Notifications: Missing accessToken or currentUser');
      setError('Please log in to view notifications.');
      setLoading(false);
      setFetched(true);
      navigate('/login');
      return;
    }

    try {
      // Fetch friend requests
      console.log('Notifications: Fetching friend requests');
      const friendReqRes = await axios.get('http://localhost:5000/api/users/friend-requests/pending', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const friendRequestsData = Array.isArray(friendReqRes.data) ? friendReqRes.data : [];
      const validatedFriendRequests = friendRequestsData.filter((req) => {
        const isValid = req.senderId &&
                       req.senderId._id &&
                       /^[0-9a-fA-F]{24}$/.test(req.senderId._id) &&
                       req.senderId.username &&
                       req.senderId.name &&
                       req.status === 'pending';
        if (!isValid) console.warn('Notifications: Invalid friend request:', req);
        return isValid;
      });
      setFriendRequests(validatedFriendRequests);

      // Fetch message notifications
      console.log('Notifications: Fetching message notifications');
      const msgRes = await axios.get('http://localhost:5000/api/messages/notifications', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const validMessages = Array.isArray(msgRes.data) ? msgRes.data.filter((msg) => {
        const isValid = msg.senderId &&
                       msg.senderId._id &&
                       /^[0-9a-fA-F]{24}$/.test(msg.senderId._id) &&
                       msg.senderId.username &&
                       typeof msg.content === 'string' &&
                       msg.content.trim();
        if (!isValid) console.warn('Notifications: Invalid message notification:', msg);
        return isValid;
      }) : [];
      setMessageNotifications(validMessages);

      // Fetch sent post notifications (likes/comments by current user)
      console.log('Notifications: Fetching sent post notifications');
      const sentNotifRes = await axios.get('http://localhost:5000/api/notifications/sent', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const validSentNotifications = Array.isArray(sentNotifRes.data) ? sentNotifRes.data.filter((notif) => {
        const isValid = notif.recipientId &&
                       notif.recipientId._id &&
                       /^[0-9a-fA-F]{24}$/.test(notif.recipientId._id) &&
                       notif.recipientId.username &&
                       ['like', 'comment'].includes(notif.type) &&
                       notif.postId &&
                       /^[0-9a-fA-F]{24}$/.test(notif.postId);
        if (!isValid) console.warn('Notifications: Invalid sent notification:', notif);
        return isValid;
      }) : [];
      setSentPostNotifications(validSentNotifications);

      // Fetch received post notifications (likes/comments on current user's posts)
      console.log('Notifications: Fetching received post notifications');
      const receivedNotifRes = await axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const validReceivedNotifications = Array.isArray(receivedNotifRes.data) ? receivedNotifRes.data.filter((notif) => {
        const isValid = notif.senderId &&
                       notif.senderId._id &&
                       /^[0-9a-fA-F]{24}$/.test(notif.senderId._id) &&
                       notif.senderId.username &&
                       ['like', 'comment'].includes(notif.type) &&
                       notif.postId &&
                       /^[0-9a-fA-F]{24}$/.test(notif.postId);
        if (!isValid) console.warn('Notifications: Invalid received notification:', notif);
        return isValid;
      }) : [];
      setReceivedPostNotifications(validReceivedNotifications);

      await markNotificationsRead();
      setError(null);
      setFetched(true);
    } catch (err) {
      console.error('Notifications: Error fetching notifications:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      let errorMessage = 'Failed to load notifications. Please try again.';
      if (err.response?.status === 401) {
        errorMessage = 'Session expired. Please log in again.';
        navigate('/login');
      } else if (err.response?.status === 404) {
        errorMessage = 'No notifications found.';
        setFriendRequests([]);
        setMessageNotifications([]);
        setSentPostNotifications([]);
        setReceivedPostNotifications([]);
      }
      setError(errorMessage);
      setFetched(true);
    } finally {
      setLoading(false);
      console.log('Notifications: fetchNotifications completed');
    }
  }, [accessToken, currentUser, navigate]);

  useEffect(() => {
    if (!currentUser || !accessToken) {
      console.log('Notifications: No currentUser or accessToken, redirecting to login');
      setError('Please log in to view notifications.');
      navigate('/login');
      return;
    }
    console.log('Notifications: Fetching notifications for user:', currentUser._id);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [currentUser, accessToken, fetchNotifications, navigate]);

  const handleFriendRequestAction = async (senderId, action) => {
    try {
      console.log(`Notifications: ${action}ing friend request from senderId: ${senderId}`);
      const res = await axios.post(
        `http://localhost:5000/api/users/friend-requests/${senderId}`,
        { action: action === 'accept' ? 'accepted' : 'rejected' },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log(`Notifications: Friend request ${action}ed:`, res.data);
      setFriendRequests(friendRequests.filter((req) => req.senderId._id !== senderId));
      alert(`Friend request ${action}ed successfully!`);
    } catch (err) {
      console.error(`Notifications: Error ${action}ing friend request:`, {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.response?.data?.message || `Failed to ${action} friend request.`);
    }
  };

  const handleMessageClick = (senderId) => {
    if (!senderId || !/^[0-9a-fA-F]{24}$/.test(senderId)) {
      console.error('Notifications: Invalid senderId for navigation:', senderId);
      setError('Invalid user ID for message navigation.');
      return;
    }
    console.log('Notifications: Navigating to messages for senderId:', senderId);
    navigate(`/messages/${senderId}`);
  };

  const handlePostNotificationClick = (postId) => {
    if (!postId || !/^[0-9a-fA-F]{24}$/.test(postId)) {
      console.error('Notifications: Invalid postId for navigation:', postId);
      setError('Invalid post ID for navigation.');
      return;
    }
    console.log('Notifications: Navigating to post:', postId);
    navigate(`/post/${postId}`);
  };

  if (!currentUser || !accessToken) {
    return <div className={`notifications ${darkMode ? 'theme-dark' : 'theme-light'}`}>Please log in to view notifications.</div>;
  }

  return (
    <div className={`notifications ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <h3>Notifications</h3>
      {loading && <p className="loading">Loading notifications...</p>}
      {error && <p className="error">{error}</p>}
      {fetched && !loading && !error && 
       friendRequests.length === 0 && 
       messageNotifications.length === 0 && 
       sentPostNotifications.length === 0 && 
       receivedPostNotifications.length === 0 && (
        <p className="no-notifications">No new notifications.</p>
      )}
      <div className="notifications-list">
        {friendRequests.length > 0 && (
          <div className="notification-section">
            <h4>Friend Requests</h4>
            {friendRequests.map((request) => (
              <div key={`friend-${request.senderId._id}`} className="notification-card">
                <div className="notification-info">
                  <img
                    src={getProfilePictureUrl(request.senderId.profilePicture)}
                    alt={`${request.senderId.username}'s profile`}
                    className="avatar"
                    onError={(e) => {
                      console.error(`Notifications: Image load error for ${request.senderId.username}:`, e);
                      e.target.src = '/assets/default-avatar.png';
                    }}
                  />
                  <div className="details">
                    <span className="username">{request.senderId.username}</span>
                    <span className="message">{request.senderId.name} sent you a friend request</span>
                  </div>
                </div>
                <div className="actions">
                  <button
                    className="accept-btn"
                    onClick={() => handleFriendRequestAction(request.senderId._id, 'accept')}
                    disabled={loading}
                  >
                    Accept
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleFriendRequestAction(request.senderId._id, 'reject')}
                    disabled={loading}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {messageNotifications.length > 0 && (
          <div className="notification-section">
            <h4>Messages</h4>
            {messageNotifications.map((msg) => (
              <div key={`message-${msg._id}`} className="notification-card message-notification">
                <div
                  className="notification-info"
                  onClick={() => handleMessageClick(msg.senderId._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={getProfilePictureUrl(msg.senderId.profilePicture)}
                    alt={`${msg.senderId.username}'s profile`}
                    className="avatar"
                    onError={(e) => {
                      console.error(`Notifications: Image load error for ${msg.senderId.username}:`, e);
                      e.target.src = '/assets/default-avatar.png';
                    }}
                  />
                  <div className="details">
                    <span className="username">{msg.senderId.username}</span>
                    <span className="message">New message: {msg.content}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {receivedPostNotifications.length > 0 && (
          <div className="notification-section">
            <h4>Post Activity</h4>
            {receivedPostNotifications.map((notif) => (
              <div key={`received-${notif._id}`} className="notification-card post-notification">
                <div
                  className="notification-info"
                  onClick={() => handlePostNotificationClick(notif.postId)}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={getProfilePictureUrl(notif.senderId.profilePicture)}
                    alt={`${notif.senderId.username}'s profile`}
                    className="avatar"
                    onError={(e) => {
                      console.error(`Notifications: Image load error for ${notif.senderId.username}:`, e);
                      e.target.src = '/assets/default-avatar.png';
                    }}
                  />
                  <div className="details">
                    <span className="username">{notif.senderId.username}</span>
                    <span className="message">
                      {notif.type === 'like'
                        ? `${notif.senderId.name} liked your post`
                        : `${notif.senderId.name} commented on your post: ${notif.content}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {sentPostNotifications.length > 0 && (
          <div className="notification-section">
            <h4>Your Activity</h4>
            {sentPostNotifications.map((notif) => (
              <div key={`sent-${notif._id}`} className="notification-card post-notification">
                <div
                  className="notification-info"
                  onClick={() => handlePostNotificationClick(notif.postId)}
                  style={{ cursor: 'pointer' }}
                >
                  <img
                    src={getProfilePictureUrl(notif.recipientId.profilePicture)}
                    alt={`${notif.recipientId.username}'s profile`}
                    className="avatar"
                    onError={(e) => {
                      console.error(`Notifications: Image load error for ${notif.recipientId.username}:`, e);
                      e.target.src = '/assets/default-avatar.png';
                    }}
                  />
                  <div className="details">
                    <span className="username">{notif.recipientId.username}</span>
                    <span className="message">
                      {notif.type === 'like'
                        ? `You liked ${notif.recipientId.name}'s post`
                        : `You commented on ${notif.recipientId.name}'s post: ${notif.content}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
