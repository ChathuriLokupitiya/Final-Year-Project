const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const Service = require('../models/Service');
const Review = require('../models/Review');
const User = require('../models/User');
const Staff = require('../models/Staff');
const BusinessAnalysisReport = require('../models/BusinessAnalysisReport');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response.util');
const { getPagination } = require('../utils/pagination.util');
const { generateGeminiText, extractJsonObject, isRetryableError } = require('../utils/gemini.util');
const {
  generateBusinessAnalysisPDF,
  generateBusinessAnalysisExcel,
} = require('../utils/report.util');
const logger = require('../utils/logger.util');

const SYSTEM_INSTRUCTION = `You are a senior salon business analyst for Aura Salone (currency: LKR).
Analyze the provided metrics and produce actionable business insights and forward-looking predictions.

Return ONLY valid JSON (no markdown outside JSON) with this exact shape:
{
  "title": "short report title",
  "summary": "2-4 sentence executive summary",
  "analysis": "detailed plain-text analysis (paragraphs, no markdown links)",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "predictions": {
    "revenueOutlook": "short outlook for next 30 days",
    "demandTrend": "up|stable|down with brief reason",
    "predictedRevenueNextMonth": 0,
    "confidence": "low|medium|high",
    "keyDrivers": ["driver 1", "driver 2"]
  },
  "recommendations": ["actionable recommendation 1", "recommendation 2", "recommendation 3"],
  "risks": ["risk 1"],
  "opportunities": ["opportunity 1"]
}

Rules:
- Base predictions on the numbers given; do not invent fake historical figures.
- predictedRevenueNextMonth must be a number in LKR (estimate from recent revenue trends).
- Be practical for a salon (staffing, peak hours, popular services, retention, promotions).
- Keep language clear for non-technical salon managers.`;

const buildMetricsSnapshot = async () => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const last30 = new Date(now);
  last30.setDate(last30.getDate() - 30);
  const year = now.getFullYear();
  const yearStart = new Date(`${year}-01-01`);
  const yearEnd = new Date(`${year}-12-31T23:59:59`);

  const [
    totalCustomers,
    activeStaff,
    appointmentsLast30,
    completedLast30,
    cancelledLast30,
    pendingAppointments,
    revenueLast30,
    revenueThisMonth,
    revenueLastMonth,
    revenueYtd,
    monthlyRevenueSeries,
    popularServices,
    peakHours,
    retention,
    reviewStats,
    topServicesByBookings,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Staff.countDocuments({ isActive: true }),
    Appointment.countDocuments({ appointmentDate: { $gte: last30 } }),
    Appointment.countDocuments({ appointmentDate: { $gte: last30 }, status: 'completed' }),
    Appointment.countDocuments({ appointmentDate: { $gte: last30 }, status: 'cancelled' }),
    Appointment.countDocuments({ status: 'pending' }),
    Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: last30 } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: yearStart, $lte: yearEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Payment.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: yearStart, $lte: yearEnd } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Appointment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: '$service', bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { bookings: -1 } },
      { $limit: 8 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: { path: '$service', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: '$service.name',
          bookings: 1,
          revenue: 1,
          price: '$service.price',
        },
      },
    ]),
    Appointment.aggregate([
      { $group: { _id: { $substr: ['$startTime', 0, 2] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Appointment.aggregate([
      { $group: { _id: '$customer', count: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          returning: { $sum: { $cond: [{ $gt: ['$count', 1] }, 1, 0] } },
          newCustomers: { $sum: { $cond: [{ $eq: ['$count', 1] }, 1, 0] } },
        },
      },
    ]),
    Review.aggregate([
      { $match: { isApproved: true } },
      {
        $group: {
          _id: null,
          avgServiceRating: { $avg: '$serviceRating' },
          avgStaffRating: { $avg: '$staffRating' },
          total: { $sum: 1 },
        },
      },
    ]),
    Service.find({ isActive: true })
      .select('name price totalBookings averageRating isConsultation')
      .sort({ totalBookings: -1 })
      .limit(10)
      .lean(),
  ]);

  const rev30 = revenueLast30[0]?.total || 0;
  const thisMonth = revenueThisMonth[0]?.total || 0;
  const lastMonth = revenueLastMonth[0]?.total || 0;
  const monthChangePct =
    lastMonth > 0 ? Number((((thisMonth - lastMonth) / lastMonth) * 100).toFixed(1)) : null;

  return {
    generatedAt: now.toISOString(),
    period: {
      last30DaysStart: last30.toISOString(),
      monthStart: startOfMonth.toISOString(),
      year,
    },
    customers: {
      total: totalCustomers,
      returning: retention[0]?.returning || 0,
      oneTime: retention[0]?.newCustomers || 0,
    },
    staff: { active: activeStaff },
    appointments: {
      last30Days: appointmentsLast30,
      completedLast30: completedLast30,
      cancelledLast30: cancelledLast30,
      pending: pendingAppointments,
      completionRate:
        appointmentsLast30 > 0
          ? Number(((completedLast30 / appointmentsLast30) * 100).toFixed(1))
          : 0,
    },
    revenue: {
      currency: 'LKR',
      last30Days: rev30,
      thisMonth,
      lastMonth,
      yearToDate: revenueYtd[0]?.total || 0,
      monthOverMonthChangePct: monthChangePct,
      paymentsLast30: revenueLast30[0]?.count || 0,
      monthlySeries: monthlyRevenueSeries,
    },
    popularServices,
    peakHours,
    reviews: {
      total: reviewStats[0]?.total || 0,
      avgServiceRating: reviewStats[0]?.avgServiceRating
        ? Number(reviewStats[0].avgServiceRating.toFixed(2))
        : 0,
      avgStaffRating: reviewStats[0]?.avgStaffRating
        ? Number(reviewStats[0].avgStaffRating.toFixed(2))
        : 0,
    },
    catalogHighlights: topServicesByBookings,
  };
};

const normalizeReportPayload = (parsed, metrics, rawText) => {
  const predictions = parsed?.predictions || {};
  return {
    title: parsed?.title || `Aura Salone Business Analysis — ${new Date().toLocaleDateString()}`,
    summary: parsed?.summary || '',
    analysis: parsed?.analysis || rawText || '',
    insights: Array.isArray(parsed?.insights) ? parsed.insights.slice(0, 8) : [],
    predictions: {
      revenueOutlook: predictions.revenueOutlook || '',
      demandTrend: predictions.demandTrend || '',
      predictedRevenueNextMonth:
        typeof predictions.predictedRevenueNextMonth === 'number'
          ? predictions.predictedRevenueNextMonth
          : Number(predictions.predictedRevenueNextMonth) || null,
      confidence: ['low', 'medium', 'high'].includes(predictions.confidence)
        ? predictions.confidence
        : '',
      keyDrivers: Array.isArray(predictions.keyDrivers) ? predictions.keyDrivers.slice(0, 6) : [],
    },
    recommendations: Array.isArray(parsed?.recommendations)
      ? parsed.recommendations.slice(0, 8)
      : [],
    risks: Array.isArray(parsed?.risks) ? parsed.risks.slice(0, 6) : [],
    opportunities: Array.isArray(parsed?.opportunities) ? parsed.opportunities.slice(0, 6) : [],
    rawAiResponse: rawText,
    metricsSnapshot: metrics,
    periodStart: new Date(metrics.period.last30DaysStart),
    periodEnd: new Date(),
    periodLabel: 'Last 30 days + current month / YTD',
    modelUsed: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
  };
};

// @desc    Generate AI business analysis + prediction report
// @route   POST /api/admin/business-reports
// @access  Admin/Staff
exports.generateBusinessReport = async (req, res) => {
  try {
    const metrics = await buildMetricsSnapshot();
    const userMessage = `Analyze this Aura Salone business metrics JSON and create the prediction report:\n${JSON.stringify(metrics, null, 2)}`;

    let rawText = '';
    try {
      rawText = await generateGeminiText({
        systemInstruction: SYSTEM_INSTRUCTION,
        userMessage,
        temperature: 0.4,
        maxOutputTokens: 2500,
        timeoutMs: Number(process.env.GEMINI_REPORT_TIMEOUT_MS) || 45000,
      });
    } catch (aiError) {
      logger.error('Business report Gemini error:', aiError);
      const failed = await BusinessAnalysisReport.create({
        title: `Failed analysis — ${new Date().toLocaleString()}`,
        metricsSnapshot: metrics,
        status: 'failed',
        errorMessage: aiError.message || 'Gemini generation failed',
        generatedBy: req.user._id,
        periodStart: new Date(metrics.period.last30DaysStart),
        periodEnd: new Date(),
      });
      const busy = isRetryableError(aiError) || (aiError.message || '').startsWith('TIMEOUT:');
      return sendError(
        res,
        busy ? 503 : 500,
        busy
          ? 'AI service is busy. Please try generating the report again shortly.'
          : 'Failed to generate AI business report.',
        { reportId: failed._id }
      );
    }

    const parsed = extractJsonObject(rawText);
    const payload = normalizeReportPayload(parsed, metrics, rawText);
    payload.generatedBy = req.user._id;
    payload.status = 'completed';

    const report = await BusinessAnalysisReport.create(payload);
    const populated = await BusinessAnalysisReport.findById(report._id)
      .populate('generatedBy', 'name email role')
      .lean();

    return sendSuccess(res, 201, 'Business analysis report generated and saved.', populated);
  } catch (error) {
    logger.error('generateBusinessReport error:', error);
    return sendError(res, 500, error.message || 'Failed to generate business report.');
  }
};

// @desc    List saved business analysis reports
// @route   GET /api/admin/business-reports
// @access  Admin/Staff
exports.getBusinessReports = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [reports, total] = await Promise.all([
      BusinessAnalysisReport.find(filter)
        .select('-rawAiResponse -metricsSnapshot')
        .populate('generatedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BusinessAnalysisReport.countDocuments(filter),
    ]);

    return sendPaginated(res, reports, page, limit, total, 'Business reports retrieved.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// @desc    Get one business analysis report
// @route   GET /api/admin/business-reports/:id
// @access  Admin/Staff
exports.getBusinessReportById = async (req, res) => {
  try {
    const report = await BusinessAnalysisReport.findById(req.params.id)
      .populate('generatedBy', 'name email role')
      .lean();
    if (!report) return sendError(res, 404, 'Report not found.');
    return sendSuccess(res, 200, 'Business report retrieved.', report);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// @desc    Delete a business analysis report
// @route   DELETE /api/admin/business-reports/:id
// @access  Admin
exports.deleteBusinessReport = async (req, res) => {
  try {
    const report = await BusinessAnalysisReport.findByIdAndDelete(req.params.id);
    if (!report) return sendError(res, 404, 'Report not found.');
    return sendSuccess(res, 200, 'Business report deleted.');
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

// @desc    Download business analysis report (pdf|xlsx)
// @route   GET /api/admin/business-reports/:id/download
// @access  Admin/Staff
exports.downloadBusinessReport = async (req, res) => {
  try {
    const format = String(req.query.format || 'pdf').toLowerCase();
    const report = await BusinessAnalysisReport.findById(req.params.id)
      .populate('generatedBy', 'name email')
      .lean();

    if (!report) return sendError(res, 404, 'Report not found.');
    if (report.status === 'failed') {
      return sendError(res, 400, 'Cannot download a failed report.');
    }

    if (format === 'xlsx' || format === 'excel') {
      return generateBusinessAnalysisExcel(res, report);
    }

    return generateBusinessAnalysisPDF(res, report);
  } catch (error) {
    logger.error('downloadBusinessReport error:', error);
    if (!res.headersSent) {
      return sendError(res, 500, error.message || 'Failed to download report.');
    }
  }
};
