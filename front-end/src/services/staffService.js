import api from './api';

const staffService = {
  getAllStaff: (params) => api.get('/staff', { params }),
  getStaffById: (id) => api.get(`/staff/${id}`),
  createStaff: (data) => api.post('/staff', data),
  updateStaff: (id, data) => api.put(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),
  getStaffAvailability: (id, date) => api.get(`/staff/${id}/availability`, { params: { date } }),
};

export default staffService;
