const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { uploadFields } = require('../middleware/upload.middleware');

const uploadGalleryImages = uploadFields('gallery', [
  { name: 'image', maxCount: 1 },
  { name: 'before', maxCount: 1 },
  { name: 'after', maxCount: 1 },
]);

router.get('/', galleryController.getGallery);

router.use(protect);
router.post('/', authorize('staff', 'admin'), uploadGalleryImages, galleryController.uploadGalleryItem);
router.put('/:id', authorize('staff', 'admin'), uploadGalleryImages, galleryController.updateGalleryItem);
router.delete('/:id', authorize('admin'), galleryController.deleteGalleryItem);

module.exports = router;
