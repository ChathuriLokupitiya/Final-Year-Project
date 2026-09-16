import api from './api';

const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
  googleLogin: () => api.get('/auth/google'),
};

export default authService;
