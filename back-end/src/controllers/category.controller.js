const Category = require('../models/Category');
const { sendSuccess, sendError } = require('../utils/response.util');

exports.getAllCategories = async (req, res) => {
  try {
    const filter = req.query.all === 'true' ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Categories retrieved.', categories);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) return sendError(res, 400, 'Category name is required.');

    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) return sendError(res, 400, 'Category already exists.');

    const category = await Category.create({ name, description });
    return sendSuccess(res, 201, 'Category created.', category);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) return sendError(res, 404, 'Category not found.');

    if (name) {
      const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: category._id } });
      if (existing) return sendError(res, 400, 'Another category with this name already exists.');
      category.name = name;
    }
    
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();
    return sendSuccess(res, 200, 'Category updated.', category);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return sendError(res, 404, 'Category not found.');

    category.isActive = false;
    await category.save();

    return sendSuccess(res, 200, 'Category deactivated.', category);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
