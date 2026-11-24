import { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { AuthContext } from '../../context/authContext';
import logo from '../../assets/logo.png';
import icon from '../../assets/logo-icon.png';
import './login.scss';

const Login = () => {
  const { login, error: authError } = useContext(AuthContext);
  const [inputs, setInputs] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setLocalError(null);

    try {
      const success = await login(inputs.username, inputs.password);
      setLoading(false);
      if (success) {
        navigate('/', { replace: true });
      } else {
        setLocalError('Login failed. Please try again.');
      }
    } catch (err) {
      setLocalError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <aside className="brand">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <div className="brand-content">
          <img src={icon} alt="" className="brand-icon" />
          <h1>Welcome back to Tweetora-4u</h1>
          <p className="tagline">Your Thoughts. Your Connections.</p>
          <ul>
            <li>Share what's on your mind, instantly</li>
            <li>Stay close to the people who matter</li>
            <li>Never miss a like, comment or request</li>
          </ul>
        </div>
      </aside>

      <main className="panel">
        <div className="form-wrap">
          <img src={logo} alt="Tweetora-4u" className="logo" />
          <h2>Log in</h2>
          <p className="subtitle">Enter your details to jump back in.</p>
          {location.state?.registered && (
            <p className="success" role="status">Account created! Log in to get started.</p>
          )}

          <form onSubmit={handleLogin}>
            <label className="field">
              <span>Username</span>
              <div className="input">
                <PersonOutlineIcon fontSize="small" />
                <input
                  type="text"
                  placeholder="your_username"
                  name="username"
                  value={inputs.username}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input">
                <LockOutlinedIcon fontSize="small" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  name="password"
                  value={inputs.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                </button>
              </div>
            </label>

            {(localError || authError) && <p className="error" role="alert">{localError || authError}</p>}

            <button type="submit" className="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Log in'}
            </button>
          </form>

          <p className="switch">
            New to Tweetora-4u? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
