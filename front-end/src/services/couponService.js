import api from './api';

const couponService = {
  getAllCoupons: (params) => api.get('/coupons', { params }),
  getCouponById: (id) => api.get(`/coupons/${id}`),
  validateCoupon: (data) => api.post('/coupons/validate', data),
  createCoupon: (data) => api.post('/coupons', data),
  updateCoupon: (id, data) => api.put(`/coupons/${id}`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}`),
};

export default couponService;
