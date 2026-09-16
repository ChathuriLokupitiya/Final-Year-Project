const express = require('express');
const router = express.Router();
const couponController = require('../controllers/coupon.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { couponValidator } = require('../validators/user.validator');

router.use(protect);

router.post('/validate', couponController.validateCoupon);

router.use(isAdmin);
router.get('/', couponController.getAllCoupons);
router.post('/', couponValidator, validate, couponController.createCoupon);
router.put('/:id', couponController.updateCoupon);
router.delete('/:id', couponController.deleteCoupon);

module.exports = router;
