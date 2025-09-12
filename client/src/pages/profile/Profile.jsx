import './profile.scss';
import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/authContext';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';

const Profile = () => {
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [removingFriendId, setRemovingFriendId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    bio: '',
    dob: '',
    profilePicture: null,
  });
  const [previewImage, setPreviewImage] = useState(null);

  console.log('Profile: currentUser=', currentUser);
  console.log('Profile: profile id=', id);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to view this profile.');
      setLoading(false);
      return;
    }

    try {
      console.log(`Fetching user with ID: ${id}`);
      const res = await axios.get(`http://localhost:5000/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('User data:', res.data);
      setUser(res.data);
      setFormData({
        username: res.data.username,
        name: res.data.name,
        bio: res.data.bio || '',
        dob: res.data.dob ? new Date(res.data.dob).toISOString().split('T')[0] : '',
        profilePicture: null,
      });
      setPreviewImage(getProfilePictureUrl(res.data.profilePicture));
      setError(null);
    } catch (err) {
      console.error('Error fetching user:', err);
      console.error('Response:', err.response?.data);
      const errorMessage = err.response?.data?.message || 'Failed to load profile.';
      setError(errorMessage);
      setUser(null);
    }
  };

  useEffect(() => {
    if (!currentUser) {
      console.log('Profile: No currentUser, redirecting to login');
      navigate('/login');
      return;
    }

    setLoading(true);
    fetchUser().finally(() => setLoading(false));

    // Polling for friend list updates
    const interval = setInterval(() => {
      fetchUser();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval); // Cleanup on unmount
  }, [id, currentUser, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData({ ...formData, profilePicture: file });
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(getProfilePictureUrl(user?.profilePicture));
    }
  };

  const handleUpdate = async () => {
    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('username', formData.username);
    data.append('name', formData.name);
    data.append('bio', formData.bio);
    if (formData.dob) data.append('dob', formData.dob);
    if (formData.profilePicture) data.append('profilePicture', formData.profilePicture);

    try {
      console.log('Updating user with data:', formData);
      const res = await axios.put(`http://localhost:5000/api/users/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Update response:', res.data);
      setUser(res.data);
      setPreviewImage(getProfilePictureUrl(res.data.profilePicture));
      setIsEditing(false);
      setError(null);
      alert('Profile updated successfully!');
    } catch (err) {
      console.error('Error updating user:', err);
      console.error('Response:', err.response?.data);
      const errorMessage = err.response?.data?.message || 'Failed to update profile.';
      setError(errorMessage);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    setRemovingFriendId(friendId);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/users/${friendId}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Friend removed:', res.data);
      setUser({
        ...user,
        friends: user.friends.filter((friend) => friend._id !== friendId),
      });
      alert('Friend removed successfully!');
    } catch (err) {
      console.error('Error removing friend:', err);
      const errorMessage = err.response?.data?.message || 'Failed to remove friend.';
      setError(errorMessage);
    } finally {
      setRemovingFriendId(null);
    }
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      console.log('Profile: No profile picture provided, using default');
      return '/default-avatar.png';
    }
    if (profilePicture.startsWith('http')) {
      console.log('Profile: Using external profile picture URL:', profilePicture);
      return profilePicture;
    }
    const normalizedPath = profilePicture.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Profile: Profile picture URL:', url);
    fetch(url)
      .then((res) => console.log('Profile: User image fetch status:', res.status, res.statusText))
      .catch((err) => console.error('Profile: User image fetch error:', err));
    return url;
  };

  if (!currentUser) {
    return <div className="profile">Please log in to view this profile.</div>;
  }

  if (loading) {
    return <div className="profile">Loading...</div>;
  }

  if (error) {
    return <div className="profile error">{error}</div>;
  }

  if (!user) {
    return <div className="profile">User not found.</div>;
  }

  const isOwnProfile = currentUser._id === id;
  console.log('Profile: isOwnProfile=', isOwnProfile);
  console.log('Profile: user.friends=', user.friends);

  return (
    <div className="profile">
      {isEditing ? (
        <div className="edit-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Username"
            />
          </div>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Name"
            />
          </div>
          <div className="form-group">
            <label>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Bio"
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
            />
          </div>
          <div className="form-group">
            <label>Profile Picture</label>
            <input
              type="file"
              name="profilePicture"
              accept="image/*"
              onChange={handleFileChange}
            />
            {previewImage && (
              <img src={previewImage} alt="Preview" className="preview-img" />
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="save-btn" onClick={handleUpdate}>
            Save
          </button>
          <button className="edit-btn" onClick={() => setIsEditing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="profile-details">
          <img
            src={getProfilePictureUrl(user.profilePicture)}
            alt={`${user.username}'s profile`}
            className="avatar"
            onError={(e) => {
              console.error(`Profile: Image load error for ${user.username}:`, e);
              e.target.src = '/default-avatar.png';
            }}
          />
          <div className="info">
            <h2>{user.username}</h2>
            <p>
              <strong>Name:</strong> {user.name}
            </p>
            <p>
              <strong>Bio:</strong> {user.bio || 'No bio provided'}
            </p>
            <p>
              <strong>Born:</strong>{' '}
              {user.dob
                ? new Date(user.dob).toLocaleDateString()
                : 'No date of birth provided'}
            </p>
            {isOwnProfile && (
              <button className="edit-btn" onClick={() => setIsEditing(true)}>
                <EditIcon /> Edit Profile
              </button>
            )}
          </div>
        </div>
      )}
      <div className="friends-list">
        <h3>Friends ({user.friends?.length || 0})</h3>
        {(!user.friends || user.friends.length === 0) ? (
          <p>No friends yet.</p>
        ) : (
          <div className="friends-grid">
            {user.friends.map((friend) => (
              <div key={friend._id} className="friend-card">
                <img
                  src={getProfilePictureUrl(friend.profilePicture)}
                  alt={`${friend.username}'s profile`}
                  className="friend-picture"
                  onError={(e) => {
                    console.error(`Profile: Friend image load error for ${friend.username}:`, e);
                    e.target.src = '/default-avatar.png';
                  }}
                />
                <div className="friend-info">
                  <span className="username">{friend.username}</span>
                  <span className="name">{friend.name}</span>
                </div>
                {isOwnProfile && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;