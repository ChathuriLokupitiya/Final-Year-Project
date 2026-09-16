import api from './api';

const galleryService = {
  getGalleryImages: (params) => api.get('/gallery', { params }),
  getImageById: (id) => api.get(`/gallery/${id}`),
  uploadImage: (data) => api.post('/gallery', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateImage: (id, data) => api.put(`/gallery/${id}`, data),
  deleteImage: (id) => api.delete(`/gallery/${id}`),
};

export default galleryService;
