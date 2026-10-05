const mongoose = require('mongoose');

const calendarEventMappingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ['google', 'microsoft'],
    required: true,
    index: true,
  },
  sourceType: {
    type: String,
    enum: ['domain', 'hosting', 'reminder', 'calendar'],
    required: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  externalEventId: {
    type: String,
    required: true,
  },
  lastEventHash: {
    type: String,
    default: '',
  },
  lastSyncedDate: {
    type: String,
    default: '',
  },
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Compound unique index ensuring 1:1 mapping per user, provider, and source entity
calendarEventMappingSchema.index(
  { user: 1, provider: 1, sourceType: 1, sourceId: 1 },
  { unique: true }
);

module.exports = mongoose.model('CalendarEventMapping', calendarEventMappingSchema);
