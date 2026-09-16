const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { createUploader } = require('../middleware/upload.middleware');

const uploadReviewImages = createUploader('reviews', 'images', 3);

// Public routes for fetching reviews
router.get('/', reviewController.getAllReviews);
router.get('/service/:serviceId', reviewController.getServiceReviews);
router.get('/staff/:staffId', reviewController.getStaffReviews);

router.use(protect);

router.post('/', uploadReviewImages, reviewController.createReview);
router.get('/my', reviewController.getMyReviews);
router.put('/:id', reviewController.updateReview);
router.delete('/:id', reviewController.deleteReview);
router.post('/:id/reply', authorize('admin'), reviewController.replyToReview);
router.get('/admin/all', authorize('admin'), reviewController.getAdminReviews);

module.exports = router;
