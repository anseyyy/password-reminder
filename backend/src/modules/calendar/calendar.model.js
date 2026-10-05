const mongoose = require('mongoose');

const calendarSchema = new mongoose.Schema({
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  title:       { type: String, required: true },
  description: { type: String },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date },
  type:        { type: String, enum: ['domain', 'hosting', 'general'], default: 'general' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Calendar', calendarSchema);
