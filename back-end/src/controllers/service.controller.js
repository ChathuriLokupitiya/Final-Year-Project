const Service = require('../models/Service');
const Staff = require('../models/Staff');
const Category = require('../models/Category');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination, getSortOptions } = require('../utils/pagination.util');
const { cloudinary } = require('../config/cloudinary');
const { syncExpiredPromotionsIfDue } = require('../utils/promotion.util');

exports.getAllServices = async (req, res) => {
  try {
    // Keep customer-facing sale prices in sync with promotion end dates
    await syncExpiredPromotionsIfDue();

    const { page, limit, skip } = getPagination(req.query);
    const sort = getSortOptions(req.query, ['name', 'price', 'duration', 'averageRating', 'totalBookings'], 'createdAt');

    const filter = { isActive: true };
    if (req.query.category) filter.category = req.query.category;
    if (req.query.isConsultation) filter.isConsultation = req.query.isConsultation === 'true';
    if (req.query.onSale === 'true') {
      filter.discountPrice = { $ne: null, $exists: true };
      filter.$expr = { $lt: ['$discountPrice', '$price'] };
    }
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const [services, total] = await Promise.all([
      Service.find(filter)
        .populate('category', 'name')
        .populate('availableStaff', 'user specializations averageRating')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Service.countDocuments(filter),
    ]);

    return sendPaginated(res, services, page, limit, total, 'Services retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getServiceById = async (req, res) => {
  try {
    await syncExpiredPromotionsIfDue();

    const service = await Service.findById(req.params.id)
      .populate('category', 'name')
      .populate({
        path: 'availableStaff',
        populate: { path: 'user', select: 'name avatar' },
      });

    if (!service) return sendError(res, 404, 'Service not found.');
    return sendSuccess(res, 200, 'Service retrieved.', service);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid service id.');
    return sendError(res, 500, error.message);
  }
};

exports.createService = async (req, res) => {
  try {
    const category = await Category.findById(req.body.category);
    if (!category || !category.isActive) {
      return sendError(res, 400, 'Category not found or inactive.');
    }
    const service = await Service.create(req.body);
    return sendSuccess(res, 201, 'Service created.', service);
  } catch (error) {
    if (error.name === 'CastError') return sendError(res, 400, 'Invalid category id.');
    return sendError(res, 500, error.message);
  }
};

exports.updateService = async (req, res) => {
  try {
    // Never allow images to be overwritten via this JSON update endpoint
    const { images, ...rest } = req.body;
    const payload = { ...rest };

    const updateOps = {};

    if (payload.discountPrice === null || payload.discountPrice === '') {
      delete payload.discountPrice;
      updateOps.$unset = { ...(updateOps.$unset || {}), discountPrice: 1 };
    }

    if (Object.keys(payload).length) {
      updateOps.$set = payload;
    }

    if (!updateOps.$set && !updateOps.$unset) {
      const current = await Service.findById(req.params.id);
      if (!current) return sendError(res, 404, 'Service not found.');
      return sendSuccess(res, 200, 'Service updated.', current);
    }

    const service = await Service.findByIdAndUpdate(req.params.id, updateOps, {
      new: true,
      runValidators: true,
    });
    if (!service) return sendError(res, 404, 'Service not found.');
    return sendSuccess(res, 200, 'Service updated.', service);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!service) return sendError(res, 404, 'Service not found.');
    return sendSuccess(res, 200, 'Service deactivated.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.uploadServiceImages = async (req, res) => {
  try {
    if (!req.files?.length) return sendError(res, 400, 'No images provided.');
    const urls = req.files.map((f) => f.path);
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $push: { images: { $each: urls } } },
      { new: true }
    );
    if (!service) return sendError(res, 404, 'Service not found.');
    return sendSuccess(res, 200, 'Images uploaded.', service);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteServiceImage = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(`salon/services/${publicId}`).catch(() => {});
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { $pull: { images: imageUrl } },
      { new: true }
    );
    return sendSuccess(res, 200, 'Image removed.', service);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getServiceCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).select('name');
    return sendSuccess(res, 200, 'Categories retrieved.', categories);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.checkAvailability = async (req, res) => {
  try {
    const { serviceId, date } = req.query;
    const service = await Service.findById(serviceId).populate('availableStaff');
    if (!service) return sendError(res, 404, 'Service not found.');

    const Appointment = require('../models/Appointment');
    const targetDate = new Date(date);
    const dayStart = new Date(targetDate.setHours(0, 0, 0, 0));
    const dayEnd = new Date(targetDate.setHours(23, 59, 59, 999));

    const bookedSlots = await Appointment.find({
      service: serviceId,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
    }).select('startTime endTime staff');

    return sendSuccess(res, 200, 'Availability retrieved.', {
      service: { name: service.name, duration: service.duration },
      bookedSlots,
      availableStaff: service.availableStaff,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
