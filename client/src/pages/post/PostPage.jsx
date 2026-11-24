import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { AuthContext } from '../../context/authContext';
import Post from '../../components/post/Post';
import './postPage.scss';

const PostPage = () => {
  const { postId } = useParams();
  const { currentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/posts/${postId}`)
      .then((res) => {
        if (cancelled) return;
        setPost({ ...res.data, media: res.data.image, desc: res.data.description });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.status === 404 ? 'This post no longer exists.' : err.response?.data?.message || 'Failed to load post.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [postId]);

  const handleLike = async (id) => {
    try {
      const res = await api.post(`/posts/${id}/like`, { userId: String(currentUser._id) });
      setPost((p) => ({ ...p, likes: res.data.likes, likesCount: res.data.likesCount, likedBy: res.data.likedBy }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to like post.');
    }
  };

  const handleComment = (id, data) => {
    setPost((p) => ({ ...p, comments: data.comments, commentsCount: data.commentsCount }));
  };

  return (
    <div className="post-page">
      <button className="back" onClick={() => navigate(-1)}>← Back</button>
      {loading && <p className="state">Loading post...</p>}
      {error && <p className="state error">{error}</p>}
      {post && !error && <Post post={post} onLike={handleLike} onCommentSubmit={handleComment} onDelete={() => navigate('/')} />}
    </div>
  );
};

export default PostPage;