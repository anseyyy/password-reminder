const mongoose = require('mongoose');
const { REMINDER_TYPES, EXPIRY_STATUSES } = require('../../constants/reminder.constants');

const reminderSchema = new mongoose.Schema({
  client:       { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  type:         { type: String, enum: REMINDER_TYPES, required: true },
  title:        { type: String, required: true },
  message:      { type: String },
  reminderDate: { type: Date, required: true },
  expiryDate:   { type: Date },
  sent:         { type: Boolean, default: false },
  source:       { type: String, enum: ['manual', 'auto'], default: 'manual' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Auto-reminder linkage — identifies the Domain or Hosting that generated this reminder
  sourceId:     { type: mongoose.Schema.Types.ObjectId },
  sourceType:   { type: String, enum: ['domain', 'hosting'] },

  // status: upcoming | today | expired
  status:       { type: String, enum: Object.values(EXPIRY_STATUSES) },

  // daysOffset: signed distance from expiryDate when this reminder was generated
  //   negative = days BEFORE expiry  (e.g. -30, -7, -3, -1)
  //   0        = on the expiry date
  //   positive = days AFTER expiry   (e.g. 1, 3, 7)
  // Used as deduplication key: one doc per (sourceId, daysOffset)
  daysOffset:   { type: Number },
}, { timestamps: true });

// Compound index to enforce one auto-reminder per source record per daysOffset
reminderSchema.index(
  { sourceId: 1, daysOffset: 1, source: 1 },
  { unique: true, sparse: true, partialFilterExpression: { source: 'auto' } }
);

module.exports = mongoose.model('Reminder', reminderSchema);

