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
import api, { SERVER_URL } from '../../api/axios';
import logoWide from '../../assets/logo-horizontal.png';
import logoIcon from '../../assets/logo-icon.png';
import debounce from 'lodash.debounce';

const Navbar = () => {
  const { toggle, darkMode } = useContext(DarkModeContext);
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [postNotifications, setPostNotifications] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], posts: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Fetch notifications
  useEffect(() => {

    const fetchNotifications = async () => {
      try {
        const token = sessionStorage.getItem('accessToken');
        if (!token) {
          console.error('Navbar: No accessToken found in sessionStorage');
          setError('Please log in to view notifications.');
          navigate('/login');
          return;
        }

        // Unread likes, comments and friend requests
        const notifRes = await api.get('/notifications?unread=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPostNotifications(Array.isArray(notifRes.data) ? notifRes.data : []);

        // Unread messages (counted in the badge, but not listed on the Notifications page)
        const msgRes = await api.get('/messages/notifications?unread=true', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setMessageNotifications(Array.isArray(msgRes.data) ? msgRes.data.filter(msg =>
          msg.senderId?._id && /^[0-9a-fA-F]{24}$/.test(msg.senderId._id)
        ) : []);

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
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    navigate('/notifications');
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

  // Calculate total notification count (unread only)
  const totalNotifications = messageNotifications.length + postNotifications.length;

  return (
    <div className={`navbar ${darkMode ? 'theme-dark' : ''}`}>
      <div className="left">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <picture>
            {/* phones get the compact bird icon so the header fits */}
            <source media="(max-width: 600px)" srcSet={logoIcon} />
            <img src={logoWide} alt="Tweetora-4u" />
          </picture>
        </Link>
        <Link to="/" className="home-link" style={{ textDecoration: 'none' }}>
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
        <div className="nav-bell" onClick={handleNotificationsClick}>
          <NotificationsOutlinedIcon style={{ cursor: 'pointer' }} />
          {totalNotifications > 0 && (
            <span className="notification-count">{totalNotifications}</span>
          )}
        </div>
        <div
          className="user"
          onClick={() => currentUser && navigate(`/profile/${currentUser._id}`)}
          style={{ cursor: 'pointer' }}
          title="View profile"
        >
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