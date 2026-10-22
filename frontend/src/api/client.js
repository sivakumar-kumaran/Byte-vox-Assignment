import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30_000,
});

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('bv_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally (token expired / revoked)
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/')) {
      localStorage.removeItem('bv_token');
      localStorage.removeItem('bv_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
