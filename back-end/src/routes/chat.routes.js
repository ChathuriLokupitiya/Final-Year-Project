const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');
const { createUploader } = require('../middleware/upload.middleware');

const uploadChatFile = createUploader('chat', 'file', 1);

router.use(protect);

router.post('/rooms', chatController.getOrCreateRoom);
router.get('/rooms', chatController.getMyRooms);
router.get('/rooms/:roomId/messages', chatController.getRoomMessages);
router.post('/rooms/:roomId/messages', uploadChatFile, chatController.sendMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);

module.exports = router;
