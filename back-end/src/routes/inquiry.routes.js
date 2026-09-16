const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiry.controller');
const { protect } = require('../middleware/auth.middleware');
const { isStaff, isAdmin } = require('../middleware/role.middleware');

// Public route for customers to submit inquiries
router.post('/', inquiryController.createInquiry);

// Protected routes for admin/staff to view and manage inquiries
router.use(protect, isStaff);
router.get('/', inquiryController.getInquiries);
router.patch('/:id/status', inquiryController.updateInquiryStatus);

module.exports = router;
