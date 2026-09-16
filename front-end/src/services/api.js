import axios from 'axios';

// Get base URL from env, or default to standard backend port
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for cookies/sessions if used
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('salon_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent multiple refresh token requests simultaneously
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for handling 401s
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't already retried this request and it's not a refresh or login request
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/auth/refresh') && 
      !originalRequest.url.includes('/auth/login')
    ) {
      
      if (isRefreshing) {
        // If already refreshing, queue the request and wait
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to refresh the token using the refresh cookie
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        
        const { accessToken } = response.data.data;
        
        // Save new token
        sessionStorage.setItem('salon_access_token', accessToken);
        
        // Process queued requests with the new token
        processQueue(null, accessToken);
        
        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear token and process queue with error
        processQueue(refreshError, null);
        sessionStorage.removeItem('salon_access_token');
        
        // Force a page reload or redirect to login (optional but recommended)
        window.location.href = '/login';
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
