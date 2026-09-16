const User = require('../models/User');
const Staff = require('../models/Staff');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const UnpaidLeave = require('../models/UnpaidLeave');
const Service = require('../models/Service');
const Review = require('../models/Review');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const Promotion = require('../models/Promotion');
const BlockHistory = require('../models/BlockHistory');
const LeaveRequest = require('../models/LeaveRequest');
const AssignmentHistory = require('../models/AssignmentHistory');
const Inquiry = require('../models/Inquiry');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');
const { generatePDFReport, generateExcelReport } = require('../utils/report.util');
const { sendPromotionalEmail, sendCouponOfferEmail, sendBookingConfirmation } = require('../utils/email.util');
const Coupon = require('../models/Coupon');
const LoyaltyOffer = require('../models/LoyaltyOffer');
const LoyaltyTransaction = require('../models/LoyaltyTransaction');
const {
  applyCatalogDiscounts,
  clearCatalogDiscounts,
  generateCouponCode,
  calcDiscountPrice,
  endOfPromotionDay,
} = require('../utils/promotion.util');
const { ensureWalkInCustomer } = require('../utils/walkin.util');

// ─── RBAC / Dashboard Users ───────────────────────────────────────────────────

exports.getDashboardUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'staff'] } })
      .select('-password -refreshToken')
      .sort({ role: 1, name: 1 });
    return sendSuccess(res, 200, 'Dashboard users retrieved', users);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateUserPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    if (!permissions) {
      return sendError(res, 400, 'Permissions object is required');
    }

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 404, 'User not found');
    }
    
    if (user.role !== 'staff') {
      return sendError(res, 400, 'Can only update permissions for staff members');
    }

    user.permissions = permissions;
    await user.save();
    
    return sendSuccess(res, 200, 'Permissions updated successfully', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Dashboard Analytics ────────────────────────────────────────────────────

exports.getDashboardOverview = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    let appointmentFilter = {};
    if (req.user.role === 'staff') {
      const staffMember = await Staff.findOne({ user: req.user._id });
      if (staffMember) {
        appointmentFilter.$or = [
          { staff: staffMember._id },
          { staff: null, service: { $in: staffMember.services } }
        ];
      } else {
        appointmentFilter.staff = null;
      }
    }

    const [
      totalCustomers,
      newCustomersToday,
      totalStaff,
      todayAppointments,
      pendingAppointments,
      weeklyAppointments,
      monthlyAppointments,
      totalRevenue,
      monthlyRevenue,
      todayRevenue,
      lastMonthRevenue,
      pendingInquiries,
      pendingLeaves,
      reviewsStats
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: startOfToday } }),
      Staff.countDocuments({ isActive: true }),
      Appointment.countDocuments({ ...appointmentFilter, appointmentDate: { $gte: startOfToday, $lte: endOfToday } }),
      Appointment.countDocuments({ ...appointmentFilter, status: 'pending' }),
      Appointment.countDocuments({ ...appointmentFilter, appointmentDate: { $gte: startOfWeek } }),
      Appointment.countDocuments({ ...appointmentFilter, appointmentDate: { $gte: startOfMonth } }),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfToday } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([{ $match: { status: 'completed', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Inquiry.countDocuments({ status: 'unread' }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Review.aggregate([{ $match: { isApproved: true } }, { $group: { _id: null, avgRating: { $avg: '$serviceRating' }, total: { $sum: 1 } } }])
    ]);

    return sendSuccess(res, 200, 'Dashboard overview retrieved.', {
      customers: { total: totalCustomers, newToday: newCustomersToday },
      staff: { total: totalStaff },
      appointments: {
        today: todayAppointments,
        pending: pendingAppointments,
        thisWeek: weeklyAppointments,
        thisMonth: monthlyAppointments,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        thisMonth: monthlyRevenue[0]?.total || 0,
        lastMonth: lastMonthRevenue[0]?.total || 0,
        today: todayRevenue[0]?.total || 0,
      },
      reviews: {
        avgRating: reviewsStats[0]?.avgRating ? Number(reviewsStats[0].avgRating.toFixed(1)) : 0,
        total: reviewsStats[0]?.total || 0,
      },
      pendingInquiries,
      pendingLeaves
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getRevenueAnalytics = async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;

    let groupFormat;
    if (period === 'daily') groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    else if (period === 'weekly') groupFormat = { $week: '$createdAt' };
    else groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31T23:59:59`);

    const revenueData = await Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: groupFormat, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return sendSuccess(res, 200, 'Revenue analytics retrieved.', revenueData);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getPopularServices = async (req, res) => {
  try {
    const popular = await Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$service', count: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $project: { _id: 0, service: { name: 1, category: 1, price: 1 }, bookings: '$count', revenue: 1 } },
    ]);
    return sendSuccess(res, 200, 'Popular services retrieved.', popular);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getPeakBookingHours = async (req, res) => {
  try {
    const peakHours = await Appointment.aggregate([
      { $group: { _id: { $substr: ['$startTime', 0, 2] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return sendSuccess(res, 200, 'Peak hours retrieved.', peakHours);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getCustomerRetentionStats = async (req, res) => {
  try {
    const repeatCustomers = await Appointment.aggregate([
      { $group: { _id: '$customer', count: { $sum: 1 } } },
      { $group: { _id: null, returning: { $sum: { $cond: [{ $gt: ['$count', 1] }, 1, 0] } }, newCustomers: { $sum: { $cond: [{ $eq: ['$count', 1] }, 1, 0] } } } },
    ]);
    return sendSuccess(res, 200, 'Customer retention stats retrieved.', repeatCustomers[0] || { returning: 0, newCustomers: 0 });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Customer Management ─────────────────────────────────────────────────────

exports.getAllCustomers = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { search, isBlocked } = req.query;
    const filter = { role: 'customer' };
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
    if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';

    const [customers, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);
    return sendPaginated(res, customers, page, limit, total, 'Customers retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: 'customer' });
    if (!customer) return sendError(res, 404, 'Customer not found.');

    const [totalAppointments, totalSpent] = await Promise.all([
      Appointment.countDocuments({ customer: req.params.id }),
      Payment.aggregate([{ $match: { customer: customer._id, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    return sendSuccess(res, 200, 'Customer retrieved.', {
      ...customer.toObject(),
      stats: { totalAppointments, totalSpent: totalSpent[0]?.total || 0 },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.addCustomer = async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return sendError(res, 409, 'Email already exists.');

    const user = await User.create({
      name,
      email,
      phone,
      password,
      address,
      role: 'customer',
      isVerified: true // assume admin-created users are verified
    });

    return sendSuccess(res, 201, 'Customer created successfully.', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, phone, address, isActive } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user || user.role !== 'customer') {
      return sendError(res, 404, 'Customer not found.');
    }
    if (user.isWalkIn) {
      return sendError(res, 400, 'Walk-in customer is a system account and cannot be edited.');
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    return sendSuccess(res, 200, 'Customer updated successfully.', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.blockUnblockCustomer = async (req, res) => {
  try {
    const { isBlocked, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 404, 'User not found.');
    if (user.isWalkIn) {
      return sendError(res, 400, 'Walk-in customer cannot be blocked. It is a system account used for desk bookings.');
    }

    const newStatus = isBlocked !== undefined ? isBlocked : !user.isBlocked;
    const action = newStatus ? 'blocked' : 'unblocked';
    
    user.isBlocked = newStatus;
    
    if (newStatus) {
      user.blockReason = reason || '';
    } else {
      user.unblockReason = reason || '';
    }
    
    await user.save();
    
    // Save to Block History
    await BlockHistory.create({
      customer: user._id,
      admin: req.user._id,
      action,
      reason: reason || ''
    });

    return sendSuccess(res, 200, `User ${newStatus ? 'blocked' : 'unblocked'}.`, { isBlocked: user.isBlocked });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getBlockHistory = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    
    const pipeline = [
      { $sort: { createdAt: -1 } },
      { $group: {
          _id: '$customer',
          latestHistory: { $first: '$$ROOT' }
      }},
      { $replaceRoot: { newRoot: '$latestHistory' } },
      { $sort: { createdAt: -1 } }
    ];
    
    const countResult = await BlockHistory.aggregate([...pipeline, { $count: 'total' }]);
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    const history = await BlockHistory.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: limit },
      { $lookup: { from: 'users', localField: 'customer', foreignField: '_id', as: 'customer' } },
      { $unwind: '$customer' },
      { $lookup: { from: 'users', localField: 'admin', foreignField: '_id', as: 'admin' } },
      { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } },
      { $project: {
          'customer.password': 0,
          'customer.refreshToken': 0,
          'admin.password': 0,
          'admin.refreshToken': 0
      }}
    ]);
    
    return sendPaginated(res, history, page, limit, total, 'Block history retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getCustomerBlockHistory = async (req, res) => {
  try {
    const history = await BlockHistory.find({ customer: req.params.id })
      .populate('admin', 'name')
      .sort({ createdAt: -1 });
    
    return sendSuccess(res, 200, 'Customer block history retrieved.', history);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Staff Management ─────────────────────────────────────────────────────────

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, phone, specializations, bio, experience, services, isConsultant, consultationPrice, maximumLeaves } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return sendError(res, 409, 'Email already exists.');

    const user = await User.create({ name, email, password, phone, role: 'staff', isVerified: true });
    const staffPayload = {
      user: user._id,
      specializations,
      bio,
      experience,
      services,
      isConsultant: isConsultant || false,
      maximumLeaves,
    };
    if (isConsultant && consultationPrice != null && consultationPrice !== '') {
      staffPayload.consultationPrice = Number(consultationPrice);
    }
    const staff = await Staff.create(staffPayload);

    return sendSuccess(res, 201, 'Staff member created.', { user, staff });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return sendError(res, 404, 'Staff not found.');

    const {
      specializations,
      bio,
      experience,
      services,
      isConsultant,
      consultationPrice,
      maximumLeaves,
      isActive,
      name,
      phone,
      email,
    } = req.body;

    if (specializations !== undefined) staff.specializations = specializations;
    if (bio !== undefined) staff.bio = bio;
    if (experience !== undefined) staff.experience = experience;
    if (services !== undefined) staff.services = services;
    if (isConsultant !== undefined) staff.isConsultant = isConsultant;
    if (maximumLeaves !== undefined) staff.maximumLeaves = maximumLeaves;
    if (isActive !== undefined) staff.isActive = isActive;

    if (staff.isConsultant) {
      if (consultationPrice !== undefined && consultationPrice !== '') {
        staff.consultationPrice = Number(consultationPrice);
      }
    } else {
      staff.consultationPrice = undefined;
    }

    await staff.save();

    if (name || phone || email) {
      const userUpdates = {};
      if (name) userUpdates.name = name;
      if (phone !== undefined) userUpdates.phone = phone;
      if (email) userUpdates.email = email;
      await User.findByIdAndUpdate(staff.user, userUpdates);
    }

    const populated = await Staff.findById(staff._id).populate('user', 'name email phone');
    return sendSuccess(res, 200, 'Staff updated.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!staff) return sendError(res, 404, 'Staff not found.');
    await User.findByIdAndUpdate(staff.user, { isBlocked: true });
    return sendSuccess(res, 200, 'Staff member deactivated.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.approveLeaveRequest = async (req, res) => {
  try {
    const { status } = req.body;
    const staff = await Staff.findById(req.params.staffId);
    if (!staff) return sendError(res, 404, 'Staff not found.');

    const leave = staff.leaveRequests.id(req.params.leaveId);
    if (!leave) return sendError(res, 404, 'Leave request not found.');

    leave.status = status;
    await staff.save();

    if (status === 'approved') {
      const leaveDate = new Date(leave.date);
      const startOfDay = new Date(leaveDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(leaveDate.setHours(23, 59, 59, 999));
      
      const Appointment = require('../models/Appointment');
      const Notification = require('../models/Notification');
      const { sendCancellationEmail } = require('../utils/email.util');

      const appointmentsToCancel = await Appointment.find({
        staff: staff._id,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed'] }
      }).populate('customer', 'name email notificationPreferences');

      for (const apt of appointmentsToCancel) {
        apt.status = 'cancelled';
        apt.cancelReason = 'Staff leave approved for this date.';
        await apt.save();

        await Notification.create({
          recipient: apt.customer._id,
          type: 'cancellation',
          title: 'Appointment Cancelled',
          message: `Your appointment on ${startOfDay.toDateString()} has been cancelled due to staff unavailability.`,
          data: { appointmentId: apt._id }
        });

        await sendCancellationEmail(apt.customer, apt).catch(() => {});
      }
    }

    return sendSuccess(res, 200, `Leave request ${status}.`);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.assignServicesToStaff = async (req, res) => {
  try {
    const { serviceIds } = req.body;
    if (!Array.isArray(serviceIds)) {
      return sendError(res, 400, 'serviceIds must be an array');
    }

    const staff = await Staff.findById(req.params.id);
    if (!staff) return sendError(res, 404, 'Staff not found.');

    const oldServices = staff.services.map(id => id.toString());
    const newServices = serviceIds.map(id => id.toString());

    const added = newServices.filter(id => !oldServices.includes(id));
    const removed = oldServices.filter(id => !newServices.includes(id));

    if (added.length === 0 && removed.length === 0) {
      return sendSuccess(res, 200, 'No changes in assigned services.', staff);
    }

    staff.services = newServices;
    await staff.save();

    const historyDocs = [];
    
    added.forEach(id => {
      historyDocs.push({ staff: staff._id, service: id, action: 'assigned', date: new Date() });
    });
    
    removed.forEach(id => {
      historyDocs.push({ staff: staff._id, service: id, action: 'removed', date: new Date() });
    });

    if (historyDocs.length > 0) {
      await AssignmentHistory.insertMany(historyDocs);
    }

    // Update Service models
    if (added.length > 0) {
      await Service.updateMany(
        { _id: { $in: added } },
        { $addToSet: { availableStaff: staff._id } }
      );
    }
    if (removed.length > 0) {
      await Service.updateMany(
        { _id: { $in: removed } },
        { $pull: { availableStaff: staff._id } }
      );
    }

    return sendSuccess(res, 200, 'Services assigned successfully.', staff);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Appointment Management ──────────────────────────────────────────────────

exports.getAllAppointments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, type, date, staffId, serviceId, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (type) filter.type = type;
    if (staffId) filter.staff = staffId;
    if (serviceId) filter.service = serviceId;
    if (date) {
      const parts = String(date).split('-').map(Number);
      if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
        const [y, m, d] = parts;
        filter.appointmentDate = {
          $gte: new Date(y, m - 1, d, 0, 0, 0, 0),
          $lte: new Date(y, m - 1, d, 23, 59, 59, 999),
        };
      } else {
        const d = new Date(date);
        filter.appointmentDate = {
          $gte: new Date(d.setHours(0, 0, 0, 0)),
          $lte: new Date(d.setHours(23, 59, 59, 999)),
        };
      }
    }

    // Role-based filtering: Staff only see their own appointments OR unassigned appointments for their services
    if (req.user.role === 'staff') {
      const staffMember = await Staff.findOne({ user: req.user._id });
      if (staffMember) {
        filter.$or = [
          { staff: staffMember._id },
          { staff: null, service: { $in: staffMember.services } }
        ];
      } else {
        filter.staff = null; // No appointments if no staff profile exists
      }
    }

    if (search && String(search).trim()) {
      const q = String(search).trim();
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const [matchedCustomers, matchedServices] = await Promise.all([
        User.find({ role: 'customer', $or: [{ name: rx }, { email: rx }, { phone: rx }] }).select('_id').lean(),
        Service.find({ name: rx }).select('_id').lean(),
      ]);
      const searchOr = [
        { bookingReference: rx },
        ...(matchedCustomers.length ? [{ customer: { $in: matchedCustomers.map((c) => c._id) } }] : []),
        ...(matchedServices.length ? [{ service: { $in: matchedServices.map((s) => s._id) } }] : []),
      ];
      filter.$and = [...(filter.$and || []), { $or: searchOr }];
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('customer', 'name email phone isWalkIn')
        .populate({ 
          path: 'service', 
          select: 'name price duration availableStaff',
          populate: { 
            path: 'availableStaff', 
            model: 'Staff',
            populate: { path: 'user', model: 'User', select: 'name' } 
          }
        })
        .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
        .sort({ appointmentDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    const formattedAppointments = appointments.map(apt => {
      const aptObj = apt.toObject();
      // keep guestName / guestPhone as-is for walk-in display
      if (aptObj.staff && aptObj.staff.user) {
        aptObj.staff = aptObj.staff.user.name;
      } else if (!aptObj.staff && aptObj.service && aptObj.service.availableStaff) {
        aptObj.staff = aptObj.service.availableStaff.map(s => s.user?.name).filter(Boolean);
      } else {
        aptObj.staff = 'Unassigned';
      }
      
      // Clean up service so it doesn't bloat the modal with availableStaff array
      if (aptObj.service) {
        delete aptObj.service.availableStaff;
      }
      
      return aptObj;
    });

    return sendPaginated(res, formattedAppointments, page, limit, total);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.assignStaffToAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { staff: req.body.staffId },
      { new: true }
    ).populate('customer', 'name email').populate('service', 'name');

    if (!appointment) return sendError(res, 404, 'Appointment not found.');
    return sendSuccess(res, 200, 'Staff assigned.', appointment);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getWalkInCustomer = async (req, res) => {
  try {
    const walkIn = await ensureWalkInCustomer();
    return sendSuccess(res, 200, 'Walk-in customer ready.', walkIn);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Desk / walk-in booking: admin or staff books for a customer (default walk-in)
 * and can record cash payment immediately.
 */
exports.createAdminAppointment = async (req, res) => {
  try {
    const {
      customerId,
      serviceId,
      staffId,
      appointmentDate,
      startTime,
      type,
      notes,
      guestName,
      guestPhone,
      paymentMethod = 'cash',
      promotionId,
      applyDiscount,
    } = req.body;

    if (!serviceId || !appointmentDate || !startTime) {
      return sendError(res, 400, 'serviceId, appointmentDate, and startTime are required.');
    }

    const service = await Service.findById(serviceId);
    if (!service || !service.isActive) {
      return sendError(res, 404, 'Service not found or unavailable.');
    }

    const wantsConsultation = type === 'consultation' || service.isConsultation;

    let customer;
    if (customerId) {
      customer = await User.findOne({ _id: customerId, role: 'customer' });
      if (!customer) return sendError(res, 404, 'Customer not found.');
    } else {
      customer = await ensureWalkInCustomer();
    }

    let staff = null;
    if (staffId) {
      staff = await Staff.findById(staffId).populate('user', 'name email');
      if (!staff || !staff.isActive) {
        return sendError(res, 404, 'Staff member not found or unavailable.');
      }
    }

    if (wantsConsultation) {
      if (!staffId || !staff) {
        return sendError(res, 400, 'Select a consultant staff member for consultations.');
      }
      if (!staff.isConsultant) {
        return sendError(res, 400, 'Selected staff is not marked as a consultant.');
      }
    }

    const duration = Number(service.duration) || 60;
    const [hours, minutes] = String(startTime).split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return sendError(res, 400, 'Invalid startTime. Use HH:MM.');
    }
    const endMinutes = hours * 60 + minutes + duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    const dateParts = String(appointmentDate).split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some((n) => Number.isNaN(n))) {
      return sendError(res, 400, 'Invalid appointmentDate. Use YYYY-MM-DD.');
    }
    const [y, m, d] = dateParts;
    const bookStart = new Date(y, m - 1, d, 0, 0, 0, 0);
    const bookEnd = new Date(y, m - 1, d, 23, 59, 59, 999);
    const appointmentDateValue = new Date(y, m - 1, d, 12, 0, 0, 0);

    const conflictOr = [{ service: serviceId }];
    if (staffId) conflictOr.push({ staff: staffId });

    const conflictingApt = await Appointment.findOne({
      appointmentDate: { $gte: bookStart, $lte: bookEnd },
      status: { $in: ['pending', 'confirmed', 'in_progress'] },
      $and: [
        { $or: conflictOr },
        { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      ],
    });

    if (conflictingApt) {
      return sendError(res, 409, 'This time slot is already booked.');
    }

    if (staff) {
      const aptType =
        type === 'consultation' || service.isConsultation ? 'consultation' : 'appointment';
      const limit =
        aptType === 'consultation'
          ? staff.maxConsultationsPerDay
          : staff.maxServiceAppointmentsPerDay;

      const existingAptsCount = await Appointment.countDocuments({
        staff: staffId,
        appointmentDate: { $gte: bookStart, $lte: bookEnd },
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
        type: aptType,
      });

      if (existingAptsCount >= limit) {
        return sendError(
          res,
          400,
          'Staff member has reached their daily limit for this type of appointment.'
        );
      }

      const hasLeave = await LeaveRequest.exists({
        staff: staffId,
        status: 'approved',
        startDate: { $lte: bookEnd },
        endDate: { $gte: bookStart },
      });
      if (hasLeave) {
        return sendError(res, 400, 'Selected staff is on leave for this date.');
      }
    }

    const finalType = wantsConsultation ? 'consultation' : 'appointment';
    const isConsultation = finalType === 'consultation';

    // Consultations: use consultant's consultationPrice (no catalog discounts)
    const basePrice = isConsultation
      ? Math.max(
          0,
          Number(
            staff?.consultationPrice != null ? staff.consultationPrice : service.price
          ) || 0
        )
      : Math.max(0, Number(service.price) || 0);
    let totalAmount = basePrice;
    let discountAmount = 0;
    let appliedPromotionId = null;

    if (!isConsultation) {
      if (promotionId) {
        const promo = await Promotion.findById(promotionId);
        if (!promo || !promo.isActive || promo.promoType !== 'catalog') {
          return sendError(res, 400, 'Selected discount is not available.');
        }
        if (endOfPromotionDay(promo.endDate) < new Date()) {
          return sendError(res, 400, 'Selected discount has expired.');
        }

        const sid = serviceId.toString();
        const ids = (promo.applicableServices || []).map((id) => id.toString());
        const applies =
          promo.targetType === 'all' ||
          promo.targetType === 'all_services' ||
          (promo.targetType === 'selected' && ids.includes(sid));

        if (!applies || promo.targetType === 'all_consultations') {
          return sendError(res, 400, 'Selected discount does not apply to this service.');
        }

        totalAmount = calcDiscountPrice(basePrice, promo.discountType, promo.discountValue);
        discountAmount = Math.max(0, Number((basePrice - totalAmount).toFixed(2)));
        appliedPromotionId = promo._id;
      } else if (applyDiscount !== false && service.discountPrice != null && service.discountPrice < basePrice) {
        totalAmount = Math.max(0, Number(service.discountPrice) || 0);
        discountAmount = Math.max(0, Number((basePrice - totalAmount).toFixed(2)));
      }
    }

    totalAmount = Math.max(0, parseFloat(Number(totalAmount).toFixed(2)));
    const paidNow = paymentMethod === 'cash' || paymentMethod === 'bank_transfer';

    const appointment = await Appointment.create({
      customer: customer._id,
      staff: staffId || null,
      service: serviceId,
      appointmentDate: appointmentDateValue,
      startTime,
      endTime,
      type: finalType,
      notes: notes || undefined,
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      totalAmount,
      discountAmount,
      paymentStatus: paidNow ? 'paid' : 'pending',
      status: paidNow ? 'confirmed' : 'pending',
    });

    if (paidNow) {
      const payment = await Payment.create({
        appointment: appointment._id,
        customer: customer._id,
        amount: totalAmount,
        method: paymentMethod === 'bank_transfer' ? 'bank_transfer' : 'cash',
        status: 'completed',
        metadata: {
          recordedBy: req.user._id,
          source: 'admin_desk',
          guestName: guestName || null,
          promotionId: appliedPromotionId,
          discountAmount,
        },
      });
      appointment.payment = payment._id;
      await appointment.save();

      if (!customer.isWalkIn) {
        customer.totalSpent = (customer.totalSpent || 0) + totalAmount;
        await customer.save();
      }
    }

    await Service.findByIdAndUpdate(serviceId, { $inc: { totalBookings: 1 } });
    if (staffId) await Staff.findByIdAndUpdate(staffId, { $inc: { totalAppointments: 1 } });

    // No emails for walk-in; optional in-app note skipped for walk-in too
    if (!customer.isWalkIn && customer.notificationPreferences?.email !== false) {
      const itemLabel = isConsultation ? 'Consultation' : service.name;
      await Notification.create({
        recipient: customer._id,
        type: 'booking_confirmation',
        title: 'Booking Confirmed',
        message: `Your appointment for ${itemLabel} on ${bookStart.toDateString()} is confirmed.`,
        data: { appointmentId: appointment._id },
      }).catch(() => {});

      await sendBookingConfirmation(customer, appointment, service, staff).catch(() => {});
    }

    const populated = await Appointment.findById(appointment._id)
      .populate('customer', 'name email phone isWalkIn')
      .populate('service', 'name price duration')
      .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
      .populate('payment');

    return sendSuccess(res, 201, 'Appointment created successfully.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Financial Reports ────────────────────────────────────────────────────────

exports.getAllPayments = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { status, startDate, endDate } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [payments, total, summary] = await Promise.all([
      Payment.find(filter)
        .populate('customer', 'name email')
        .populate({ path: 'appointment', select: 'bookingReference' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(filter),
      Payment.aggregate([{ $match: { ...filter, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Payments retrieved.',
      data: payments,
      summary: { totalRevenue: summary[0]?.total || 0 },
      meta: { currentPage: page, totalPages: Math.ceil(total / limit), totalItems: total },
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Reporting ────────────────────────────────────────────────────────────────

const parseDayBounds = (dateStr) => {
  if (!dateStr) return null;
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return {
    start: new Date(y, m - 1, d, 0, 0, 0, 0),
    end: new Date(y, m - 1, d, 23, 59, 59, 999),
  };
};

const parseRangeBounds = (startDate, endDate) => {
  const filter = {};
  if (startDate) {
    const s = parseDayBounds(startDate);
    if (s) filter.$gte = s.start;
    else filter.$gte = new Date(startDate);
  }
  if (endDate) {
    const e = parseDayBounds(endDate);
    if (e) filter.$lte = e.end;
    else filter.$lte = new Date(endDate);
  }
  return filter;
};

const money = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;

/** Label for appointment item: consultation bookings show as Consultation, not linked service name */
const bookingItemLabel = (a) => {
  if (a?.type === 'consultation') {
    const consultant = a.staff?.user?.name;
    return consultant ? `Consultation (${consultant})` : 'Consultation';
  }
  return a?.service?.name || '—';
};

const customerLabel = (a) => a?.guestName || a?.customer?.name || '—';

const buildReportDataset = async ({ type, date, startDate, endDate }) => {
  if (type === 'daily') {
    const day = date || new Date().toISOString().slice(0, 10);
    const bounds = parseDayBounds(day);
    if (!bounds) throw Object.assign(new Error('Invalid date. Use YYYY-MM-DD.'), { status: 400 });

    const appointments = await Appointment.find({
      appointmentDate: { $gte: bounds.start, $lte: bounds.end },
    })
      .populate('customer', 'name email phone')
      .populate('service', 'name')
      .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
      .sort({ startTime: 1 })
      .limit(1000)
      .lean();

    const payments = await Payment.find({
      createdAt: { $gte: bounds.start, $lte: bounds.end },
      status: 'completed',
    }).lean();

    const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const byStatus = appointments.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    return {
      title: `Daily Report - ${day}`,
      summary: {
        date: day,
        appointments: appointments.length,
        revenue,
        completedPayments: payments.length,
        byStatus,
      },
      headers: ['Ref', 'Customer', 'Service / Consultation', 'Staff', 'Time', 'Status', 'Amount', 'Payment'],
      rows: appointments.map((a) => [
        a.bookingReference || '—',
        customerLabel(a),
        bookingItemLabel(a),
        a.staff?.user?.name || 'Unassigned',
        a.startTime || '—',
        a.status || '—',
        money(a.totalAmount),
        a.paymentStatus || '—',
      ]),
    };
  }

  if (type === 'appointments') {
    const range = parseRangeBounds(startDate, endDate);
    const query = Object.keys(range).length ? { appointmentDate: range } : {};
    const data = await Appointment.find(query)
      .populate('customer', 'name email')
      .populate('service', 'name')
      .populate({ path: 'staff', populate: { path: 'user', select: 'name' } })
      .sort({ appointmentDate: -1 })
      .limit(1000)
      .lean();

    return {
      title: 'Appointments Report',
      summary: { total: data.length },
      headers: ['Ref', 'Customer', 'Service / Consultation', 'Staff', 'Date', 'Time', 'Status', 'Amount'],
      rows: data.map((a) => [
        a.bookingReference || '—',
        customerLabel(a),
        bookingItemLabel(a),
        a.staff?.user?.name || 'Unassigned',
        new Date(a.appointmentDate).toLocaleDateString(),
        a.startTime || '—',
        a.status || '—',
        money(a.totalAmount),
      ]),
    };
  }

  if (type === 'revenue' || type === 'sales') {
    const range = parseRangeBounds(startDate, endDate);
    const query = { status: 'completed' };
    if (Object.keys(range).length) query.createdAt = range;

    const data = await Payment.find(query)
      .populate('customer', 'name email')
      .populate('appointment', 'bookingReference')
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();

    const total = data.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      title: 'Revenue Report',
      summary: { payments: data.length, totalRevenue: total },
      headers: ['Invoice', 'Customer', 'Booking', 'Amount', 'Method', 'Date'],
      rows: data.map((p) => [
        p.invoiceNumber || '—',
        p.customer?.name || '—',
        p.appointment?.bookingReference || '—',
        money(p.amount),
        p.method || '—',
        new Date(p.createdAt).toLocaleDateString(),
      ]),
    };
  }

  if (type === 'customers') {
    const range = parseRangeBounds(startDate, endDate);
    const query = { role: 'customer' };
    if (Object.keys(range).length) query.createdAt = range;

    const data = await User.find(query).sort({ createdAt: -1 }).limit(1000).lean();

    return {
      title: 'Customers Report',
      summary: { total: data.length },
      headers: ['Name', 'Email', 'Phone', 'Loyalty Pts', 'Spent', 'Status', 'Joined'],
      rows: data.map((u) => [
        u.name,
        u.email,
        u.phone || 'N/A',
        u.loyaltyPoints || 0,
        money(u.totalSpent),
        u.isBlocked ? 'Blocked' : 'Active',
        new Date(u.createdAt).toLocaleDateString(),
      ]),
    };
  }

  if (type === 'staff') {
    const range = parseRangeBounds(startDate, endDate);
    const aptQuery = { status: { $in: ['completed', 'confirmed', 'in_progress'] } };
    if (Object.keys(range).length) aptQuery.appointmentDate = range;

    const appointments = await Appointment.find(aptQuery)
      .populate({ path: 'staff', populate: { path: 'user', select: 'name email' } })
      .populate('service', 'name')
      .limit(2000)
      .lean();

    const map = {};
    appointments.forEach((a) => {
      const id = a.staff?._id?.toString() || 'unassigned';
      if (!map[id]) {
        map[id] = {
          name: a.staff?.user?.name || 'Unassigned',
          email: a.staff?.user?.email || '—',
          total: 0,
          completed: 0,
          revenue: 0,
        };
      }
      map[id].total += 1;
      if (a.status === 'completed') map[id].completed += 1;
      map[id].revenue += a.totalAmount || 0;
    });

    const rowsData = Object.values(map).sort((a, b) => b.revenue - a.revenue);

    return {
      title: 'Staff Performance Report',
      summary: { staffCount: rowsData.length, appointments: appointments.length },
      headers: ['Staff', 'Email', 'Appointments', 'Completed', 'Revenue'],
      rows: rowsData.map((s) => [s.name, s.email, s.total, s.completed, money(s.revenue)]),
    };
  }

  const err = new Error('Invalid report type. Use: daily, appointments, revenue, customers, staff');
  err.status = 400;
  throw err;
};

exports.getReportPreview = async (req, res) => {
  try {
    const { type = 'daily', date, startDate, endDate } = req.query;
    const dataset = await buildReportDataset({ type, date, startDate, endDate });
    return sendSuccess(res, 200, 'Report preview ready.', {
      type,
      title: dataset.title,
      summary: dataset.summary,
      headers: dataset.headers,
      rowCount: dataset.rows.length,
      previewRows: dataset.rows.slice(0, 15),
    });
  } catch (error) {
    return sendError(res, error.status || 500, error.message);
  }
};

exports.exportReport = async (req, res) => {
  try {
    const { type = 'daily', format = 'pdf', date, startDate, endDate } = req.query;
    const dataset = await buildReportDataset({ type, date, startDate, endDate });

    if (format === 'excel') {
      return await generateExcelReport(res, dataset.title, dataset.headers, dataset.rows, type);
    }
    return generatePDFReport(res, dataset.title, dataset.headers, dataset.rows);
  } catch (error) {
    return sendError(res, error.status || 500, error.message);
  }
};

// ─── Notifications & Communication ───────────────────────────────────────────

exports.sendBulkNotification = async (req, res) => {
  try {
    const { targetRole, userIds, title, message, type, emailContent } = req.body;
    const filter = {};
    if (Array.isArray(userIds) && userIds.length) {
      filter._id = { $in: userIds };
    } else if (targetRole) {
      filter.role = targetRole;
    }

    const users = await User.find(filter).select('_id email name notificationPreferences');
    if (!users.length) return sendError(res, 400, 'No users found for this target.');

    const notifications = users.map((user) => ({
      recipient: user._id,
      type: type || 'promotional',
      title,
      message,
    }));

    await Notification.insertMany(notifications);

    if (emailContent) {
      const emailPromises = users
        .filter((u) => u.notificationPreferences?.email !== false)
        .map((u) => sendPromotionalEmail(u.email, title, emailContent.replace(/\{\{name\}\}/g, u.name || 'there')));
      await Promise.allSettled(emailPromises);
    }

    return sendSuccess(res, 200, `Notification sent to ${users.length} users.`);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── System & Security ────────────────────────────────────────────────────────

exports.getAuditLogs = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const { userId, resource, startDate, endDate } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (resource) filter.resource = resource;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate('user', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    return sendPaginated(res, logs, page, limit, total, 'Audit logs retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'staff', 'admin'].includes(role)) return sendError(res, 400, 'Invalid role.');
    if (req.params.id === req.user._id.toString()) return sendError(res, 400, 'Cannot change your own role.');

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return sendError(res, 404, 'User not found.');
    return sendSuccess(res, 200, 'User role updated.', user);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.moderateReview = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const review = await Review.findByIdAndUpdate(req.params.id, { isApproved }, { new: true });
    if (!review) return sendError(res, 404, 'Review not found.');
    return sendSuccess(res, 200, `Review ${isApproved ? 'approved' : 'hidden'}.`, review);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Promotions Management ───────────────────────────────────────────────────

exports.getPromotions = async (req, res) => {
  try {
    const { syncExpiredPromotionsIfDue } = require('../utils/promotion.util');
    await syncExpiredPromotionsIfDue();

    const filter = {};
    if (req.query.promoType) filter.promoType = req.query.promoType;
    if (req.query.active === 'true') filter.isActive = true;

    const promotions = await Promotion.find(filter)
      .populate('applicableServices', 'name price discountPrice isConsultation')
      .populate('coupon', 'code discountType discountValue validUntil isActive usedCount')
      .populate('sentToUsers', 'name email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Promotions retrieved.', promotions);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const {
      title,
      description,
      code,
      promoType = 'catalog',
      targetType = 'selected',
      discountType,
      discountValue,
      applicableServices = [],
      endDate,
      startDate,
      isActive = true,
    } = req.body;

    if (!title || !discountType || discountValue == null || !endDate) {
      return sendError(res, 400, 'title, discountType, discountValue and endDate are required.');
    }

    const { endOfPromotionDay } = require('../utils/promotion.util');
    if (endOfPromotionDay(endDate) < new Date()) {
      return sendError(res, 400, 'End date must be today or in the future.');
    }

    let serviceIds = applicableServices;
    if (promoType === 'catalog') {
      serviceIds = await applyCatalogDiscounts({
        targetType,
        applicableServices,
        discountType,
        discountValue,
      });
      if (!serviceIds.length) {
        return sendError(res, 400, 'Select at least one service/consultation for a catalog promotion.');
      }
    }

    const promotion = await Promotion.create({
      title,
      description,
      code: code || undefined,
      promoType,
      targetType,
      discountType,
      discountValue,
      applicableServices: serviceIds,
      startDate: startDate || new Date(),
      endDate,
      isActive,
      createdBy: req.user._id,
    });

    const populated = await Promotion.findById(promotion._id)
      .populate('applicableServices', 'name price discountPrice isConsultation')
      .lean();

    return sendSuccess(res, 201, 'Promotion created successfully.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const existing = await Promotion.findById(req.params.id);
    if (!existing) return sendError(res, 404, 'Promotion not found.');

    const next = {
      title: req.body.title ?? existing.title,
      description: req.body.description ?? existing.description,
      code: req.body.code ?? existing.code,
      discountType: req.body.discountType ?? existing.discountType,
      discountValue: req.body.discountValue ?? existing.discountValue,
      targetType: req.body.targetType ?? existing.targetType,
      applicableServices: req.body.applicableServices ?? existing.applicableServices,
      endDate: req.body.endDate ?? existing.endDate,
      startDate: req.body.startDate ?? existing.startDate,
      isActive: req.body.isActive ?? existing.isActive,
    };

    if (existing.promoType === 'catalog') {
      await clearCatalogDiscounts(existing.applicableServices);

      if (next.isActive) {
        const serviceIds = await applyCatalogDiscounts({
          targetType: next.targetType,
          applicableServices: next.applicableServices,
          discountType: next.discountType,
          discountValue: next.discountValue,
        });
        next.applicableServices = serviceIds;
      }
    }

    const promotion = await Promotion.findByIdAndUpdate(req.params.id, next, {
      new: true,
      runValidators: true,
    })
      .populate('applicableServices', 'name price discountPrice isConsultation')
      .populate('coupon', 'code discountType discountValue validUntil isActive');

    return sendSuccess(res, 200, 'Promotion updated successfully.', promotion);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    if (!promotion) return sendError(res, 404, 'Promotion not found.');

    if (promotion.promoType === 'catalog') {
      await clearCatalogDiscounts(promotion.applicableServices);
    }

    await promotion.deleteOne();
    return sendSuccess(res, 200, 'Promotion deleted successfully.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// Create coupon promo + send to selected customers via email & notification
exports.sendPromotionCoupons = async (req, res) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount = 0,
      validUntil,
      validFrom,
      applicableServices = [],
      userIds = [],
      code,
      usageLimit,
      perUserLimit = 1,
    } = req.body;

    if (!title || !discountType || discountValue == null || !validUntil) {
      return sendError(res, 400, 'title, discountType, discountValue and validUntil are required.');
    }
    if (!Array.isArray(userIds) || !userIds.length) {
      return sendError(res, 400, 'Select at least one customer to send the coupon.');
    }

    const users = await User.find({ _id: { $in: userIds }, role: 'customer' }).select(
      'name email notificationPreferences'
    );
    if (!users.length) return sendError(res, 400, 'No valid customers found.');

    let appliesToList = [];
    let appliesToLabel = 'Any service or consultation';
    if (Array.isArray(applicableServices) && applicableServices.length) {
      const linked = await Service.find({ _id: { $in: applicableServices } })
        .select('name isConsultation')
        .lean();
      appliesToList = linked.map((s) =>
        s.isConsultation ? `${s.name} (Consultation)` : s.name
      );
      appliesToLabel =
        appliesToList.length > 0
          ? appliesToList.join(', ')
          : 'Selected services (details unavailable)';
    }

    const couponCode = (code || generateCouponCode('PROMO')).toUpperCase();
    const coupon = await Coupon.create({
      code: couponCode,
      description: description || title,
      discountType,
      discountValue,
      maxDiscountAmount,
      minOrderAmount,
      usageLimit: usageLimit || users.length * (perUserLimit || 1),
      perUserLimit,
      validFrom: validFrom || new Date(),
      validUntil,
      isActive: true,
      applicableServices,
      createdBy: req.user._id,
    });

    const discountLabel =
      discountType === 'percentage' ? `${discountValue}% off` : `LKR ${discountValue} off`;

    const appliesToShort =
      appliesToList.length > 3
        ? `${appliesToList.slice(0, 3).join(', ')} +${appliesToList.length - 3} more`
        : appliesToLabel;

    const notifications = users.map((user) => ({
      recipient: user._id,
      type: 'promotional',
      title: title,
      message: `${description || 'Exclusive offer for you.'} Code: ${couponCode} (${discountLabel}). Apply on: ${appliesToShort}. Valid until ${new Date(validUntil).toLocaleDateString()}.`,
      data: {
        couponCode,
        couponId: coupon._id,
        discountType,
        discountValue,
        discountLabel,
        validUntil,
        appliesTo: appliesToList,
        appliesToLabel,
      },
      channels: { email: true, push: true },
    }));
    await Notification.insertMany(notifications);

    await Promise.allSettled(
      users.map((user) =>
        sendCouponOfferEmail(user, {
          title,
          description: description || 'Exclusive offer for you.',
          code: couponCode,
          discountLabel,
          validUntil,
          appliesToLabel,
          appliesToList,
        })
      )
    );

    const promotion = await Promotion.create({
      title,
      description,
      code: couponCode,
      promoType: 'coupon',
      targetType: applicableServices.length ? 'selected' : 'all',
      discountType,
      discountValue,
      applicableServices,
      coupon: coupon._id,
      sentToUsers: users.map((u) => u._id),
      startDate: validFrom || new Date(),
      endDate: validUntil,
      isActive: true,
      createdBy: req.user._id,
    });

    const populated = await Promotion.findById(promotion._id)
      .populate('coupon')
      .populate('sentToUsers', 'name email')
      .populate('applicableServices', 'name isConsultation')
      .lean();

    return sendSuccess(res, 201, `Coupon ${couponCode} sent to ${users.length} customer(s).`, {
      promotion: populated,
      coupon,
      sentCount: users.length,
    });
  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 400, 'Coupon code already exists. Try another code.');
    }
    return sendError(res, 500, error.message);
  }
};

exports.getAllServices = async (req, res) => {
  try {
    let filter = {};
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }
    const services = await Service.find(filter)
      .populate('category', 'name')
      .populate({
        path: 'availableStaff',
        populate: { path: 'user', select: 'name' }
      })
      .sort('-createdAt');
    return sendSuccess(res, 200, 'Services retrieved.', services);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateStaffLimits = async (req, res) => {
  try {
    const { maxConsultationsPerDay, maxServiceAppointmentsPerDay, maximumLeaves } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return sendError(res, 404, 'Staff not found.');

    if (maxConsultationsPerDay !== undefined) staff.maxConsultationsPerDay = maxConsultationsPerDay;
    if (maxServiceAppointmentsPerDay !== undefined) staff.maxServiceAppointmentsPerDay = maxServiceAppointmentsPerDay;
    if (maximumLeaves !== undefined) staff.maximumLeaves = maximumLeaves;

    await staff.save();
    return sendSuccess(res, 200, 'Staff limits updated.', staff);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getAllLeaveRequests = async (req, res) => {
  try {
    const paidLeaves = await LeaveRequest.find()
      .populate({ path: 'staff', populate: { path: 'user', select: 'name email avatar' } })
      .lean();
    
    let allLeaves = paidLeaves.map(leave => ({
      ...leave,
      staffId: leave.staff?._id,
      staffName: leave.staff?.user?.name,
      staffEmail: leave.staff?.user?.email,
      staffAvatar: leave.staff?.user?.avatar,
      isConsultant: leave.staff?.isConsultant,
      isUnpaid: false
    }));

    const unpaidLeaves = await UnpaidLeave.find().populate({
      path: 'staff',
      populate: { path: 'user', select: 'name email avatar' }
    }).lean();

    unpaidLeaves.forEach(leave => {
      allLeaves.push({
        ...leave,
        staffId: leave.staff?._id,
        staffName: leave.staff?.user?.name,
        staffEmail: leave.staff?.user?.email,
        staffAvatar: leave.staff?.user?.avatar,
        isConsultant: leave.staff?.isConsultant,
        isUnpaid: true
      });
    });

    allLeaves.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return sendSuccess(res, 200, 'Leave requests retrieved.', allLeaves);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.approveLeaveRequest = async (req, res) => {
  try {
    const { status, isUnpaid, adminComment } = req.body;
    const { staffId, leaveId } = req.params;

    if (!['approved', 'rejected'].includes(status)) {
      return sendError(res, 400, 'Invalid status.');
    }

    if (isUnpaid) {
      const leave = await UnpaidLeave.findById(leaveId);
      if (!leave) return sendError(res, 404, 'Unpaid leave request not found.');
      if (leave.status !== 'pending') return sendError(res, 400, `Leave request is already ${leave.status}.`);

      leave.status = status;
      leave.reviewedAt = new Date();
      leave.reviewedBy = req.user._id;
      if (adminComment !== undefined) leave.adminComment = adminComment;
      await leave.save();

      return sendSuccess(res, 200, `Unpaid leave request ${status}.`, leave);
    }

    const leave = await LeaveRequest.findById(leaveId);
    if (!leave) return sendError(res, 404, 'Leave request not found.');
    
    if (leave.status !== 'pending') {
      return sendError(res, 400, `Leave request is already ${leave.status}.`);
    }

    leave.status = status;
    leave.reviewedAt = new Date();
    leave.reviewedBy = req.user._id;
    if (adminComment !== undefined) leave.adminComment = adminComment;
    await leave.save();

    if (status === 'approved') {
      const staff = await Staff.findById(staffId);
      if (staff) {
        staff.leavesTaken += leave.days;
        await staff.save();
      }

      const startOfDay = new Date(new Date(leave.startDate).setHours(0, 0, 0, 0));
      const endOfDay = new Date(new Date(leave.endDate).setHours(23, 59, 59, 999));
      
      const Appointment = require('../models/Appointment');
      const { sendCancellationEmail } = require('../utils/email.util');

      const appointmentsToCancel = await Appointment.find({
        staff: staffId,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed'] }
      }).populate('customer', 'name email notificationPreferences');

      for (const apt of appointmentsToCancel) {
        apt.status = 'cancelled';
        apt.cancelReason = 'Staff leave approved for this date.';
        await apt.save();

        await Notification.create({
          recipient: apt.customer._id,
          type: 'cancellation',
          title: 'Appointment Cancelled',
          message: `Your appointment on ${startOfDay.toDateString()} has been cancelled due to staff unavailability.`,
          data: { appointmentId: apt._id }
        });

        await sendCancellationEmail(apt.customer, apt).catch(() => {});
      }
    }

    return sendSuccess(res, 200, `Leave request ${status}.`, leave);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// ─── Loyalty Redeem Offers ───────────────────────────────────────────────────

exports.getLoyaltyOffers = async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    const offers = await LoyaltyOffer.find(filter)
      .populate('applicableServices', 'name price isConsultation')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    return sendSuccess(res, 200, 'Loyalty offers retrieved.', offers);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.createLoyaltyOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      pointsCost,
      discountType,
      discountValue,
      maxDiscountAmount,
      applicableServices = [],
      usageLimit,
      perUserLimit = 1,
      validFrom,
      validUntil,
      isActive = true,
    } = req.body;

    if (!title || !pointsCost || !discountType || discountValue == null || !validUntil) {
      return sendError(
        res,
        400,
        'title, pointsCost, discountType, discountValue and validUntil are required.'
      );
    }

    const offer = await LoyaltyOffer.create({
      title,
      description,
      pointsCost: Number(pointsCost),
      discountType,
      discountValue: Number(discountValue),
      maxDiscountAmount:
        maxDiscountAmount != null && maxDiscountAmount !== ''
          ? Number(maxDiscountAmount)
          : undefined,
      applicableServices,
      usageLimit: usageLimit != null && usageLimit !== '' ? Number(usageLimit) : undefined,
      perUserLimit: Number(perUserLimit) || 1,
      validFrom: validFrom || new Date(),
      validUntil,
      isActive,
      createdBy: req.user._id,
    });

    const populated = await LoyaltyOffer.findById(offer._id)
      .populate('applicableServices', 'name price isConsultation')
      .lean();

    return sendSuccess(res, 201, 'Loyalty offer created.', populated);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateLoyaltyOffer = async (req, res) => {
  try {
    const allowed = [
      'title',
      'description',
      'pointsCost',
      'discountType',
      'discountValue',
      'maxDiscountAmount',
      'applicableServices',
      'usageLimit',
      'perUserLimit',
      'validFrom',
      'validUntil',
      'isActive',
    ];
    const payload = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) payload[key] = req.body[key];
    });
    if (payload.pointsCost != null) payload.pointsCost = Number(payload.pointsCost);
    if (payload.discountValue != null) payload.discountValue = Number(payload.discountValue);
    if (payload.perUserLimit != null) payload.perUserLimit = Number(payload.perUserLimit);
    if (payload.usageLimit === '' || payload.usageLimit === null) payload.usageLimit = undefined;
    if (payload.maxDiscountAmount === '' || payload.maxDiscountAmount === null) {
      payload.maxDiscountAmount = undefined;
    }

    const offer = await LoyaltyOffer.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    }).populate('applicableServices', 'name price isConsultation');

    if (!offer) return sendError(res, 404, 'Loyalty offer not found.');
    return sendSuccess(res, 200, 'Loyalty offer updated.', offer);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteLoyaltyOffer = async (req, res) => {
  try {
    const offer = await LoyaltyOffer.findByIdAndDelete(req.params.id);
    if (!offer) return sendError(res, 404, 'Loyalty offer not found.');
    return sendSuccess(res, 200, 'Loyalty offer deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getPromotionRedeemHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const [couponHistory, loyaltyHistory] = await Promise.all([
      Appointment.find({ couponApplied: { $ne: null } })
        .populate('customer', 'name email')
        .populate('couponApplied', 'code discountType discountValue')
        .populate('service', 'name')
        .select(
          'bookingReference appointmentDate totalAmount discountAmount couponApplied customer service createdAt'
        )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      LoyaltyTransaction.find({ type: 'redeemed' })
        .populate('user', 'name email')
        .populate('appointment', 'bookingReference')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    return sendSuccess(res, 200, 'Redeem history retrieved.', {
      couponHistory: couponHistory.map((apt) => ({
        appointmentId: apt._id,
        bookingReference: apt.bookingReference,
        date: apt.appointmentDate || apt.createdAt,
        customerName: apt.customer?.name || '—',
        customerEmail: apt.customer?.email || '',
        serviceName: apt.service?.name || 'Service',
        code: apt.couponApplied?.code || '—',
        discountType: apt.couponApplied?.discountType,
        discountValue: apt.couponApplied?.discountValue,
        discountAmount: apt.discountAmount || 0,
        totalAmount: apt.totalAmount,
      })),
      loyaltyHistory: loyaltyHistory.map((tx) => ({
        id: tx._id,
        date: tx.createdAt,
        customerName: tx.user?.name || '—',
        customerEmail: tx.user?.email || '',
        points: tx.points,
        description: tx.description || 'Loyalty redeem',
        bookingReference: tx.appointment?.bookingReference || null,
        balanceAfter: tx.balanceAfter,
      })),
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
