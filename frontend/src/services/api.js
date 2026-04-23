import axios from 'axios';

// Base axios instance — all requests go through here
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor ──────────────────────────────────────────────────────
// Attach JWT from localStorage to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────
// On 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data)  => api.post('/auth/signup', data),
  login:  (data)  => api.post('/auth/login',  data),
  me:     ()      => api.get('/auth/me'),
};

// ─── Posts ────────────────────────────────────────────────────────────────────
export const postsAPI = {
  create:     (data)        => api.post('/posts', data),
  getAll:     (params)      => api.get('/posts', { params }),
  getOne:     (id)          => api.get(`/posts/${id}`),
  update:     (id, data)    => api.patch(`/posts/${id}`, data),
  delete:     (id)          => api.delete(`/posts/${id}`),
  uploadMedia:(formData)    => api.post('/posts/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ─── Social Accounts ──────────────────────────────────────────────────────────
export const socialAPI = {
  status:       ()           => api.get('/social/status'),
  disconnect:   (platform)   => api.delete(`/social/${platform}/disconnect`),
  // OAuth flows are browser redirects — not axios calls
  // Token is passed as a query param because browser navigations can't set headers
  connectInstagram: () => {
    const token = localStorage.getItem('token');
    // Use ngrok URL for OAuth (Instagram requires HTTPS)
    const base  = import.meta.env.VITE_NGROK_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${base}/social/instagram/connect?token=${token}`;
  },
  connectLinkedIn: () => {
    const token = localStorage.getItem('token');
    const base  = import.meta.env.VITE_NGROK_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${base}/social/linkedin/connect?token=${token}`;
  },
};

export default api;
