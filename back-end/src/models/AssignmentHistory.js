const mongoose = require('mongoose');

const assignmentHistorySchema = new mongoose.Schema({
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  action: { type: String, enum: ['assigned', 'removed'] },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AssignmentHistory', assignmentHistorySchema);
