import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage, getFieldErrors } from '../../api/axios';
import logo from '../../assets/logo.png';
import './register.scss';

const strengthOf = (pw) => {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0-4
};
const STRENGTH_LABELS = ['', 'Weak', 'Okay', 'Good', 'Strong'];

// Same rules the server enforces, so mistakes are caught before sending anything
const validate = ({ name, username, email, password }) => {
  const errors = {};
  if (!name.trim()) errors.name = 'Please enter your name';
  else if (name.trim().length > 50) errors.name = 'Name must be at most 50 characters';

  const u = username.trim();
  if (!u) errors.username = 'Please choose a username';
  else if (u.length < 3) errors.username = 'Username must be at least 3 characters';
  else if (u.length > 20) errors.username = 'Username must be at most 20 characters';
  else if (!/^[A-Za-z0-9_.]+$/.test(u)) errors.username = 'Use only letters, numbers, dots and underscores';

  if (!email.trim()) errors.email = 'Please enter your email';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) errors.email = 'Please enter a valid email address';

  if (!password) errors.password = 'Please choose a password';
  else if (password.length < 6) errors.password = 'Password must be at least 6 characters';
  else if (password.length > 72) errors.password = 'Password must be at most 72 characters';
  return errors;
};

const Register = () => {
  const [inputs, setInputs] = useState({ name: '', username: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const strength = strengthOf(inputs.password);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
    // clear the message for a field as soon as the user edits it
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    setError(null);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const errors = validate(inputs);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setLoading(true);
    try {
      await api.post('/auth/register', {
        ...inputs,
        name: inputs.name.trim(),
        username: inputs.username.trim(),
        email: inputs.email.trim(),
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      const serverFieldErrors = getFieldErrors(err);
      if (Object.keys(serverFieldErrors).length) {
        setFieldErrors(serverFieldErrors);
      } else {
        setError(getErrorMessage(err, 'Registration failed. Please try again.'));
      }
    } finally {
      setLoading(false);
    }
  };

  // one labelled input with its inline error message
  const field = (name, label, props = {}) => (
    <label className={`field ${props.full ? 'full' : ''} ${fieldErrors[name] ? 'invalid' : ''}`}>
      <span>{label}</span>
      <input name={name} value={inputs[name]} onChange={handleChange} aria-invalid={!!fieldErrors[name]} {...props.input} />
      {fieldErrors[name] && <em className="field-error">{fieldErrors[name]}</em>}
      {props.extra}
    </label>
  );

  return (
    <div className="register">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <div className="blob blob-c" />

      <div className="card">
        <div className="card-head">
          <img src={logo} alt="Tweetora-4u" className="logo" />
          <h1>Create your account</h1>
          <p>Join Tweetora-4u and start sharing your thoughts with the people you care about.</p>
        </div>

        <form onSubmit={handleRegister} noValidate>
          <div className="grid">
            {field('name', 'Full name', { input: { type: 'text', placeholder: 'Jane Doe', autoComplete: 'name' } })}
            {field('username', 'Username', { input: { type: 'text', placeholder: 'jane_doe', autoComplete: 'username' } })}
            {field('email', 'Email', { full: true, input: { type: 'email', placeholder: 'jane@example.com', autoComplete: 'email' } })}
            {field('password', 'Password', {
              full: true,
              input: { type: 'password', placeholder: 'At least 6 characters', autoComplete: 'new-password' },
              extra: inputs.password && !fieldErrors.password && (
                <div className={`strength level-${strength}`}>
                  <div className="bars">
                    {[1, 2, 3, 4].map((i) => (
                      <i key={i} className={i <= strength ? 'on' : ''} />
                    ))}
                  </div>
                  <small>{STRENGTH_LABELS[strength] || 'Too short'}</small>
                </div>
              ),
            })}
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="switch">
          Already a Tweep? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
