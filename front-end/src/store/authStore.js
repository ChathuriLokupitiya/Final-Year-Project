import { create } from 'zustand';
import api from '../services/api';

const useAuthStore = create((set) => ({
  user: null,
  token: sessionStorage.getItem('salon_access_token') || null,
  isAuthenticated: !!sessionStorage.getItem('salon_access_token'),
  isLoading: true, // Start true until we verify the session
  error: null,

  setToken: (token) => {
    sessionStorage.setItem('salon_access_token', token);
    set({ token, isAuthenticated: true });
  },

  clearAuth: () => {
    sessionStorage.removeItem('salon_access_token');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  // Fetch current user details
  fetchUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/auth/me'); // Assuming you have an endpoint that returns { data: user }
      set({ user: response.data.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // If 401, the interceptor might have already cleared the token
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Example Login action
  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      const { accessToken, user } = response.data.data;
      sessionStorage.setItem('salon_access_token', accessToken);
      set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Login failed', 
        isLoading: false 
      });
      return { success: false, error: error.response?.data?.message };
    }
  },
}));

export default useAuthStore;
