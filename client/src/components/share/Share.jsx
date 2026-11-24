import HashtagInput from '../hashtag/HashtagInput';
import { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../../context/authContext';
import './share.scss';
import Image from '../../assets/img.png';
import Map from '../../assets/map.png';
import Friend from '../../assets/friend.png';
import api, { SERVER_URL, getErrorMessage } from '../../api/axios';

const Share = () => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [location, setLocation] = useState('');
  const [friends, setFriends] = useState([]);
  const [taggedFriends, setTaggedFriends] = useState([]);
  const [showFriendsDropdown, setShowFriendsDropdown] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getProfilePictureUrl = (profilePicture) => {
    if (!profilePicture) {
      return 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
    }
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    const normalizedPath = profilePicture.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `${SERVER_URL}${normalizedPath}?t=${new Date().getTime()}`;
    return url;
  };

  // Fetch friends for tagging
  const fetchFriends = useCallback(async () => {
    if (!accessToken || typeof accessToken !== 'string' || !accessToken.includes('.')) {
      setError('Invalid or missing authentication token. Please log in.');
      return;
    }
    if (!currentUser?._id) {
      setError('User ID is missing.');
      return;
    }

    try {
      const { data } = await api.get(`/users/${currentUser._id}`);
      setFriends(data.friends || []);
    } catch (err) {
      console.error('Share: Error fetching friends:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(err.message || 'Failed to load friends.');
    }
  }, [currentUser, accessToken]);

  // close the tag-friends list when clicking anywhere outside it
  useEffect(() => {
    if (!showFriendsDropdown) return undefined;
    const close = (e) => {
      if (e.target.closest && (e.target.closest('.friends-dropdown') || e.target.closest('.tag-toggle'))) return;
      setShowFriendsDropdown(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showFriendsDropdown]);

  useEffect(() => {
    if (currentUser && accessToken) {
      fetchFriends();
    }
  }, [currentUser, accessToken, fetchFriends]);

  // Handle file selection and preview
  useEffect(() => {
    if (file) {
      if (!(file instanceof File)) {
        setError('Invalid file object. Please select a valid image or video.');
        setFile(null);
        setFilePreview(null);
        return;
      }
      const fileType = file.type;
      const validExt = /\.(jpe?g|png|gif|webp|mp4|mov|mp3|wav|ogg|m4a|aac)$/i.test(file.name);
      if (!/^(image|video|audio)\//.test(fileType) || !validExt) {
        setError('Please select an image (JPG, PNG, GIF, WebP), video (MP4, MOV) or audio (MP3, WAV, OGG, M4A, AAC) file.');
        setFile(null);
        setFilePreview(null);
        return;
      }
      if (file.size === 0) {
        setError('Selected file is empty. Please choose a valid file.');
        setFile(null);
        setFilePreview(null);
        return;
      }
      // Verify file integrity
      const reader = new FileReader();
      reader.onload = () => {
        const url = URL.createObjectURL(file);
        setFilePreview({ url, type: fileType.startsWith('image/') ? 'image' : fileType.startsWith('audio/') ? 'audio' : 'video' });
      };
      reader.onerror = () => {
        setError('Failed to read file. Please select a valid file.');
        setFile(null);
        setFilePreview(null);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }

    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview.url);
      }
    };
  }, [file, filePreview]);

  // Toggle friend in taggedFriends
  const toggleFriendTag = (friendId) => {
    setTaggedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description && !file && !location && taggedFriends.length === 0) {
      setError('Please provide a description, image/video, location, or tag friends.');
      return;
    }

    if (!accessToken || typeof accessToken !== 'string' || !accessToken.includes('.')) {
      setError('Invalid or missing authentication token. Please log in.');
      return;
    }

    if (!currentUser?._id) {
      setError('User ID is missing. Please log in again.');
      return;
    }

    setLoading(true);
    setError(null);

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    let body;

    // Use FormData for all posts to match posts.js
    const formData = new FormData();
    formData.append('userId', currentUser._id);
    formData.append('name', currentUser.name || '');
    formData.append('profilePicture', currentUser.profilePicture || '');
    formData.append('description', description || '');
    if (file) formData.append('image', file);
    if (location) formData.append('location', location);
    if (taggedFriends.length > 0) {
      formData.append('taggedFriends', JSON.stringify(taggedFriends));
    }
    body = formData;

    // Log FormData entries
    const formEntries = {};
    for (const [key, value] of formData.entries()) {
      formEntries[key] = value instanceof File ? {
        name: value.name,
        size: value.size,
        type: value.type,
        lastModified: new Date(value.lastModified).toISOString()
      } : value;
    }

    try {

      const res = await api.post('/posts', body, { headers });

      if (res.status !== 201) {
        throw new Error(res.data.message || 'Failed to create post');
      }

      setDescription('');
      setFile(null);
      setFilePreview(null);
      setLocation('');
      setTaggedFriends([]);
      window.dispatchEvent(new Event('newPost'));
    } catch (err) {
      console.error('Share: Error creating post:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(getErrorMessage(err, 'Failed to create post. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="share">
      <div className="container">
        <div className="top">
          <img
            src={getProfilePictureUrl(currentUser?.profilePicture)}
            alt={`${currentUser?.name}'s profile`}
            className="profile-img"
            onError={(e) => {
              console.error('Share: Profile picture load error:', e);
              e.target.src = 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
            }}
          />
          <HashtagInput
            className="share-input"
            multiline
            placeholder={`What's on your mind ${currentUser?.name || ''}?`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </div>
        {filePreview && (
          <div className="preview">
            {filePreview.type === 'image' ? (
              <img src={filePreview.url} alt="Preview" className="preview-media" />
            ) : (
              filePreview.type === 'audio'
                ? <audio src={filePreview.url} controls className="preview-media audio" />
                : <video src={filePreview.url} controls className="preview-media" />
            )}
            <button
              className="remove-media"
              onClick={() => {
                setFile(null);
                setFilePreview(null);
              }}
            >
              Remove
            </button>
          </div>
        )}
        {location && (
          <div className="location">
            <span>Location: {location}</span>
            <button
              className="remove-location"
              onClick={() => setLocation('')}
            >
              Remove
            </button>
          </div>
        )}
        {taggedFriends.length > 0 && (
          <div className="tagged-friends">
            <span>
              Tagged:{' '}
              {taggedFriends
                .map((id) => friends.find((f) => f._id === id)?.name || 'Unknown')
                .join(', ')}
            </span>
            <button
              className="remove-tagged"
              onClick={() => setTaggedFriends([])}
            >
              Clear Tags
            </button>
          </div>
        )}
        <hr />
        <div className="bottom">
          <div className="left">
            <input
              type="file"
              id="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/x-m4a,.mp3,.wav,.ogg,.m4a,.aac"
              style={{ display: 'none' }}
              onChange={(e) => {
                const selectedFile = e.target.files[0];
                if (selectedFile) {
                  setFile(selectedFile);
                } else {
                  setFile(null);
                }
              }}
            />
            <label htmlFor="file">
              <div className="item">
                <img src={Image} alt="Add Media" />
                <span>Add Image/Video/Audio</span>
              </div>
            </label>
            <div className="item" onClick={() => {
              const loc = prompt('Enter location (e.g., New York, NY):');
              if (loc) setLocation(loc);
            }}>
              <img src={Map} alt="Add Place" />
              <span>Add Place</span>
            </div>
            <div className="item tag-toggle" onClick={() => setShowFriendsDropdown(!showFriendsDropdown)}>
              <img src={Friend} alt="Tag Friends" />
              <span>Tag Friends</span>
            </div>
            {showFriendsDropdown && (
              <div className="friends-dropdown">
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <div
                      key={friend._id}
                      className={`friend-option ${taggedFriends.includes(friend._id) ? 'selected' : ''}`}
                      onClick={() => toggleFriendTag(friend._id)}
                    >
                      <img
                        src={getProfilePictureUrl(friend.profilePicture)}
                        alt={`${friend.name}'s profile`}
                        className="friend-avatar"
                        onError={(e) => {
                          e.target.src = 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg?auto=compress&cs=tinysrgb&w=1600';
                        }}
                      />
                      <span>{friend.name}</span>
                    </div>
                  ))
                ) : (
                  <p>No friends to tag.</p>
                )}
              </div>
            )}
          </div>
          <div className="right">
            <button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
};

export default Share;