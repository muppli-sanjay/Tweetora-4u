import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(sessionStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('AuthContext: Initializing authentication');
    console.log('AuthContext: Stored accessToken=', sessionStorage.getItem('accessToken') || 'null');
    console.log('AuthContext: Stored user=', sessionStorage.getItem('user') || 'null');

    const storedToken = sessionStorage.getItem('accessToken');
    if (!storedToken) {
      console.log('AuthContext: No accessToken found, setting loading to false');
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    console.log('AuthContext: Verifying accessToken:', storedToken.substring(0, 20) + '...');
    axios
      .get('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
      .then((res) => {
        console.log('AuthContext: Token verification response=', {
          status: res.status,
          data: JSON.stringify(res.data, null, 2),
        });
        if (!res.data || !res.data._id) {
          console.log('AuthContext: Invalid or empty user data from /api/users/me');
          setError('Invalid user data. Please log in again.');
          setCurrentUser(null);
          setAccessToken(null);
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('accessToken');
        } else {
          const user = { ...res.data, id: res.data._id, _id: res.data._id };
          console.log('AuthContext: Setting currentUser=', {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            friends: user.friends?.length || 0,
          });
          setCurrentUser(user);
          setAccessToken(storedToken);
          sessionStorage.setItem('user', JSON.stringify(user));
        }
      })
      .catch((err) => {
        console.error('AuthContext: Token verification failed:', err.message);
        console.error('AuthContext: Error details:', {
          status: err.response?.status,
          data: JSON.stringify(err.response?.data, null, 2),
        });
        setCurrentUser(null);
        setAccessToken(null);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('accessToken');
        setError('Session expired or invalid token. Please log in again.');
      })
      .finally(() => {
        console.log('AuthContext: Token verification complete, loading=', false);
        console.log('AuthContext: currentUser=', currentUser ? JSON.stringify(currentUser, null, 2) : 'null');
        console.log('AuthContext: accessToken=', accessToken ? accessToken.substring(0, 20) + '...' : 'null');
        console.log('AuthContext: error=', error);
      });
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      console.log('AuthContext: Sending login request:', { username });
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password,
      });
      console.log('AuthContext: Login response=', {
        status: res.status,
        data: JSON.stringify(res.data, null, 2),
      });
      const { user, token } = res.data;
      if (!user || !user._id || !token) {
        console.log('AuthContext: Invalid login response, missing user._id or token');
        throw new Error('Invalid login response from server.');
      }
      const formattedUser = { ...user, id: user._id, _id: user._id };
      console.log('AuthContext: Setting currentUser after login=', {
        id: formattedUser.id,
        username: formattedUser.username,
        name: formattedUser.name,
        email: formattedUser.email,
        friends: formattedUser.friends?.length || 0,
      });
      setCurrentUser(formattedUser);
      setAccessToken(token);
      sessionStorage.setItem('user', JSON.stringify(formattedUser));
      sessionStorage.setItem('accessToken', token);
      return true;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      console.error('AuthContext: Login error:', {
        message: err.message,
        response: JSON.stringify(err.response?.data, null, 2),
        status: err.response?.status,
      });
      setError(message);
      setCurrentUser(null);
      setAccessToken(null);
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('accessToken');
      throw new Error(message);
    } finally {
      console.log('AuthContext: Login attempt complete, loading=', false);
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('AuthContext: Logging out');
    setCurrentUser(null);
    setAccessToken(null);
    setError(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    setLoading(false);
  };

  const refreshAccessToken = async () => {
    console.log('AuthContext: refreshAccessToken called (placeholder)');
    throw new Error('Refresh token not implemented');
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, setCurrentUser, accessToken, login, logout, error, loading, refreshAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};