import axios from 'axios';

// Set VITE_SERVER_URL in client/.env to point the app at a different backend.
export const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

// Turns a stored upload path (e.g. /Uploads/123.png) into a full URL.
export const fileUrl = (path) => {
  if (!path) return '';
  return /^https?:\/\//i.test(path) ? path : `${SERVER_URL}${path}`;
};

const api = axios.create({ baseURL: `${SERVER_URL}/api` });

// Attach the access token to every request unless the caller set one.
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken');
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// An expired or invalid token on a protected request sends the user back to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthCall) {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// One readable sentence for any failed request (server message first, then a sensible fallback).
export const getErrorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const res = err?.response;
  if (res) {
    if (res.data?.message) return res.data.message;
    const byStatus = {
      400: 'Some of the information you entered is not valid.',
      401: 'Please log in to continue.',
      403: "You don't have permission to do that.",
      404: 'We could not find what you were looking for.',
      409: 'That already exists.',
      413: 'That file is too large.',
      429: 'Too many attempts. Please wait a moment and try again.',
    };
    if (byStatus[res.status]) return byStatus[res.status];
    if (res.status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
    return fallback;
  }
  if (err?.code === 'ECONNABORTED') return 'The request took too long. Please try again.';
  if (err?.request) return 'Cannot reach the server. Check your internet connection and make sure the server is running.';
  return fallback;
};

// { field: "problem" } map sent by the server for form validation errors
export const getFieldErrors = (err) => err?.response?.data?.errors || {};

export default api;