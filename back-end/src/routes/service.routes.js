const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/service.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { createUploader } = require('../middleware/upload.middleware');
const { createServiceValidator, updateServiceValidator } = require('../validators/service.validator');

const uploadImages = createUploader('services', 'images', 5);

router.get('/', serviceController.getAllServices);
router.get('/categories', serviceController.getServiceCategories);
router.get('/availability', serviceController.checkAvailability);
router.get('/:id', serviceController.getServiceById);
router.get('/:serviceId/reviews', require('../controllers/review.controller').getServiceReviews);

router.use(protect, isAdmin);
router.post('/', createServiceValidator, validate, serviceController.createService);
router.put('/:id', updateServiceValidator, validate, serviceController.updateService);
router.delete('/:id', serviceController.deleteService);
router.post('/:id/images', uploadImages, serviceController.uploadServiceImages);
router.delete('/:id/images', serviceController.deleteServiceImage);

module.exports = router;
