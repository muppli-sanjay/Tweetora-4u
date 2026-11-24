import { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthContext } from '../../context/authContext';
import { DarkModeContext } from '../../context/darkModeContext';
import { useNavigate, useParams } from 'react-router-dom';
import api, { SERVER_URL } from '../../api/axios';
import './messages.scss';

const Messages = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const { darkMode } = useContext(DarkModeContext);
  const navigate = useNavigate();
  const { userId } = useParams();
  const [friends, setFriends] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      return 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    const normalizedPath = profilePicture
      .replace(/^\/(Uploads|post_upload|profile_upload)\//i, '/$1/')
      .replace(/^\/(post_upload|profile_upload)\//i, '/$1/');
    const url = `${SERVER_URL}${normalizedPath}?t=${new Date().getTime()}`;
    return url;
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fetchFriends = useCallback(async () => {
    if (!accessToken) {
      console.error('Messages: No accessToken available');
      setError('Please log in to view friends.');
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/users/${currentUser._id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      setFriends(res.data.friends || []);
      setError(null);
    } catch (err) {
      console.error('Messages: Error fetching friends:', err.message);
      console.error('Messages: Response:', JSON.stringify(err.response?.data, null, 2));
      setError(err.response?.data?.message || 'Failed to load friends.');
      setFriends([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, accessToken]);

  const fetchMessages = useCallback(async () => {
    if (!userId || userId === 'notifications' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Messages: Invalid userId:', userId);
      setMessages([]);
      setError('Invalid user ID for messages.');
      navigate('/messages');
      return;
    }
    if (!accessToken) {
      console.error('Messages: No accessToken available');
      setError('Please log in to view messages.');
      setMessages([]);
      return;
    }
    try {
      const res = await api.get(`/users/messages/${userId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const validMessages = Array.isArray(res.data) ? res.data.filter((msg) => msg && msg._id && msg.senderId && msg.senderId._id) : [];
      setMessages(validMessages);
      setError(null);
      scrollToBottom();
    } catch (err) {
      console.error('Messages: Error fetching messages:', err.message);
      console.error('Messages: Response:', JSON.stringify(err.response?.data, null, 2));
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        navigate('/login');
      } else if (err.response?.status === 400) {
        setError('You can only view messages with friends.');
      } else {
        setError(err.response?.data?.message || 'Failed to load messages.');
      }
      setMessages([]);
    }
  }, [userId, accessToken, navigate]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !userId || userId === 'notifications' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Messages: Invalid send message attempt:', { userId, newMessage });
      setError('Invalid message or recipient.');
      return;
    }
    if (!accessToken) {
      console.error('Messages: No accessToken available');
      setError('Please log in to send messages.');
      return;
    }
    try {
      const res = await api.post('/users/messages', { recipientId: userId, content: newMessage }, { headers: { Authorization: `Bearer ${accessToken}` } });
      // Handle different response structures
      let newMsg = res.data.message || res.data;
      // If senderId is not populated, construct a minimal message
      if (!newMsg.senderId || !newMsg.senderId._id) {
        newMsg = { ...newMsg, senderId: { _id: currentUser._id, username: currentUser.username, name: currentUser.name }, createdAt: new Date().toISOString() };
      }
      // Minimal validation
      if (!newMsg || !newMsg._id || !newMsg.content) {
        console.error('Messages: Invalid message response:', JSON.stringify(newMsg, null, 2));
        setError('Invalid message response from server.');
        return;
      }
      setMessages([...messages, newMsg]);
      setNewMessage(''); // Clear input immediately
      setError(null);
      scrollToBottom();
    } catch (err) {
      console.error('Messages: Error sending message:', err.message);
      console.error('Messages: Response:', JSON.stringify(err.response?.data, null, 2));
      setError(err.response?.data?.message || 'Failed to send message.');
    }
  };

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchFriends();
  }, [currentUser, fetchFriends, navigate]);

  useEffect(() => {
    setError(null); // Clear error on userId change
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  if (!currentUser) return <div className={`messages ${darkMode ? 'theme-dark' : 'theme-light'}`}>Please log in to view messages.</div>;
  if (loading) return <div className={`messages ${darkMode ? 'theme-dark' : 'theme-light'}`}>Loading...</div>;

  return (
    <div className={`messages ${darkMode ? 'theme-dark' : 'theme-light'}`}>
      <div className="sidebar">
        <h3>Chats</h3>
        {friends.length > 0 ? (
          friends.map((friend) => (
            <div key={friend._id} className={`friend ${userId === friend._id ? 'active' : ''}`} onClick={() => navigate(`/messages/${friend._id}`)}>
              <img
                src={getProfilePictureUrl(friend.profilePicture)}
                alt={`${friend.name}'s profile`}
                className="avatar"
                onError={(e) => {
                  console.error(`Messages: Image load error for ${friend.name}:`, e);
                  e.target.src = 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
                }}
              />
              <span>{friend.name}</span>
            </div>
          ))
        ) : (
          <p>No friends yet.</p>
        )}
      </div>
      <div className="chat">
        {userId && userId !== 'notifications' && /^[0-9a-fA-F]{24}$/.test(userId) ? (
          <>
            <div className="chat-header"><h3>{friends.find((f) => f._id === userId)?.name || 'Chat'}</h3></div>
            <div className="messages-list">
              {error && <p className="error">{error}</p>}
              {messages.length > 0 ? (
                messages.map((msg) => (
                  <div key={msg._id} className={`message ${msg.senderId && msg.senderId._id && msg.senderId._id.toString() === currentUser._id ? 'sent' : 'received'}`}>
                    <p>{msg.content}</p>
                    <span>{formatDateTime(msg.createdAt || msg.timestamp)}</span>
                  </div>
                ))
              ) : (
                <p className="no-messages">Start a new conversation</p>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="message-input">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={!userId} />
              <button onClick={sendMessage} disabled={!newMessage.trim() || !userId}>Send</button>
            </div>
          </>
        ) : (
          <p>Select a friend to start chatting.</p>
        )}
      </div>
    </div>
  );
};

export default Messages;