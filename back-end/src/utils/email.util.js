const nodemailer = require('nodemailer');
const logger = require('./logger.util');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || 'AURA Salone'}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
};

const sendVerificationEmail = async (user, verificationUrl) => {
  await sendEmail({
    to: user.email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c8a96e;">Welcome to AURA Salone!</h2>
        <p>Hi ${user.name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #c8a96e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (user, otp) => {
  await sendEmail({
    to: user.email,
    subject: 'Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c8a96e;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>Your password reset OTP is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #c8a96e; margin: 24px 0; text-align: center;">
          ${otp}
        </div>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
      </div>
    `,
  });
};

const sendBookingConfirmation = async (user, appointment, service, staff) => {
  await sendEmail({
    to: user.email,
    subject: `Booking Confirmed - ${appointment.bookingReference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c8a96e;">Booking Confirmed!</h2>
        <p>Hi ${user.name},</p>
        <p>Your appointment has been confirmed. Here are your details:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Reference</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointment.bookingReference}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Service</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${service.name}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Stylist</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${staff?.user?.name || 'To be assigned'}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(appointment.appointmentDate).toDateString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointment.startTime} - ${appointment.endTime}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount</strong></td><td style="padding: 8px; border: 1px solid #ddd;">$${appointment.totalAmount}</td></tr>
        </table>
        <p>We look forward to seeing you!</p>
      </div>
    `,
  });
};

const sendAppointmentReminder = async (user, appointment, service) => {
  await sendEmail({
    to: user.email,
    subject: `Reminder: Appointment Tomorrow - ${appointment.bookingReference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #c8a96e;">Appointment Reminder</h2>
        <p>Hi ${user.name},</p>
        <p>Just a reminder that you have an appointment tomorrow!</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Service</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${service.name}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Date</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(appointment.appointmentDate).toDateString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${appointment.startTime}</td></tr>
        </table>
        <p>See you soon!</p>
      </div>
    `,
  });
};

const sendCancellationEmail = async (user, appointment) => {
  await sendEmail({
    to: user.email,
    subject: `Appointment Cancelled - ${appointment.bookingReference}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Appointment Cancelled</h2>
        <p>Hi ${user.name},</p>
        <p>Your appointment <strong>${appointment.bookingReference}</strong> has been cancelled.</p>
        ${appointment.cancelReason ? `<p><strong>Reason:</strong> ${appointment.cancelReason}</p>` : ''}
        <p>If you have any questions, please contact our support team.</p>
      </div>
    `,
  });
};

const sendPromotionalEmail = async (to, subject, htmlContent) => {
  await sendEmail({ to, subject, html: htmlContent });
};

const sendCouponOfferEmail = async (
  user,
  { title, description, code, discountLabel, validUntil, appliesToLabel, appliesToList = [] }
) => {
  const servicesHtml =
    appliesToList.length > 0
      ? `
        <p style="margin: 16px 0 8px;"><strong>You can apply this code on:</strong></p>
        <ul style="margin: 0 0 16px; padding-left: 20px; color: #555;">
          ${appliesToList.map((name) => `<li style="margin-bottom: 4px;">${name}</li>`).join('')}
        </ul>
      `
      : `
        <p style="margin: 16px 0;"><strong>You can apply this code on:</strong> ${appliesToLabel || 'Any service or consultation'}</p>
      `;

  await sendEmail({
    to: user.email,
    subject: title || 'A special offer from AURA Salone',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #c8a96e;">AURA Salone Exclusive Offer</h2>
        <p>Hi ${user.name || 'there'},</p>
        <p>${description || 'We have a special promotion just for you.'}</p>
        <p style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; background: #f9f3ea; border: 2px dashed #c8a96e; padding: 14px 28px; font-size: 24px; letter-spacing: 4px; font-weight: bold; color: #c8a96e;">
            ${code}
          </span>
        </p>
        <p><strong>Discount:</strong> ${discountLabel}</p>
        <p><strong>Valid until:</strong> ${new Date(validUntil).toLocaleDateString()}</p>
        ${servicesHtml}
        <p>Redeem this code on the booking review step when you book online.</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">AURA Salone — Beauty & Wellness</p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendBookingConfirmation,
  sendAppointmentReminder,
  sendCancellationEmail,
  sendPromotionalEmail,
  sendCouponOfferEmail,
};
