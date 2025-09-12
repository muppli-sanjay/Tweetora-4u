import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/authContext';
import './login.scss';

const Login = () => {
  const { login, error: authError } = useContext(AuthContext);
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
  });
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setLocalError(null);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setLocalError(null);
    console.log('Attempting login:', inputs);

    try {
      const success = await login(inputs.username, inputs.password);
      console.log('Login result:', success);
      setLoading(false);
      if (success) {
        console.log('Navigating to Home');
        navigate('/', { replace: true });
      } else {
        setLocalError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err.message);
      setLocalError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="card">
        <div className="left">
          <h2>Hey! Tweeps Login Now And Enjoy YourSocial Services.</h2>
          <p>
            Unlock Your World: Log in to connect with friends, share your story, and discover the latest trends!
            Let’s make some memories together!
          </p>
          <span>Don't you have an account?</span>
          <Link to="/register">
            <button>Register</button>
          </Link>
        </div>
        <div class="right">
          <h1>Login</h1>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              name="username"
              value={inputs.username}
              onChange={handleChange}
              required
            />
            <input
              type="password"
              placeholder="Password"
              name="password"
              value={inputs.password}
              onChange={handleChange}
              required
            />
            {(localError || authError) && (
              <p className="error">{localError || authError}</p>
            )}
            <button type="submit" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;