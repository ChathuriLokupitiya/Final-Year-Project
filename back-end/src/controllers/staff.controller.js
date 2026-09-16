const Staff = require('../models/Staff');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const UnpaidLeave = require('../models/UnpaidLeave');
const Review = require('../models/Review');
const LeaveRequest = require('../models/LeaveRequest');
const AssignmentHistory = require('../models/AssignmentHistory');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');

exports.getAllStaff = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = { isActive: true };
    if (req.query.specialization) filter.specializations = req.query.specialization;

    const [staff, total] = await Promise.all([
      Staff.find(filter)
        .populate('user', 'name email avatar phone')
        .populate('services', 'name category price')
        .populate({ path: 'assignmentHistory', populate: { path: 'service', select: 'name' } })
        .populate('leaveRequests')
        .sort({ averageRating: -1 })
        .skip(skip)
        .limit(limit),
      Staff.countDocuments(filter),
    ]);

    return sendPaginated(res, staff, page, limit, total, 'Staff retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getStaffById = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate('user', 'name email avatar phone')
      .populate('services', 'name category price duration')
      .populate({ path: 'assignmentHistory', populate: { path: 'service', select: 'name' } })
      .populate('leaveRequests');

    if (!staff) return sendError(res, 404, 'Staff member not found.');
    return sendSuccess(res, 200, 'Staff retrieved.', staff);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getStaffProfile = async (req, res) => {
  try {
    const staff = await Staff.findOne({ user: req.user._id })
      .populate('user', 'name email avatar phone')
      .populate('services', 'name category price');

    if (!staff) return sendError(res, 404, 'Staff profile not found.');

    let staffObj = staff.toObject();
    
    // Fetch leaves
    const unpaidLeaves = await UnpaidLeave.find({ staff: staff._id }).lean();
    const paidLeaves = await LeaveRequest.find({ staff: staff._id }).lean();
    
    staffObj.leaveRequests = [
      ...paidLeaves.map(l => ({ ...l, isUnpaid: false })),
      ...unpaidLeaves.map(l => ({ ...l, isUnpaid: true }))
    ].sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return sendSuccess(res, 200, 'Staff profile retrieved.', staffObj);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateStaffProfile = async (req, res) => {
  try {
    const allowed = ['bio', 'specializations', 'experience', 'socialLinks'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const staff = await Staff.findOneAndUpdate({ user: req.user._id }, updates, { new: true, runValidators: true });
    if (!staff) return sendError(res, 404, 'Staff profile not found.');
    return sendSuccess(res, 200, 'Staff profile updated.', staff);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getStaffAppointments = async (req, res) => {
  try {
    const staffDoc = await Staff.findOne({ user: req.user._id });
    if (!staffDoc) return sendError(res, 404, 'Staff profile not found.');

    const { page, limit, skip } = getPagination(req.query);
    const { status, date } = req.query;

    const filter = { staff: staffDoc._id };
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      filter.appointmentDate = { $gte: new Date(d.setHours(0,0,0,0)), $lte: new Date(d.setHours(23,59,59,999)) };
    }

    const [appointments, total] = await Promise.all([
      Appointment.find(filter)
        .populate('customer', 'name email phone avatar')
        .populate('service', 'name category price duration')
        .sort({ appointmentDate: 1 })
        .skip(skip)
        .limit(limit),
      Appointment.countDocuments(filter),
    ]);

    return sendPaginated(res, appointments, page, limit, total, 'Appointments retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.requestLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason, leaveType = 'paid' } = req.body;
    
    if (!startDate || !endDate || !reason) {
      return sendError(res, 400, 'Start date, end date, and reason are required.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      return sendError(res, 400, 'End date cannot be before start date.');
    }

    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const staff = await Staff.findOne({ user: req.user._id });
    if (!staff) return sendError(res, 404, 'Staff profile not found.');

    if (leaveType === 'unpaid') {
      const unpaidLeave = await UnpaidLeave.create({
        staff: staff._id,
        startDate: start,
        endDate: end,
        days,
        reason,
        status: 'pending'
      });
      return sendSuccess(res, 201, 'Unpaid leave request submitted.', unpaidLeave);
    } else {
      const availableLeaves = staff.maximumLeaves - staff.leavesTaken;
      if (days > availableLeaves) {
        return sendError(res, 400, `Cannot request ${days} days. You only have ${availableLeaves} leaves available.`);
      }

      const newLeave = await LeaveRequest.create({
        staff: staff._id,
        startDate: start,
        endDate: end,
        days,
        reason
      });

      return sendSuccess(res, 201, 'Leave request submitted.', newLeave);
    }
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.updateLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { startDate, endDate, reason, isUnpaid } = req.body;
    
    if (!startDate || !endDate || !reason) {
      return sendError(res, 400, 'Start date, end date, and reason are required.');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (end < start) {
      return sendError(res, 400, 'End date cannot be before start date.');
    }

    const diffTime = Math.abs(end - start);
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const staff = await Staff.findOne({ user: req.user._id });
    if (!staff) return sendError(res, 404, 'Staff profile not found.');

    if (isUnpaid) {
      const unpaidLeave = await UnpaidLeave.findOne({ _id: leaveId, staff: staff._id });
      if (!unpaidLeave) return sendError(res, 404, 'Leave request not found.');
      if (unpaidLeave.status !== 'pending') return sendError(res, 400, 'Only pending leaves can be updated.');

      unpaidLeave.startDate = start;
      unpaidLeave.endDate = end;
      unpaidLeave.reason = reason;
      unpaidLeave.days = days;
      await unpaidLeave.save();
      
      return sendSuccess(res, 200, 'Unpaid leave updated.', unpaidLeave);
    } else {
      const leave = await LeaveRequest.findOne({ _id: leaveId, staff: staff._id });
      if (!leave) return sendError(res, 404, 'Leave request not found.');
      if (leave.status !== 'pending') return sendError(res, 400, 'Only pending leaves can be updated.');

      const availableLeaves = staff.maximumLeaves - staff.leavesTaken;
      if (days > availableLeaves) {
        return sendError(res, 400, `Cannot request ${days} days. You only have ${availableLeaves} leaves available.`);
      }

      leave.startDate = start;
      leave.endDate = end;
      leave.reason = reason;
      leave.days = days;
      await leave.save();

      return sendSuccess(res, 200, 'Leave updated.', leave);
    }
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.deleteLeave = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { isUnpaid } = req.query; // Send isUnpaid as query param

    const staff = await Staff.findOne({ user: req.user._id });
    if (!staff) return sendError(res, 404, 'Staff profile not found.');

    if (isUnpaid === 'true') {
      const unpaidLeave = await UnpaidLeave.findOne({ _id: leaveId, staff: staff._id });
      if (!unpaidLeave) return sendError(res, 404, 'Leave request not found.');
      if (unpaidLeave.status !== 'pending') return sendError(res, 400, 'Only pending leaves can be deleted.');

      await unpaidLeave.deleteOne();
      return sendSuccess(res, 200, 'Unpaid leave deleted.');
    } else {
      const leave = await LeaveRequest.findOne({ _id: leaveId, staff: staff._id });
      if (!leave) return sendError(res, 404, 'Leave request not found.');
      if (leave.status !== 'pending') return sendError(res, 400, 'Only pending leaves can be deleted.');

      await leave.deleteOne();

      return sendSuccess(res, 200, 'Leave deleted.');
    }
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

exports.getStaffPerformance = async (req, res) => {
  try {
    const staffDoc = await Staff.findOne({ user: req.user._id });
    if (!staffDoc) return sendError(res, 404, 'Staff profile not found.');

    const { month, year } = req.query;
    const startDate = new Date(year || new Date().getFullYear(), (month || new Date().getMonth() + 1) - 1, 1);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59);

    const [completedCount, cancelledCount, reviews] = await Promise.all([
      Appointment.countDocuments({ staff: staffDoc._id, status: 'completed', appointmentDate: { $gte: startDate, $lte: endDate } }),
      Appointment.countDocuments({ staff: staffDoc._id, status: 'cancelled', appointmentDate: { $gte: startDate, $lte: endDate } }),
      Review.find({ staff: staffDoc._id, isApproved: true }).select('staffRating comment createdAt').populate('customer', 'name avatar').sort({ createdAt: -1 }).limit(10),
    ]);

    return sendSuccess(res, 200, 'Performance data retrieved.', {
      period: { month: startDate.toLocaleString('default', { month: 'long' }), year: startDate.getFullYear() },
      totalCompleted: completedCount,
      totalCancelled: cancelledCount,
      averageRating: staffDoc.averageRating,
      totalReviews: staffDoc.totalReviews,
      recentReviews: reviews,
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};
