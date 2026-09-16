const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/role.middleware');

router.get('/', categoryController.getAllCategories);

router.use(protect);
router.use(isAdmin);

router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
