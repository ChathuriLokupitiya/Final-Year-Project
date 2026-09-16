import api from './api';

const userService = {
  getProfile: (userId) => api.get(`/users/${userId}`),
  updateMyProfile: (data) => api.put(`/users/profile`, data),
  uploadMyAvatar: (formData) => api.post(`/users/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateProfile: (userId, data) => api.put(`/users/${userId}`, data),
  deleteProfile: (userId) => api.delete(`/users/${userId}`),
  getAllUsers: (params) => api.get('/users', { params }),
  getWishlist: () => api.get('/users/wishlist'),
  getLoyaltyPoints: (params) => api.get('/users/loyalty-points', { params }),
  getLoyaltyOffers: (params) => api.get('/users/loyalty-offers', { params }),
  previewLoyaltyOffer: (data) => api.post('/users/loyalty-offers/preview', data),
  getMyCoupons: () => api.get('/users/my-coupons'),
  toggleWishlistService: (serviceId) => api.post(`/users/wishlist/services/${serviceId}`),
  toggleWishlistConsulton: (consultonId) => api.post(`/users/wishlist/consulton/${consultonId}`),
};

export default userService;
