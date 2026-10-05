const mongoose = require('mongoose');

const calendarSyncSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  google: {
    connected: { type: Boolean, default: false },
    email: { type: String, default: '' },
    calendarId: { type: String, default: 'primary' },
    syncEnabled: { type: Boolean, default: false },
    encryptedAccessToken: { type: String, select: false },
    encryptedRefreshToken: { type: String, select: false },
    tokenExpiry: { type: Date },
    lastSyncedAt: { type: Date },
    lastSyncStatus: { type: String, enum: ['idle', 'syncing', 'synced', 'failed', 'expired'], default: 'idle' },
    lastSyncError: { type: String, default: '' },
  },
  microsoft: {
    connected: { type: Boolean, default: false },
    email: { type: String, default: '' },
    calendarId: { type: String, default: 'primary' },
    syncEnabled: { type: Boolean, default: false },
    encryptedAccessToken: { type: String, select: false },
    encryptedRefreshToken: { type: String, select: false },
    tokenExpiry: { type: Date },
    lastSyncedAt: { type: Date },
    lastSyncStatus: { type: String, enum: ['idle', 'syncing', 'synced', 'failed', 'expired'], default: 'idle' },
    lastSyncError: { type: String, default: '' },
  },
  apple: {
    subscriptionEnabled: { type: Boolean, default: false },
    feedToken: { type: String, default: '', index: true },
    lastAccessedAt: { type: Date },
  },
  autoSyncOnChanges: { type: Boolean, default: true },
}, { timestamps: true });

// Ensure tokens are never included in JSON output
calendarSyncSchema.set('toJSON', {
  transform: function (doc, ret) {
    if (ret.google) {
      delete ret.google.encryptedAccessToken;
      delete ret.google.encryptedRefreshToken;
    }
    if (ret.microsoft) {
      delete ret.microsoft.encryptedAccessToken;
      delete ret.microsoft.encryptedRefreshToken;
    }
    return ret;
  },
});

module.exports = mongoose.model('CalendarSync', calendarSyncSchema);
