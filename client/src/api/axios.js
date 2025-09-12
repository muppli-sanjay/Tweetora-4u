import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Axios Interceptor: Token expired or invalid', error.response.data);
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login'; // Use window.location for immediate redirect
    }
    return Promise.reject(error);
  }
);

export default api;