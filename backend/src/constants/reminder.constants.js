// Reminder type options
const REMINDER_TYPES = ['domain', 'hosting'];

// Days-before-expiry checkpoints (3 days before + on the expiry date itself)
// -3 = 3 days before expiry, 0 = on the expiry date
const UPCOMING_INTERVALS = [3, 0];

// Days-after-expiry checkpoints (empty as reminders are only sent 3 days before & on expiry day)
const EXPIRED_INTERVALS = [];

// Human-readable status values
const EXPIRY_STATUSES = {
  UPCOMING: 'upcoming',
  TODAY:    'today',
  EXPIRED:  'expired',
};

// Keep legacy export for any other code that imports REMINDER_INTERVALS
const REMINDER_INTERVALS = {
  THIRTY_DAYS: 30,
  SEVEN_DAYS:  7,
  THREE_DAYS:  3,
  ONE_DAY:     1,
};

module.exports = { REMINDER_TYPES, REMINDER_INTERVALS, UPCOMING_INTERVALS, EXPIRED_INTERVALS, EXPIRY_STATUSES };
