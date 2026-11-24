import './profile.scss';
import { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { renderHashtags } from '../../utils/hashtags';
import api, { SERVER_URL, getErrorMessage } from '../../api/axios';
import { AuthContext } from '../../context/authContext';
import Post from '../../components/post/Post';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CameraAltOutlinedIcon from '@mui/icons-material/CameraAltOutlined';
import CloseIcon from '@mui/icons-material/Close';

const BIO_MAX = 200;

const pictureUrl = (pic) => {
  if (!pic) return null;
  return pic.startsWith('http') ? pic : `${SERVER_URL}${pic}`;
};

const formatDob = (dob) =>
  new Date(dob).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const Avatar = ({ user, size = 56, src }) => {
  const url = src || pictureUrl(user?.profilePicture);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (url && !failed) {
    return <img className="avatar" style={{ width: size, height: size }} src={url} alt="" onError={() => setFailed(true)} />;
  }
  return (
    <span className="avatar fallback" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {(user?.name || user?.username || '?').charAt(0).toUpperCase()}
    </span>
  );
};

const Profile = () => {
  const { id } = useParams();
  const { currentUser, setCurrentUser, accessToken } = useContext(AuthContext);
  const navigate = useNavigate();
  const isOwn = currentUser && String(currentUser._id) === id;

  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [taggedPosts, setTaggedPosts] = useState([]);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', bio: '', dob: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  const headers = { Authorization: `Bearer ${accessToken}` };

  const load = useCallback(async () => {
    try {
      const [userRes, postsRes, taggedRes] = await Promise.all([
        api.get(`/users/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        api.get(`/posts/user/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        api.get(`/posts/tagged/${id}`, { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      setUser(userRes.data);
      setPosts(
        (postsRes.data || []).map((p) => ({ ...p, media: p.image, desc: p.description }))
      );
      setTaggedPosts(
        (taggedRes.data || []).map((p) => ({ ...p, media: p.image, desc: p.description }))
      );
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) return navigate('/login');
      setError(err.response?.data?.message || 'Failed to load profile.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken, navigate]);

  useEffect(() => {
    if (!currentUser || !accessToken) {
      navigate('/login');
      return;
    }
    setLoading(true);
    setTab('posts');
    setEditing(false);
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [id, currentUser?._id, accessToken, load, navigate]);

  const openEditor = () => {
    setForm({
      name: user.name || '',
      username: user.username || '',
      bio: user.bio || '',
      dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    });
    setFile(null);
    setPreview(null);
    setFormError(null);
    setEditing(true);
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!/^image\/(jpe?g|png|gif|webp)$/.test(f.type)) {
      setFormError('Profile picture must be a JPG, PNG, GIF or WebP image.');
      return;
    }
    setFormError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 1) return setFormError('Name is required.');
    if (form.username.trim().length < 3) return setFormError('Username must be at least 3 characters.');
    setSaving(true);
    setFormError(null);
    const data = new FormData();
    data.append('name', form.name.trim());
    data.append('username', form.username.trim());
    data.append('bio', form.bio);
    if (form.dob) data.append('dob', form.dob);
    if (file) data.append('profilePicture', file);
    try {
      const res = await api.put(`/users/${id}`, data, { headers });
      const updated = { ...user, ...res.data, _id: String(res.data._id), friends: user.friends };
      setUser(updated);
      // keep navbar / session in sync
      const session = { ...currentUser, name: updated.name, username: updated.username, profilePicture: updated.profilePicture };
      setCurrentUser(session);
      sessionStorage.setItem('user', JSON.stringify(session));
      setEditing(false);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const removeFriend = async (friend) => {
    if (!window.confirm(`Remove ${friend.name || friend.username} from your friends?`)) return;
    setRemovingId(friend._id);
    try {
      await api.delete(`/users/${friend._id}/friends`, { headers });
      setUser((u) => ({ ...u, friends: u.friends.filter((f) => f._id !== friend._id) }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove friend.');
    } finally {
      setRemovingId(null);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/posts/${postId}/like`, { userId: String(currentUser._id) }, { headers });
      const patch = (list) =>
        list.map((p) => (p._id === postId ? { ...p, likes: res.data.likes, likesCount: res.data.likesCount, likedBy: res.data.likedBy } : p));
      setPosts(patch);
      setTaggedPosts(patch);
    } catch (err) {
      console.error('Profile: like failed', err.message);
    }
  };

  const handleComment = (postId, data) => {
    const patch = (list) =>
      list.map((p) => (p._id === postId ? { ...p, comments: data.comments, commentsCount: data.commentsCount } : p));
    setPosts(patch);
    setTaggedPosts(patch);
  };

  if (loading) return <div className="profile-page"><p className="state">Loading profile...</p></div>;
  if (error && !user) return <div className="profile-page"><p className="state error">{error}</p></div>;
  if (!user) return null;

  const isFriend = !isOwn && user.friends.some((f) => String(f._id) === String(currentUser._id));

  return (
    <div className="profile-page">
      <div className="header-card">
        <div className="banner" />
        <div className="header-body">
          <Avatar user={user} size={116} />
          <div className="identity">
            <h2>{user.name}</h2>
            <span className="handle">@{user.username}</span>
          </div>
          <div className="actions">
            {isOwn && (
              <button className="primary" onClick={openEditor}>
                <EditOutlinedIcon fontSize="small" /> Edit profile
              </button>
            )}
            {isFriend && (
              <button className="primary" onClick={() => navigate(`/messages/${user._id}`)}>
                <ChatBubbleOutlineIcon fontSize="small" /> Message
              </button>
            )}
          </div>
        </div>
        <div className="about-line">
          {user.bio ? <p className="bio">{renderHashtags(user.bio)}</p> : isOwn && <p className="bio muted">Add a bio to tell people about yourself.</p>}
          {user.dob && (
            <span className="meta"><CakeOutlinedIcon fontSize="small" /> Born {formatDob(user.dob)}</span>
          )}
        </div>
        <div className="stats">
          <button onClick={() => setTab('posts')}><strong>{posts.length}</strong> Posts</button>
          <button onClick={() => setTab('friends')}><strong>{user.friends.length}</strong> Friends</button>
        </div>
        <div className="tabs">
          <button className={tab === 'posts' ? 'active' : ''} onClick={() => setTab('posts')}>Posts</button>
          <button className={tab === 'tagged' ? 'active' : ''} onClick={() => setTab('tagged')}>Tagged</button>
          <button className={tab === 'friends' ? 'active' : ''} onClick={() => setTab('friends')}>Friends</button>
        </div>
      </div>

      {error && <p className="state error">{error}</p>}

      {tab === 'posts' && (
        <div className="posts-list">
          {posts.length === 0 ? (
            <p className="state">{isOwn ? "You haven't posted anything yet." : 'No posts yet.'}</p>
          ) : (
            posts.map((post) => (
              <Post key={post._id} post={post} onLike={handleLike} onCommentSubmit={handleComment} onDelete={(pid) => setPosts((prev) => prev.filter((p) => p._id !== pid))} />
            ))
          )}
        </div>
      )}

      {tab === 'tagged' && (
        <div className="posts-list">
          {taggedPosts.length === 0 ? (
            <p className="state">{isOwn ? "You haven't been tagged in any posts yet." : 'Not tagged in any posts yet.'}</p>
          ) : (
            taggedPosts.map((post) => (
              <Post
                key={post._id}
                post={post}
                onLike={handleLike}
                onCommentSubmit={handleComment}
                onDelete={(pid) => {
                  setTaggedPosts((prev) => prev.filter((p) => p._id !== pid));
                  setPosts((prev) => prev.filter((p) => p._id !== pid));
                }}
              />
            ))
          )}
        </div>
      )}

      {tab === 'friends' && (
        <div className="friends-grid">
          {user.friends.length === 0 ? (
            <p className="state">{isOwn ? 'No friends yet. Find people on the Add Friends page.' : 'No friends to show.'}</p>
          ) : (
            user.friends.map((f) => (
              <div key={f._id} className="friend-card">
                <Link to={`/profile/${f._id}`} className="friend-link">
                  <Avatar user={f} size={64} />
                  <strong>{f.name}</strong>
                  <span>@{f.username}</span>
                </Link>
                {isOwn && (
                  <div className="friend-actions">
                    <button onClick={() => navigate(`/messages/${f._id}`)}>Message</button>
                    <button className="danger" disabled={removingId === f._id} onClick={() => removeFriend(f)}>
                      {removingId === f._id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => !saving && setEditing(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <div className="modal-head">
              <h3>Edit profile</h3>
              <button type="button" className="icon" onClick={() => setEditing(false)} aria-label="Close"><CloseIcon /></button>
            </div>

            <label className="photo-picker">
              <Avatar user={user} size={96} src={preview} />
              <span className="camera"><CameraAltOutlinedIcon fontSize="small" /></span>
              <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleFile} hidden />
            </label>
            <p className="hint center">Click the photo to change it (JPG, PNG, GIF or WebP)</p>

            <label>
              <span>Name</span>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              <span>Username</span>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} minLength={3} required />
            </label>
            <label>
              <span>Bio</span>
              <textarea
                rows={3}
                maxLength={BIO_MAX}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell people about yourself"
              />
              <small className="hint right">{form.bio.length}/{BIO_MAX}</small>
            </label>
            <label>
              <span>Date of birth</span>
              <input type="date" max={new Date().toISOString().split('T')[0]} value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
              <button type="submit" className="primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;