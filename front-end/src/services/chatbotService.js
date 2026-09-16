import api from './api';

const chatbotService = {
  ask: (message, history = []) =>
    api.post('/chatbot/ask', { message, history }),
};

export default chatbotService;
