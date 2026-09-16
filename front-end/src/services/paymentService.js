import api from './api';

const paymentService = {
  createPaymentIntent: (data) => api.post('/payments/create-intent', data),
  getPaymentHistory: (params) => api.get('/payments/history', { params }),
  getPaymentById: (id) => api.get(`/payments/${id}`),
  refundPayment: (id, data) => api.post(`/payments/${id}/refund`, data),
};

export default paymentService;
