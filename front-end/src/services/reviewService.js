import api from './api';

const reviewService = {
  getAllReviews: (params) => api.get('/reviews', { params }),
  getReviewById: (id) => api.get(`/reviews/${id}`),
  createReview: (data) => api.post('/reviews', data),
  updateReview: (id, data) => api.put(`/reviews/${id}`, data),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
  getReviewsByService: (serviceId) => api.get(`/reviews/service/${serviceId}`),
};

export default reviewService;
