import "./post.scss";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import TextsmsOutlinedIcon from "@mui/icons-material/TextsmsOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import LinkIcon from "@mui/icons-material/Link";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Link } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../context/authContext";
import api, { fileUrl } from '../../api/axios';
import { renderHashtags, getYouTubeId } from '../../utils/hashtags';
import HashtagInput from '../hashtag/HashtagInput';

const timeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (isNaN(seconds) || seconds < 45) return 'just now';
  const units = [['y', 31536000], ['w', 604800], ['d', 86400], ['h', 3600], ['m', 60]];
  for (const [label, size] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label}`;
  }
  return 'just now';
};

const Avatar = ({ user, fallbackName, size = 44 }) => {
  const [failed, setFailed] = useState(false);
  const url = fileUrl(user?.profilePicture);
  const name = user?.name || fallbackName || '?';
  if (url && !failed) {
    return <img className="avatar" style={{ width: size, height: size }} src={url} alt="" onError={() => setFailed(true)} />;
  }
  return (
    <span className="avatar fallback" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

const Post = ({ post, onLike, onCommentSubmit, onBookmarkChange, onDelete }) => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
  const [saving, setSaving] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setBookmarked(!!post.bookmarked), [post.bookmarked]);

  // close the menu when clicking elsewhere
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const toggleBookmark = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await api.post(`/posts/${post._id}/bookmark`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setBookmarked(res.data.bookmarked);
      if (onBookmarkChange) onBookmarkChange(post._id, res.data.bookmarked);
    } catch (err) {
      console.error('Bookmark failed', err);
    } finally {
      setSaving(false);
      setMenuOpen(false);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await api.delete(`/posts/${post._id}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      setDeleted(true);
      if (onDelete) onDelete(post._id);
    } catch (err) {
      window.alert(err.response?.data?.message || 'Could not delete the post. Please try again.');
    }
  };

  const copyPostLink = async () => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`); } catch (e) { /* ignore */ }
    setMenuOpen(false);
  };

  const getMediaType = (mediaUrl) => {
    if (!mediaUrl) return null;
    const ext = mediaUrl.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    return null;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const content = commentInput.trim();
    if (!content) return;

    try {
      if (!accessToken || !currentUser || !currentUser._id) {
        throw new Error('No authentication token or user ID found.');
      }
      const res = await api.post(`/posts/${post._id}/comment`, { userId: String(currentUser._id), content });
      onCommentSubmit?.(post._id, res.data);
      setCommentInput("");
    } catch (err) {
      console.error('Post: Error submitting comment:', err.response?.data?.message || err.message);
    }
  };

  const handleShare = async () => {
    const link = `${window.location.origin}/post/${post._id}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this link:', link);
    }
  };

  const media = post.media || post.image;
  const mediaType = getMediaType(media);
  const mediaUrl = fileUrl(media);
  const author = post.userId && typeof post.userId === 'object' ? post.userId : null;
  const authorId = author?._id || post.userId;
  const authorName = author?.name || post.name || 'Unknown';
  const isOwner = !!currentUser && String(authorId) === String(currentUser._id);
  const text = post.desc || post.description;
  const liked = post.likedBy?.includes(String(currentUser?._id));
  const likes = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;
  const [mediaFailed, setMediaFailed] = useState(false);

  const videoId = getYouTubeId(text);

  if (deleted) return null;

  return (
    <article className="post">
      <header className="post-head">
        <Link to={`/profile/${authorId}`} className="author">
          <span className="ring"><Avatar user={author || { profilePicture: post.profilePicture, name: authorName }} fallbackName={authorName} /></span>
          <span className="who">
            <strong>{authorName}</strong>
            <small title={new Date(post.createdAt).toLocaleString()}>
              {author?.username && <>@{author.username} · </>}{timeAgo(post.createdAt)}
            </small>
          </span>
        </Link>
        <div className="more-wrap" ref={menuRef}>
          <button className="more" aria-label="More options" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
            {bookmarked ? <BookmarkIcon className="saved-dot" /> : null}<MoreHorizIcon />
          </button>
          {menuOpen && (
            <div className="more-menu" role="menu">
              <button role="menuitem" onClick={toggleBookmark} disabled={saving}>
                {bookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                {bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              </button>
              <button role="menuitem" onClick={copyPostLink}><LinkIcon />Copy link</button>
              {isOwner && (
                <button role="menuitem" className="danger" onClick={handleDelete}><DeleteOutlineIcon />Delete post</button>
              )}
            </div>
          )}
        </div>
      </header>

      {text && <p className="text">{renderHashtags(text, { links: true })}</p>}

      {videoId && (
        <div className="yt-embed">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
            title="YouTube video"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}

      {(post.location || post.taggedFriends?.length > 0) && (
        <div className="chips">
          {post.location && <span className="chip">📍 {post.location}</span>}
          {post.taggedFriends?.map((f) => (
            <Link key={f._id} to={`/profile/${f._id}`} className="chip tag">@{f.username || f.name}</Link>
          ))}
        </div>
      )}

      {mediaType && mediaUrl && !mediaFailed && (
        <div className={`media-frame ${mediaType}`}>
          {mediaType === 'image' && (
            <>
              <div className="backdrop" style={{ backgroundImage: `url(${mediaUrl})` }} />
              <img src={mediaUrl} alt="Post media" className="post-media" loading="lazy" onError={() => setMediaFailed(true)} />
            </>
          )}
          {mediaType === 'audio' && (
            <audio src={mediaUrl} controls preload="none" className="post-audio" onError={() => setMediaFailed(true)} />
          )}
          {mediaType === 'video' && (
            <video src={mediaUrl} controls className="post-media" onError={() => setMediaFailed(true)} />
          )}
        </div>
      )}

      <div className="stats">
        <span>{likes} {likes === 1 ? 'like' : 'likes'}</span>
        <span className="dot">•</span>
        <button onClick={() => setCommentOpen(!commentOpen)}>{commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}</button>
      </div>

      <div className="actions">
        <button className={`action like ${liked ? 'active' : ''}`} onClick={() => onLike?.(post._id)}>
          {liked ? <FavoriteOutlinedIcon className="pop" /> : <FavoriteBorderOutlinedIcon />}
          <span>{liked ? 'Liked' : 'Like'}</span>
        </button>
        <button className={`action ${commentOpen ? 'active' : ''}`} onClick={() => setCommentOpen(!commentOpen)}>
          <TextsmsOutlinedIcon />
          <span>Comment</span>
        </button>
        <button className={`action ${copied ? 'active' : ''}`} onClick={handleShare}>
          <ShareOutlinedIcon />
          <span>{copied ? 'Link copied!' : 'Share'}</span>
        </button>
      </div>

      {commentOpen && (
        <div className="comments">
          <form onSubmit={handleCommentSubmit}>
            <Avatar user={currentUser} size={32} />
            <HashtagInput
              className="comment-input"
              type="text"
              placeholder="Write a comment..."
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
            />
            <button type="submit" disabled={!commentInput.trim()}>Post</button>
          </form>
          {post.comments?.length > 0 && (
            <div className="comments-list">
              {post.comments.map((comment) => (
                <div key={comment._id} className="comment">
                  <Avatar user={comment.userId} size={32} />
                  <div className="bubble">
                    <strong>{comment.userId?.name || 'Unknown'}</strong>
                    <span>{renderHashtags(comment.content, { links: true })}</span>
                    <small>{timeAgo(comment.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default Post;