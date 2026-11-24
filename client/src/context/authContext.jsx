import { createContext, useState, useEffect } from 'react';
import api, { getErrorMessage } from '../api/axios';

export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [accessToken, setAccessToken] = useState(sessionStorage.getItem('accessToken') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('accessToken');
    if (!storedToken) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    api
      .get('/users/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
      .then((res) => {
        if (!res.data || !res.data._id) {
          setError('Invalid user data. Please log in again.');
          setCurrentUser(null);
          setAccessToken(null);
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('accessToken');
        } else {
          const user = { ...res.data, id: res.data._id, _id: res.data._id };
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
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    try {
      setError(null);
      setLoading(true);
      const res = await api.post('/auth/login', {
        username,
        password,
      });
      const { user, token } = res.data;
      if (!user || !user._id || !token) {
        throw new Error('Invalid login response from server.');
      }
      const formattedUser = { ...user, id: user._id, _id: user._id };
      setCurrentUser(formattedUser);
      setAccessToken(token);
      sessionStorage.setItem('user', JSON.stringify(formattedUser));
      sessionStorage.setItem('accessToken', token);
      return true;
    } catch (err) {
      const message = getErrorMessage(err, 'Login failed. Please try again.');
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
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setAccessToken(null);
    setError(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('accessToken');
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, setCurrentUser, accessToken, login, logout, error, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};
