import './navbar.scss';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import WbSunnyOutlinedIcon from '@mui/icons-material/WbSunnyOutlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Link, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useState, useCallback } from 'react';
import { DarkModeContext } from '../../context/darkModeContext';
import { AuthContext } from '../../context/authContext';
import axios from 'axios';
import debounce from 'lodash.debounce';

const Navbar = () => {
  const { toggle, darkMode } = useContext(DarkModeContext);
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [friendRequests, setFriendRequests] = useState([]);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [postNotifications, setPostNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  console.log('Navbar: Initial render, currentUser=', currentUser ? JSON.stringify(currentUser, null, 2) : 'null');
  console.log('Navbar: sessionStorage.accessToken=', sessionStorage.getItem('accessToken') || 'null');

  // Fetch notifications
  useEffect(() => {
    console.log('Navbar: currentUser=', currentUser ? { id: currentUser.id, username: currentUser.username } : 'null');
    console.log('Navbar: profilePicture=', currentUser?.profilePicture);

    const fetchNotifications = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
          console.error('Navbar: No accessToken found in sessionStorage');
          setError('Please log in to view notifications.');
          navigate('/login');
          return;
        }

        // Fetch friend requests
        console.log('Navbar: Fetching friend requests from: http://localhost:5000/api/users/friend-requests/pending');
        const friendReqRes = await axios.get('http://localhost:5000/api/users/friend-requests/pending', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const friendRequestsData = Array.isArray(friendReqRes.data) ? friendReqRes.data.filter(req => req.status === 'pending') : [];
        setFriendRequests(friendRequestsData);

        // Fetch message notifications (unread only)
        console.log('Navbar: Fetching message notifications from: http://localhost:5000/api/messages/notifications');
        const msgRes = await axios.get('http://localhost:5000/api/messages/notifications?unread=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const messageData = Array.isArray(msgRes.data) ? msgRes.data.filter(msg => 
          msg.senderId?._id && 
          /^[0-9a-fA-F]{24}$/.test(msg.senderId._id) && 
          msg.senderId._id !== 'notifications'
        ) : [];
        setMessageNotifications(messageData);

        // Fetch post notifications (unread only)
        console.log('Navbar: Fetching post notifications from: http://localhost:5000/api/notifications?unread=true');
        const postNotifRes = await axios.get('http://localhost:5000/api/notifications?unread=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const postNotifData = Array.isArray(postNotifRes.data) ? postNotifRes.data.filter(notif => 
          notif.senderId?._id && 
          ['like', 'comment'].includes(notif.type) && 
          notif.postId && 
          /^[0-9a-fA-F]{24}$/.test(notif.postId)
        ) : [];
        setPostNotifications(postNotifData);

        setError(null);
      } catch (err) {
        console.error('Navbar: Error fetching notifications:', err.message);
        console.error('Navbar: Error details:', {
          status: err.response?.status,
          data: JSON.stringify(err.response?.data, null, 2),
        });
        if (err.response?.status === 401) {
          setError('Session expired. Please log in again.');
          sessionStorage.removeItem('accessToken');
          sessionStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load notifications.');
        }
      }
    };

    if (currentUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 10000);
      return () => clearInterval(interval);
    } else {
      console.log('Navbar: No currentUser, skipping fetchNotifications');
    }
  }, [currentUser, navigate]);

  // Debounced search function
  const fetchSearchResults = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults({ users: [], posts: [] });
        setIsSearchOpen(false);
        return;
      }

      try {
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
          console.error('Navbar: No accessToken for search');
          setError('Please log in to search.');
          navigate('/login');
          return;
        }
        console.log(`Navbar: Searching for query "${query}"`);
        const res = await axios.get(`http://localhost:5000/api/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Navbar: Search response:', JSON.stringify(res.data, null, 2));
        setSearchResults({
          users: Array.isArray(res.data.users) ? res.data.users : [],
          posts: Array.isArray(res.data.posts) ? res.data.posts : [],
        });
        setIsSearchOpen(true);
        setError(null);
      } catch (err) {
        console.error('Navbar: Error searching:', err.message);
        console.error('Navbar: Error details:', {
          status: err.response?.status,
          data: JSON.stringify(err.response?.data, null, 2),
        });
        setError(err.response?.data?.message || 'Failed to load search results.');
        setSearchResults({ users: [], posts: [] });
        setIsSearchOpen(false);
      }
    }, 300),
    [navigate]
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchSearchResults(query);
  };

  // Handle search result click
  const handleResultClick = (type, id) => {
    console.log(`Navbar: Clicking ${type} result with id: ${id}`);
    setSearchQuery('');
    setSearchResults({ users: [], posts: [] });
    setIsSearchOpen(false);
    navigate(type === 'user' ? `/profile/${id}` : `/post/${id}`);
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.search') && !e.target.closest('.search-dropdown')) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleNotificationsClick = () => {
    console.log('Navbar: Notifications icon clicked, navigating to /notifications');
    navigate('/notifications');
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      console.log('Navbar: No profile picture provided, using default');
      return '/assets/default-avatar.png';
    }
    if (profilePicture.startsWith('http')) {
      console.log('Navbar: Using external profile picture URL:', profilePicture);
      return profilePicture;
    }
    const normalizedPath = profilePicture.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Navbar: Profile picture URL:', url);
    fetch(url)
      .then((res) => console.log('Navbar: Profile picture fetch status:', res.status, res.statusText))
      .catch((err) => console.error('Navbar: Profile picture fetch error:', err));
    return url;
  };

  // Calculate total notification count (unread only)
  const totalNotifications = friendRequests.length + messageNotifications.length + postNotifications.length;

  return (
    <div className="navbar">
      <div className="left">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span>Yoursocial</span>
        </Link>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <HomeOutlinedIcon style={{ cursor: 'pointer' }} />
        </Link>
        {darkMode ? (
          <WbSunnyOutlinedIcon onClick={toggle} style={{ cursor: 'pointer' }} />
        ) : (
          <DarkModeOutlinedIcon onClick={toggle} style={{ cursor: 'pointer' }} />
        )}
        <div className="search">
          <SearchOutlinedIcon />
          <input
            type="text"
            placeholder="Search users or posts..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
          {isSearchOpen && (
            <div className="search-dropdown">
              {error && <p className="error">{error}</p>}
              {searchResults.users.length === 0 && searchResults.posts.length === 0 && !error && (
                <p className="no-results">No results found.</p>
              )}
              {searchResults.users.length > 0 && (
                <div className="section">
                  <h4>Users</h4>
                  {searchResults.users.map((user) => (
                    <div
                      key={`user-${user._id}`}
                      className="result-item"
                      onClick={() => handleResultClick('user', user._id)}
                    >
                      <img
                        src={getProfilePictureUrl(user.profilePicture)}
                        alt={`${user.username}'s profile`}
                        className="avatar"
                        onError={(e) => {
                          console.error(`Navbar: User profile picture load error for ${user.username}:`, e);
                          e.target.src = '/assets/default-avatar.png';
                        }}
                      />
                      <div className="details">
                        <span className="username">{user.username}</span>
                        <span className="name">{user.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {searchResults.posts.length > 0 && (
                <div className="section">
                  <h4>Posts</h4>
                  {searchResults.posts.map((post) => (
                    <div
                      key={`post-${post._id}`}
                      className="result-item"
                      onClick={() => handleResultClick('post', post._id)}
                    >
                      <img
                        src={getProfilePictureUrl(post.userId.profilePicture)}
                        alt={`${post.userId.username}'s profile`}
                        className="avatar"
                        onError={(e) => {
                          console.error(`Navbar: Post user profile picture load error for ${post.userId.username}:`, e);
                          e.target.src = '/assets/default-avatar.png';
                        }}
                      />
                      <div className="details">
                        <span className="username">{post.userId.username}</span>
                        <span className="description">{post.description.substring(0, 50)}...</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="right">
        <div className="notifications" onClick={handleNotificationsClick}>
          <NotificationsOutlinedIcon style={{ cursor: 'pointer' }} />
          {totalNotifications > 0 && (
            <span className="notification-count">{totalNotifications}</span>
          )}
        </div>
        <div className="user">
          {currentUser ? (
            <>
              <img
                src={getProfilePictureUrl(currentUser.profilePicture)}
                alt={`${currentUser.name}'s profile`}
                onError={(e) => {
                  console.error('Navbar: Profile picture load error:', e);
                  e.target.src = '/assets/default-avatar.png';
                }}
              />
              <span>{currentUser.name}</span>
            </>
          ) : (
            <span>Loading...</span>
          )}
        </div>
        <LogoutOutlinedIcon
          onClick={() => {
            console.log('Navbar: Logout clicked');
            logout();
            navigate('/login');
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>
    </div>
  );
};

export default Navbar;