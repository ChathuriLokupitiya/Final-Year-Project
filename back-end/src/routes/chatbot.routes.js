const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const { chatbotLimiter } = require('../middleware/rateLimiter.middleware');

router.post('/ask', chatbotLimiter, chatbotController.askChatbot);

module.exports = router;
