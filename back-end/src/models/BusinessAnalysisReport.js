const mongoose = require('mongoose');

const businessAnalysisReportSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    periodLabel: { type: String, default: 'Last 30 days + YTD' },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    metricsSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    summary: { type: String, default: '' },
    analysis: { type: String, default: '' },
    insights: [{ type: String }],
    predictions: {
      revenueOutlook: { type: String, default: '' },
      demandTrend: { type: String, default: '' },
      predictedRevenueNextMonth: { type: Number, default: null },
      confidence: { type: String, enum: ['low', 'medium', 'high', ''], default: '' },
      keyDrivers: [{ type: String }],
    },
    recommendations: [{ type: String }],
    risks: [{ type: String }],
    opportunities: [{ type: String }],
    rawAiResponse: { type: String, default: '' },
    modelUsed: { type: String, default: '' },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
    },
    errorMessage: { type: String, default: '' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

businessAnalysisReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BusinessAnalysisReport', businessAnalysisReportSchema);
