import api from './api';

const adminService = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getRevenueAnalytics: (params) => api.get('/admin/analytics/revenue', { params }),
  getPopularServices: () => api.get('/admin/analytics/popular-services'),
  getPeakHours: () => api.get('/admin/analytics/peak-hours'),
  getRetention: () => api.get('/admin/analytics/retention'),
  getReportPreview: (params) => api.get('/admin/reports/preview', { params }),
  exportReport: (params) =>
    api.get('/admin/reports/export', { params, responseType: 'blob' }),
  generateBusinessReport: () => api.post('/admin/business-reports'),
  listBusinessReports: (params) => api.get('/admin/business-reports', { params }),
  getBusinessReport: (id) => api.get(`/admin/business-reports/${id}`),
  deleteBusinessReport: (id) => api.delete(`/admin/business-reports/${id}`),
  downloadBusinessReport: (id, format = 'pdf') =>
    api.get(`/admin/business-reports/${id}/download`, {
      params: { format },
      responseType: 'blob',
    }),
};

export default adminService;
