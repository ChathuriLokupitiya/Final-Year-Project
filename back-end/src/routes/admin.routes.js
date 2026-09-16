const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const businessReportController = require('../controllers/businessReport.controller');
const { protect } = require('../middleware/auth.middleware');
const { isAdmin, isStaff } = require('../middleware/role.middleware');
const { createStaffValidator } = require('../validators/user.validator');
const validate = require('../middleware/validate.middleware');
const auditLog = require('../middleware/audit.middleware');

router.use(protect, isStaff);

// Dashboard & Analytics
router.get('/dashboard', adminController.getDashboardOverview);
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/popular-services', adminController.getPopularServices);
router.get('/analytics/peak-hours', adminController.getPeakBookingHours);
router.get('/analytics/retention', adminController.getCustomerRetentionStats);

// AI Business Analysis Reports (Gemini)
router.post(
  '/business-reports',
  auditLog('generate_business_report', 'BusinessAnalysisReport'),
  businessReportController.generateBusinessReport
);
router.get('/business-reports', businessReportController.getBusinessReports);
router.get('/business-reports/:id/download', businessReportController.downloadBusinessReport);
router.get('/business-reports/:id', businessReportController.getBusinessReportById);
router.delete(
  '/business-reports/:id',
  isAdmin,
  auditLog('delete_business_report', 'BusinessAnalysisReport'),
  businessReportController.deleteBusinessReport
);

// Customer Management
router.post('/customers', auditLog('create_customer', 'User'), adminController.addCustomer);
router.get('/customers', adminController.getAllCustomers);
router.get('/customers/walk-in', adminController.getWalkInCustomer);
router.get('/customers/:id', adminController.getCustomerById);
router.put('/customers/:id', auditLog('update_customer', 'User'), adminController.updateCustomer);
router.put('/customers/:id/block', auditLog('block_user', 'User'), adminController.blockUnblockCustomer);
router.get('/customers/:id/block-history', adminController.getCustomerBlockHistory);
router.get('/block-history', adminController.getBlockHistory);
router.put('/users/:id/role', isAdmin, auditLog('change_role', 'User'), adminController.updateUserRole);

// RBAC & Dashboard Users
router.get('/dashboard-users', adminController.getDashboardUsers);
router.put('/users/:id/permissions', isAdmin, auditLog('update_permissions', 'User'), adminController.updateUserPermissions);

// Staff Management
router.post('/staff', createStaffValidator, validate, auditLog('create_staff', 'Staff'), adminController.createStaff);
router.put('/staff/:id', auditLog('update_staff', 'Staff'), adminController.updateStaff);
router.delete('/staff/:id', auditLog('delete_staff', 'Staff'), adminController.deleteStaff);
router.put('/staff/:id/services', auditLog('assign_services', 'Staff'), adminController.assignServicesToStaff);
router.put('/staff/:id/limits', isAdmin, auditLog('update_staff_limits', 'Staff'), adminController.updateStaffLimits);
router.get('/staff/leaves', adminController.getAllLeaveRequests);
router.put('/staff/:staffId/leave/:leaveId', adminController.approveLeaveRequest);

// Appointment Management
router.get('/appointments', adminController.getAllAppointments);
router.post(
  '/appointments',
  auditLog('create_appointment', 'Appointment'),
  adminController.createAdminAppointment
);
router.put('/appointments/:id/assign', adminController.assignStaffToAppointment);

// Financial Management
router.get('/payments', adminController.getAllPayments);
router.get('/reports/export', adminController.exportReport);
router.get('/reports/preview', adminController.getReportPreview);

// Notifications & Communication
router.post('/notifications/bulk', adminController.sendBulkNotification);

// Security & Logs
router.get('/audit-logs', adminController.getAuditLogs);
router.put('/reviews/:id/moderate', adminController.moderateReview);

// Promotions Management
router.get('/promotions', adminController.getPromotions);
router.get('/promotions/redeem-history', adminController.getPromotionRedeemHistory);
router.post('/promotions', auditLog('create_promotion', 'Promotion'), adminController.createPromotion);
router.post('/promotions/send-coupons', auditLog('send_promotion_coupons', 'Promotion'), adminController.sendPromotionCoupons);
router.put('/promotions/:id', auditLog('update_promotion', 'Promotion'), adminController.updatePromotion);
router.delete('/promotions/:id', auditLog('delete_promotion', 'Promotion'), adminController.deletePromotion);

// Loyalty Redeem Offers
router.get('/loyalty-offers', adminController.getLoyaltyOffers);
router.post('/loyalty-offers', auditLog('create_loyalty_offer', 'LoyaltyOffer'), adminController.createLoyaltyOffer);
router.put('/loyalty-offers/:id', auditLog('update_loyalty_offer', 'LoyaltyOffer'), adminController.updateLoyaltyOffer);
router.delete('/loyalty-offers/:id', auditLog('delete_loyalty_offer', 'LoyaltyOffer'), adminController.deleteLoyaltyOffer);

// Services
router.get('/services', adminController.getAllServices);

module.exports = router;
