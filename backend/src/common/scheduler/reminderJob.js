const Domain   = require('../../modules/domains/domains.model');
const Hosting  = require('../../modules/hosting/hosting.model');
const Reminder = require('../../modules/reminders/reminders.model');
const User     = require('../../modules/users/users.model');
const { sendEmail } = require('../email/sendEmail');
const { buildReminderHtml } = require('../email/reminderTemplate');
const {
  UPCOMING_INTERVALS,
  EXPIRED_INTERVALS,
  EXPIRY_STATUSES,
} = require('../../constants/reminder.constants');

// ─── helpers ────────────────────────────────────────────────────────────────

/** Format date as "20 December 2026" */
const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Compute the calendar difference in whole days between two dates.
 * Returns a positive number when dateB is AFTER dateA.
 *   diffDays(expiryDate, today) > 0 → already expired
 *   diffDays(expiryDate, today) < 0 → not yet expired
 */
const diffDays = (dateA, dateB) => {
  const a = new Date(dateA); a.setHours(0, 0, 0, 0);
  const b = new Date(dateB); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};

/**
 * Build human-readable title + message and status for a given daysOffset.
 *   daysOffset < 0  → upcoming (abs(offset) days before expiry)
 *   daysOffset = 0  → expires today
 *   daysOffset > 0  → expired (offset days after expiry)
 */
const buildReminder = ({ daysOffset, name, type, clientName, expiryDate }) => {
  const label = type === 'domain' ? 'Domain' : 'Hosting';
  const expFmt = formatDate(expiryDate);

  if (daysOffset < 0) {
    const days = Math.abs(daysOffset);
    const dayStr = days === 1 ? 'tomorrow' : `in ${days} days`;
    const statusText = days === 1 ? 'Expires tomorrow' : `Expires in ${days} days`;
    return {
      status:  EXPIRY_STATUSES.UPCOMING,
      title:   `${label} expiry reminder – ${statusText.toLowerCase()}`,
      message: `${name} expires ${dayStr}.\n\nClient:  ${clientName}\nExpiry:  ${expFmt}`,
    };
  }

  if (daysOffset === 0) {
    return {
      status:  EXPIRY_STATUSES.TODAY,
      title:   `${label} expires today`,
      message: `${name} expires today.\n\nClient:  ${clientName}\nExpiry:  ${expFmt}`,
    };
  }

  // daysOffset > 0 → expired
  let statusText;
  if (daysOffset === 1)      statusText = 'Expired 1 day ago';
  else if (daysOffset <= 7)  statusText = `Expired ${daysOffset} days ago`;
  else                       statusText = 'Expired';

  return {
    status:  EXPIRY_STATUSES.EXPIRED,
    title:   `${label} ${statusText.toLowerCase()}`,
    message: `${name} has expired.\n\n${statusText}.\n\nClient:  ${clientName}\nExpiry:  ${expFmt}`,
  };
};

// ─── core record processor ───────────────────────────────────────────────────

/**
 * For a single Domain or Hosting record, determine which reminder checkpoints
 * apply today and create a Reminder document for each one that doesn't exist yet.
 *
 * Deduplication: Mongoose unique index on (sourceId, daysOffset, source='auto')
 * guarantees at most one document per checkpoint.  We also guard with findOne
 * before attempting insert so we don't rely on error-catching for flow control.
 */
const processRecord = async ({ record, type, name, clientName, userEmail }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // How many calendar days has today gone past the expiryDate?
  // Positive  → past expiry (expired).   e.g. +3 means 3 days after.
  // Zero      → today IS the expiry date.
  // Negative  → future expiry.           e.g. -30 means 30 days away.
  const daysSinceExpiry = diffDays(record.expiryDate, today);

  // Collect the checkpoints that apply today
  // upcoming/today: daysOffset = -(days before expiry)  e.g. -30, -7, -3, -1, 0
  // expired:        daysOffset = +(days after expiry)    e.g. 1, 3, 7
  //                 any expiry older than 7 days gets a generic "Expired" at +daysAfter

  const checkpoints = []; // each entry: { daysOffset }

  if (daysSinceExpiry < 0) {
    // Still upcoming – check if today matches any UPCOMING_INTERVALS
    const daysUntilExpiry = Math.abs(daysSinceExpiry);
    if (UPCOMING_INTERVALS.includes(daysUntilExpiry)) {
      checkpoints.push({ daysOffset: -daysUntilExpiry }); // e.g. -30
    }
  } else if (daysSinceExpiry === 0) {
    // Expiry day itself
    checkpoints.push({ daysOffset: 0 });
  } else {
    // Expired
    if (EXPIRED_INTERVALS.includes(daysSinceExpiry)) {
      // Exact match: 1, 3, or 7 days after
      checkpoints.push({ daysOffset: daysSinceExpiry });
    } else if (daysSinceExpiry > 7) {
      // Beyond 7 days — create a single "Expired" reminder (daysOffset = 8 as sentinel)
      // Only do this once (the sentinel key prevents duplicates)
      checkpoints.push({ daysOffset: 8 });
    }
  }

  for (const { daysOffset } of checkpoints) {
    // Idempotency: skip if we already have this reminder
    const exists = await Reminder.findOne({
      sourceId:   record._id,
      daysOffset,
      source:     'auto',
    });
    if (exists) continue;

    const { status, title, message } = buildReminder({
      daysOffset,
      name,
      type,
      clientName,
      expiryDate: record.expiryDate,
    });

    // Determine the effective reminder date for display purposes
    // For upcoming reminders it's today (when the reminder fires).
    const reminderDate = new Date();

    try {
      await Reminder.create({
        client:      record.client,
        type,
        title,
        message,
        reminderDate,
        expiryDate:  record.expiryDate,
        sent:        false,
        source:      'auto',
        createdBy:   record.createdBy,
        sourceId:    record._id,
        sourceType:  type,
        status,
        daysOffset,
      });

      // Attempt email notification (non-fatal)
      if (userEmail) {
        try {
          const html = buildReminderHtml({
            name,
            type,
            clientName,
            expiryDateFormatted: formatDate(record.expiryDate),
            daysOffset,
          });

          await sendEmail({ to: userEmail, subject: title, message, html });
          await Reminder.updateOne({ sourceId: record._id, daysOffset, source: 'auto' }, { sent: true });
        } catch (emailErr) {
          console.error(`[Reminder] Email failed for user (ID: ${record.createdBy}): ${emailErr.message}`);
        }
      }

      console.log(`[Reminder] Created "${title}" for ${name} (${type})`);
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key — another process already wrote this, safe to ignore
        console.log(`[Reminder] Duplicate skipped for ${name} daysOffset=${daysOffset}`);
      } else {
        console.error(`[Reminder] Failed to create reminder for ${name}: ${err.message}`);
      }
    }
  }
};

// ─── main job ────────────────────────────────────────────────────────────────

/**
 * Main scheduled job.
 *
 * Checks domains and hostings that expire:
 *  – 3 days before expiry (daysOffset = -3)
 *  – On the expiry date itself (daysOffset = 0)
 */
const checkExpiryReminders = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const windowStart = new Date(today); // starts today (for expiry date check)
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + 3); // up to 3 days upcoming

    const [domains, hostings] = await Promise.all([
      Domain.find({ expiryDate: { $gte: windowStart, $lte: windowEnd } }).populate('client', 'name'),
      Hosting.find({ expiryDate: { $gte: windowStart, $lte: windowEnd } }).populate('client', 'name'),
    ]);

    // Batch-load user emails to avoid N+1 queries
    const userIds = [...new Set([
      ...domains.map(d => String(d.createdBy)),
      ...hostings.map(h => String(h.createdBy)),
    ])];

    const users   = await User.find({ _id: { $in: userIds } }).select('email');
    const userMap = Object.fromEntries(users.map(u => [String(u._id), u.email]));

    for (const domain of domains) {
      await processRecord({
        record:     domain,
        type:       'domain',
        name:       domain.domainName,
        clientName: domain.client?.name || 'N/A',
        userEmail:  userMap[String(domain.createdBy)],
      });
    }

    for (const hosting of hostings) {
      await processRecord({
        record:     hosting,
        type:       'hosting',
        name:       hosting.hostingName,
        clientName: hosting.client?.name || 'N/A',
        userEmail:  userMap[String(hosting.createdBy)],
      });
    }

    console.log('[Scheduler] Expiry check complete.');
  } catch (err) {
    console.error('[Scheduler] Error during expiry check:', err.message);
  }
};

module.exports = { checkExpiryReminders };


