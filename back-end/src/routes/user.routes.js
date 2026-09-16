const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { createUploader } = require('../middleware/upload.middleware');
const { updateProfileValidator } = require('../validators/user.validator');

const uploadAvatar = createUploader('avatars', 'avatar', 1);

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', updateProfileValidator, validate, userController.updateProfile);
router.post('/avatar', uploadAvatar, userController.uploadAvatar);
router.delete('/account', userController.deleteAccount);
router.get('/booking-history', userController.getBookingHistory);
router.get('/loyalty-points', userController.getLoyaltyPoints);
router.get('/loyalty-offers', userController.getActiveLoyaltyOffers);
router.post('/loyalty-offers/preview', userController.previewLoyaltyOffer);
router.get('/my-coupons', userController.getMyCoupons);
router.get('/wishlist', userController.getWishlist);
router.post('/wishlist/services/:serviceId', userController.toggleWishlistService);
router.post('/wishlist/consulton/:consultonId', userController.toggleWishlistConsulton);

module.exports = router;
