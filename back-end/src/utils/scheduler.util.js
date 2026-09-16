const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const { sendAppointmentReminder } = require('./email.util');
const { syncExpiredPromotions } = require('./promotion.util');
const logger = require('./logger.util');

const startScheduledJobs = () => {
  const runPromoSync = async (label) => {
    try {
      const result = await syncExpiredPromotions();
      logger.info(
        `Promotion sync (${label}): expired=${result.expiredPromotions}, orphanDiscountsCleared=${result.clearedOrphanDiscounts}`
      );
    } catch (error) {
      logger.error(`Scheduler error (promotion sync / ${label}):`, error);
    }
  };

  // Expire promotions as soon as the server starts
  runPromoSync('startup');

  // Hourly promo / discount sync
  cron.schedule('0 * * * *', () => runPromoSync('hourly'));

  // Run every hour to send 24-hour appointment reminders
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const windowStart = new Date(in24h.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(in24h.getTime() + 30 * 60 * 1000);

      const appointments = await Appointment.find({
        appointmentDate: { $gte: windowStart, $lte: windowEnd },
        status: 'confirmed',
        reminderSent: false,
      })
        .populate('customer', 'email name notificationPreferences')
        .populate('service', 'name');

      for (const apt of appointments) {
        if (apt.customer.notificationPreferences?.email) {
          await sendAppointmentReminder(apt.customer, apt, apt.service);
          apt.reminderSent = true;
          await apt.save();
          logger.info(`Reminder sent for appointment ${apt.bookingReference}`);
        }
      }
    } catch (error) {
      logger.error('Scheduler error (reminders):', error);
    }
  });

  // Mark no-show appointments daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Appointment.updateMany(
        {
          appointmentDate: { $lt: yesterday },
          status: 'confirmed',
        },
        { status: 'no_show' }
      );
      logger.info('No-show appointments updated.');
    } catch (error) {
      logger.error('Scheduler error (no-show):', error);
    }
  });

  // Extra daily promo sync shortly after midnight
  cron.schedule('5 0 * * *', () => runPromoSync('daily'));

  logger.info('Scheduled jobs started.');
};

module.exports = { startScheduledJobs };
