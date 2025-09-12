import "./post.scss";
import FavoriteBorderOutlinedIcon from "@mui/icons-material/FavoriteBorderOutlined";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import TextsmsOutlinedIcon from "@mui/icons-material/TextsmsOutlined";
import ShareOutlinedIcon from "@mui/icons-material/ShareOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/authContext";
import axios from "axios";

const Post = ({ post, onLike, onCommentSubmit }) => {
  const { currentUser, accessToken } = useContext(AuthContext);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentInput, setCommentInput] = useState("");

  const getMediaType = (mediaUrl) => {
    if (!mediaUrl) return null;
    const ext = mediaUrl.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
    return null;
  };

  const getMediaUrl = (media) => {
    if (!media) return null;
    if (media.startsWith('http')) return media;
    const normalizedPath = media.replace(/^\/Uploads\//i, '/Uploads/');
    const url = `http://localhost:5000${normalizedPath}?t=${new Date().getTime()}`;
    console.log('Post: Media URL=', url); // Debug
    return url;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    const content = commentInput.trim();
    if (!content) return;

    try {
      if (!accessToken || !currentUser || !currentUser._id) {
        throw new Error('No authentication token or user ID found.');
      }
      const userId = String(currentUser._id);
      console.log(`Post: Submitting comment for post ${post._id} with userId: ${userId}, content: ${content}`);
      
      const res = await axios.post(
        `http://localhost:5000/api/posts/${post._id}/comment`,
        { userId, content },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      console.log(`Post: Comment response for post ${post._id}:`, res.data);
      onCommentSubmit?.(post._id, res.data);
      setCommentInput("");
    } catch (err) {
      console.error('Post: Error submitting comment:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
    }
  };

  // Use post.media if available, fallback to post.image
  const media = post.media || post.image;
  const mediaType = getMediaType(media);
  const mediaUrl = getMediaUrl(media);

  return (
    <div className="post">
      <div className="container">
        <div className="user">
          <div className="userInfo">
            <img
              src={getMediaUrl(post.userId?.profilePicture || post.profilePic) || 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg'}
              alt={`${post.userId?.name || post.name}'s profile`}
              onError={(e) => {
                e.target.src = 'https://images.pexels.com/photos/3228727/pexels-photo-3228727.jpeg';
              }}
            />
            <div className="details">
              <Link
                to={`/profile/${post.userId?._id || post.userId}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <span className="name">{post.userId?.name || post.name}</span>
              </Link>
              <span className="date">{new Date(post.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <MoreHorizIcon />
        </div>
        <div className="content">
          {(post.desc || post.description) && <p>{post.desc || post.description}</p>}
          {mediaType === 'image' && mediaUrl && (
            <img
              src={mediaUrl}
              alt="Post media"
              className="post-media"
              onError={(e) => {
                console.error('Post: Image load error:', e, 'URL=', mediaUrl);
                e.target.style.display = 'none';
              }}
            />
          )}
          {mediaType === 'video' && mediaUrl && (
            <video
              src={mediaUrl}
              controls
              className="post-media"
              onError={(e) => {
                console.error('Post: Video load error:', e, 'URL=', mediaUrl);
                e.target.style.display = 'none';
              }}
            />
          )}
          {post.location && <p className="location">📍 {post.location}</p>}
          {post.taggedFriends?.length > 0 && (
            <p className="tagged">
              Tagged: {post.taggedFriends.map((f) => f.name).join(', ')}
            </p>
          )}
        </div>
        <div className="info">
          <div className="item" onClick={() => onLike?.(post._id)}>
            {post.likedBy?.includes(currentUser?._id) ? (
              <FavoriteOutlinedIcon className="liked" />
            ) : (
              <FavoriteBorderOutlinedIcon />
            )}
            {post.likesCount || 0} {post.likesCount === 1 ? 'Like' : 'Likes'}
          </div>
          <div className="item" onClick={() => setCommentOpen(!commentOpen)}>
            <TextsmsOutlinedIcon />
            {post.commentsCount || 0} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
          </div>
          <div className="item">
            <ShareOutlinedIcon />
            Share
          </div>
        </div>
        {commentOpen && (
          <div className="comments">
            <form onSubmit={handleCommentSubmit}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
              />
              <button type="submit" disabled={!commentInput.trim()}>
                Post
              </button>
            </form>
            {post.comments?.length > 0 && (
              <div className="comments-list">
                {post.comments.map((comment) => (
                  <div key={comment._id} className="comment">
                    <span className="comment-user">{comment.userId?.name || 'Unknown'}</span>
                    <span className="comment-content">{comment.content}</span>
                    <span className="comment-timestamp">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Post;
