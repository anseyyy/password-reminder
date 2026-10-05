const { EXPIRY_STATUSES } = require('../constants/reminder.constants');

/**
 * Compute the signed day difference between two dates (whole calendar days).
 * Result > 0 means dateB is AFTER dateA.
 */
const diffDays = (dateA, dateB) => {
  const a = new Date(dateA); a.setHours(0, 0, 0, 0);
  const b = new Date(dateB); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

/**
 * Given an expiryDate and today's date, return the status string.
 * @returns {'upcoming'|'today'|'expired'}
 */
const getExpiryStatus = (expiryDate, today = new Date()) => {
  const d = diffDays(expiryDate, today);
  if (d < 0)   return EXPIRY_STATUSES.UPCOMING;
  if (d === 0) return EXPIRY_STATUSES.TODAY;
  return EXPIRY_STATUSES.EXPIRED;
};

/**
 * Get a human-readable expiry label for display in the UI.
 * daysOffset convention:
 *   negative  → upcoming (days before expiry)
 *   0         → expires today
 *   positive  → expired (days after expiry)
 *   8         → sentinel "more than 7 days ago"
 */
const getExpiryLabel = (daysOffset) => {
  if (daysOffset < 0) {
    const n = Math.abs(daysOffset);
    if (n === 1) return 'Expires tomorrow';
    return `Expires in ${n} days`;
  }
  if (daysOffset === 0) return 'Expires today';
  if (daysOffset === 1) return 'Expired 1 day ago';
  if (daysOffset <= 7)  return `Expired ${daysOffset} days ago`;
  return 'Expired';
};

module.exports = { diffDays, getExpiryStatus, getExpiryLabel };
