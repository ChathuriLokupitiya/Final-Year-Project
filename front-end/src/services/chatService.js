import api from './api';

const chatService = {
  getConversations: (params) => api.get('/chat/conversations', { params }),
  getMessages: (conversationId, params) => api.get(`/chat/${conversationId}/messages`, { params }),
  sendMessage: (conversationId, data) => api.post(`/chat/${conversationId}/messages`, data),
  markAsRead: (conversationId) => api.put(`/chat/${conversationId}/read`),
};

export default chatService;
