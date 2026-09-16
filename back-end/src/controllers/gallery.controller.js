const Gallery = require('../models/Gallery');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getGallery = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { isPublic: true };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.service) filter.service = req.query.service;
    if (req.query.staff) filter.staff = req.query.staff;

    const [items, total] = await Promise.all([
      Gallery.find(filter)
        .populate('service', 'name category')
        .populate({ path: 'staff', populate: { path: 'user', select: 'name avatar' } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Gallery.countDocuments(filter),
    ]);

    return sendPaginated(res, items, page, limit, total, 'Gallery retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.uploadGalleryItem = async (req, res) => {
  try {
    const { title, description, type, service, staff, appointment, tags, isPublic } = req.body;

    const data = {
      title,
      description,
      type,
      service,
      staff,
      appointment,
      tags: tags ? JSON.parse(tags) : [],
      isPublic: isPublic !== 'false',
      uploadedBy: req.user._id,
    };

    if (req.files?.before?.[0]) data.beforeImage = req.files.before[0].path;
    if (req.files?.after?.[0]) data.afterImage = req.files.after[0].path;
    if (req.files?.image?.[0]) data.image = req.files.image[0].path;

    const item = await Gallery.create(data);
    return sendSuccess(res, 201, 'Gallery item created.', item);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateGalleryItem = async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.body.tags) {
      try {
        updateData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        // If it's just a comma separated string or array from somewhere else
        updateData.tags = typeof req.body.tags === 'string' ? req.body.tags.split(',') : req.body.tags;
      }
    }
    
    if (req.files?.before?.[0]) updateData.beforeImage = req.files.before[0].path;
    if (req.files?.after?.[0]) updateData.afterImage = req.files.after[0].path;
    if (req.files?.image?.[0]) updateData.image = req.files.image[0].path;

    const item = await Gallery.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!item) return sendError(res, 404, 'Gallery item not found.');
    return sendSuccess(res, 200, 'Gallery item updated.', item);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findByIdAndDelete(req.params.id);
    if (!item) return sendError(res, 404, 'Gallery item not found.');
    return sendSuccess(res, 200, 'Gallery item deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
