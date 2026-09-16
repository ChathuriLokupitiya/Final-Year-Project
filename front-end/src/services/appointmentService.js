import api from './api';

const appointmentService = {
  getAllAppointments: (params) => api.get('/admin/appointments', { params }),
  getMyAppointments: (params) => api.get('/appointments/my', { params }),
  getAppointmentById: (id) => api.get(`/appointments/${id}`),
  createAppointment: (data) => api.post('/appointments', data),
  updateAppointment: (id, data) => api.put(`/appointments/${id}`, data),
  cancelAppointment: (id) => api.delete(`/appointments/${id}`),
  getAvailableSlots: (params) => api.get('/appointments/slots', { params }),
};

export default appointmentService;
