const crypto = require('crypto');
const Calendar = require('./calendar.model');
const CalendarSync = require('./calendarSync.model');
const Domain = require('../domains/domains.model');
const Hosting = require('../hosting/hosting.model');
const Reminder = require('../reminders/reminders.model');

// Format Date into iCalendar DATE format: YYYYMMDD
const formatIcsDate = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

// Add 1 day for DTEND (RFC 5545 specifies that for VALUE=DATE, DTEND is exclusive)
const getNextDayIcsDate = (date) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return formatIcsDate(d);
};

// Format Date into iCalendar DATE-TIME format in UTC: YYYYMMDDTHHMMSSZ
const formatIcsDateTime = (date = new Date()) => {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

// RFC 5545 escaping for TEXT values
const escapeIcsText = (str = '') => {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
};

// Generate URLs for feed subscription
const buildFeedUrls = (req, token) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;
  const feedUrl = `${baseUrl}/api/calendar/feed/${token}.ics`;
  const webcalUrl = feedUrl.replace(/^https?:\/\//i, 'webcal://');
  return { feedUrl, webcalUrl };
};

// Calculate whole calendar days difference from today
const getDaysRemaining = (targetDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
};

// Compute status label & urgency for a target date
const computeStatusAndUrgency = (targetDate) => {
  const days = getDaysRemaining(targetDate);
  if (days < 0) {
    return {
      status: `Expired ${Math.abs(days)}d ago`,
      urgency: 'expired',
      daysRemaining: days,
    };
  }
  if (days === 0) {
    return {
      status: 'Expires Today',
      urgency: 'today',
      daysRemaining: 0,
    };
  }
  if (days === 1) {
    return {
      status: 'Expires Tomorrow',
      urgency: 'tomorrow',
      daysRemaining: 1,
    };
  }
  if (days <= 7) {
    return {
      status: `Expires in ${days} days`,
      urgency: 'urgent',
      daysRemaining: days,
    };
  }
  if (days <= 30) {
    return {
      status: `Expires in ${days} days`,
      urgency: 'warning',
      daysRemaining: days,
    };
  }
  return {
    status: `Expires in ${days} days`,
    urgency: 'upcoming',
    daysRemaining: days,
  };
};

/**
 * GET /api/calendar/events
 * Normalized calendar events across Domains, Hosting, Reminders and Calendar entries
 */
const getNormalizedEvents = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { date, month, type } = req.query;

    const [domains, hostings, reminders, customEvents] = await Promise.all([
      Domain.find({ createdBy: userId }).populate('client', 'name company email phone notes'),
      Hosting.find({ createdBy: userId }).populate('client', 'name company email phone notes'),
      Reminder.find({ createdBy: userId }).populate('client', 'name company email phone notes'),
      Calendar.find({ createdBy: userId }).populate('client', 'name company email phone notes'),
    ]);

    const normalized = [];

    // 1. Domains
    domains.forEach((d) => {
      if (!d.expiryDate) return;
      const dateStr = new Date(d.expiryDate).toISOString().split('T')[0];
      const { status, urgency, daysRemaining } = computeStatusAndUrgency(d.expiryDate);

      normalized.push({
        id: `domain-${d._id}`,
        sourceType: 'domain',
        sourceId: d._id,
        client: d.client?.name || 'Direct Client',
        clientDetails: d.client || null,
        title: d.domainName,
        description: d.registrar ? `Registrar: ${d.registrar}` : 'Domain Asset',
        date: dateStr,
        expiryDate: dateStr,
        type: 'domain',
        status,
        urgency,
        daysRemaining,
        autoRenew: Boolean(d.autoRenew),
        cost: d.cost || null,
        currency: d.currency || 'USD',
        notes: d.notes || '',
      });
    });

    // 2. Hosting
    hostings.forEach((h) => {
      if (!h.expiryDate) return;
      const dateStr = new Date(h.expiryDate).toISOString().split('T')[0];
      const { status, urgency, daysRemaining } = computeStatusAndUrgency(h.expiryDate);

      normalized.push({
        id: `hosting-${h._id}`,
        sourceType: 'hosting',
        sourceId: h._id,
        client: h.client?.name || 'Direct Client',
        clientDetails: h.client || null,
        title: h.hostingName,
        description: h.provider ? `Provider: ${h.provider}` : (h.hostname || 'Hosting Server'),
        date: dateStr,
        expiryDate: dateStr,
        type: 'hosting',
        status,
        urgency,
        daysRemaining,
        autoRenew: Boolean(h.autoRenew),
        cost: h.cost || null,
        currency: h.currency || 'USD',
        notes: h.notes || '',
      });
    });

    // 3. Reminders
    reminders.forEach((r) => {
      const target = r.expiryDate || r.reminderDate;
      if (!target) return;
      const dateStr = new Date(target).toISOString().split('T')[0];
      const { status, urgency, daysRemaining } = computeStatusAndUrgency(target);

      normalized.push({
        id: `reminder-${r._id}`,
        sourceType: 'reminder',
        sourceId: r._id,
        client: r.client?.name || 'Direct Client',
        clientDetails: r.client || null,
        title: r.title,
        description: r.message || 'Renewal Reminder',
        date: dateStr,
        expiryDate: dateStr,
        type: r.type || 'reminder',
        status: r.sent ? 'Sent' : status,
        urgency,
        daysRemaining,
        sent: Boolean(r.sent),
        source: r.source || 'manual',
      });
    });

    // 4. Custom Calendar Entries
    customEvents.forEach((c) => {
      if (!c.startDate) return;
      const dateStr = new Date(c.startDate).toISOString().split('T')[0];
      const { status, urgency, daysRemaining } = computeStatusAndUrgency(c.startDate);

      normalized.push({
        id: `calendar-${c._id}`,
        sourceType: 'calendar',
        sourceId: c._id,
        client: c.client?.name || 'General Event',
        clientDetails: c.client || null,
        title: c.title,
        description: c.description || 'Calendar Event',
        date: dateStr,
        expiryDate: dateStr,
        type: c.type || 'general',
        status,
        urgency,
        daysRemaining,
      });
    });

    // Filter by date if specified (YYYY-MM-DD)
    let filtered = normalized;
    if (date) {
      filtered = filtered.filter((e) => e.date === date);
    }

    // Filter by month if specified (YYYY-MM)
    if (month) {
      filtered = filtered.filter((e) => e.date.startsWith(month));
    }

    // Filter by type if specified
    if (type && type !== 'all') {
      filtered = filtered.filter((e) => e.sourceType === type || e.type === type);
    }

    // Sort chronologically (earliest / upcoming first)
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/sync-settings
 * Get current user's calendar synchronization settings
 */
const getSyncSettings = async (req, res, next) => {
  try {
    let settings = await CalendarSync.findOne({ user: req.user.id });
    if (!settings) {
      settings = await CalendarSync.create({ user: req.user.id });
    }
    const data = settings.toObject();
    if (data.apple?.feedToken) {
      const urls = buildFeedUrls(req, data.apple.feedToken);
      data.apple.feedUrl = urls.feedUrl;
      data.apple.webcalUrl = urls.webcalUrl;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/calendar/sync-settings
 * Update calendar sync settings
 */
const updateSyncSettings = async (req, res, next) => {
  try {
    const { google, microsoft, apple, autoSyncOnChanges } = req.body;
    const updatePayload = {};

    if (typeof autoSyncOnChanges === 'boolean') {
      updatePayload.autoSyncOnChanges = autoSyncOnChanges;
    }
    if (google) {
      if (typeof google.syncEnabled === 'boolean') updatePayload['google.syncEnabled'] = google.syncEnabled;
      if (google.calendarId !== undefined) updatePayload['google.calendarId'] = google.calendarId;
    }
    if (microsoft) {
      if (typeof microsoft.syncEnabled === 'boolean') updatePayload['microsoft.syncEnabled'] = microsoft.syncEnabled;
      if (microsoft.calendarId !== undefined) updatePayload['microsoft.calendarId'] = microsoft.calendarId;
    }
    if (apple) {
      if (typeof apple.subscriptionEnabled === 'boolean') updatePayload['apple.subscriptionEnabled'] = apple.subscriptionEnabled;
    }

    const settings = await CalendarSync.findOneAndUpdate(
      { user: req.user.id },
      { $set: updatePayload },
      { new: true, upsert: true }
    );

    const data = settings.toObject();
    if (data.apple?.feedToken) {
      const urls = buildFeedUrls(req, data.apple.feedToken);
      data.apple.feedUrl = urls.feedUrl;
      data.apple.webcalUrl = urls.webcalUrl;
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calendar/feed/generate
 * Generate or retrieve the Apple Calendar / ICS subscription feed token
 */
const generateAppleFeed = async (req, res, next) => {
  try {
    let settings = await CalendarSync.findOne({ user: req.user.id });
    if (!settings) {
      settings = await CalendarSync.create({ user: req.user.id });
    }

    let token = settings.apple?.feedToken;
    if (!token) {
      token = crypto.randomBytes(24).toString('hex');
      settings.apple.feedToken = token;
    }
    settings.apple.subscriptionEnabled = true;
    await settings.save();

    const { feedUrl, webcalUrl } = buildFeedUrls(req, token);

    res.json({
      success: true,
      data: {
        subscriptionEnabled: true,
        feedToken: token,
        feedUrl,
        webcalUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calendar/feed/regenerate
 * Regenerate Apple Calendar subscription token (invalidates previous feed token)
 */
const regenerateAppleFeed = async (req, res, next) => {
  try {
    const newToken = crypto.randomBytes(24).toString('hex');

    const settings = await CalendarSync.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          'apple.feedToken': newToken,
          'apple.subscriptionEnabled': true,
        },
      },
      { new: true, upsert: true }
    );

    const { feedUrl, webcalUrl } = buildFeedUrls(req, newToken);

    res.json({
      success: true,
      message: 'Subscription token regenerated successfully. Previous token has been invalidated.',
      data: {
        subscriptionEnabled: true,
        feedToken: newToken,
        feedUrl,
        webcalUrl,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calendar/feed/disable
 * Disable Apple Calendar / ICS subscription feed
 */
const disableAppleFeed = async (req, res, next) => {
  try {
    const settings = await CalendarSync.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          'apple.subscriptionEnabled': false,
        },
      },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      message: 'Calendar feed subscription disabled.',
      data: {
        subscriptionEnabled: false,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/feed/:token(.ics)?
 * Public ICS calendar feed authenticated solely by secure subscription token
 */
const getIcsFeed = async (req, res, next) => {
  try {
    const rawToken = req.params.token || '';
    const token = rawToken.replace(/\.ics$/i, '').trim();

    if (!token) {
      return res.status(401).send('Unauthorized: Missing calendar subscription token.');
    }

    const syncSetting = await CalendarSync.findOne({
      'apple.feedToken': token,
      'apple.subscriptionEnabled': true,
    });

    if (!syncSetting) {
      return res.status(404).send('Not Found: Invalid, expired, or disabled calendar feed token.');
    }

    // Update lastAccessedAt timestamp asynchronously
    await CalendarSync.updateOne(
      { _id: syncSetting._id },
      { $set: { 'apple.lastAccessedAt': new Date() } }
    );

    const userId = syncSetting.user;

    // Fetch real Domain, Hosting, Reminder and custom Calendar records
    const [domains, hostings, reminders, customEvents] = await Promise.all([
      Domain.find({ createdBy: userId }).populate('client', 'name company'),
      Hosting.find({ createdBy: userId }).populate('client', 'name company'),
      Reminder.find({ createdBy: userId }).populate('client', 'name company'),
      Calendar.find({ createdBy: userId }).populate('client', 'name company'),
    ]);

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RemindPro//Calendar Sync//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:RemindPro Renewals',
      'X-WR-CALDESC:Domain, hosting, and renewal reminders from RemindPro',
      'X-WR-TIMEZONE:UTC',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'X-PUBLISHED-TTL:PT1H',
    ];

    const nowIso = formatIcsDateTime(new Date());

    // 1. Domains
    domains.forEach((d) => {
      if (!d.expiryDate) return;
      const expiry = new Date(d.expiryDate);
      if (isNaN(expiry.getTime())) return;

      const clientName = d.client?.name || d.client?.company || 'Direct Client';
      const dtStart = formatIcsDate(expiry);
      const dtEnd = getNextDayIcsDate(expiry);
      const expiryStr = expiry.toISOString().split('T')[0];

      const descLines = [
        `Client: ${clientName}`,
        `Domain: ${d.domainName}`,
        `Expiry Date: ${expiryStr}`,
      ];
      if (d.registrar) descLines.push(`Registrar: ${d.registrar}`);
      if (typeof d.autoRenew === 'boolean') descLines.push(`Auto-Renew: ${d.autoRenew ? 'Enabled' : 'Disabled'}`);
      if (d.notes) descLines.push(`Notes: ${d.notes}`);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:domain-${d._id}@remindpro`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsText(`Domain Renewal — ${d.domainName}`)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    });

    // 2. Hosting
    hostings.forEach((h) => {
      if (!h.expiryDate) return;
      const expiry = new Date(h.expiryDate);
      if (isNaN(expiry.getTime())) return;

      const clientName = h.client?.name || h.client?.company || 'Direct Client';
      const dtStart = formatIcsDate(expiry);
      const dtEnd = getNextDayIcsDate(expiry);
      const expiryStr = expiry.toISOString().split('T')[0];

      const descLines = [
        `Client: ${clientName}`,
        `Hosting: ${h.hostingName}`,
        `Expiry Date: ${expiryStr}`,
      ];
      if (h.provider) descLines.push(`Provider: ${h.provider}`);
      if (h.hostname) descLines.push(`Hostname: ${h.hostname}`);
      if (typeof h.autoRenew === 'boolean') descLines.push(`Auto-Renew: ${h.autoRenew ? 'Enabled' : 'Disabled'}`);
      if (h.notes) descLines.push(`Notes: ${h.notes}`);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:hosting-${h._id}@remindpro`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsText(`Hosting Renewal — ${h.hostingName}`)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    });

    // 3. Reminders
    reminders.forEach((r) => {
      const target = r.expiryDate || r.reminderDate;
      if (!target) return;
      const date = new Date(target);
      if (isNaN(date.getTime())) return;

      const clientName = r.client?.name || r.client?.company || 'Direct Client';
      const dtStart = formatIcsDate(date);
      const dtEnd = getNextDayIcsDate(date);
      const dateStr = date.toISOString().split('T')[0];

      const descLines = [
        `Client: ${clientName}`,
        `Reminder: ${r.title}`,
        `Date: ${dateStr}`,
      ];
      if (r.message) descLines.push(`Details: ${r.message}`);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:reminder-${r._id}@remindpro`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsText(`Renewal Reminder — ${r.title}`)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    });

    // 4. Custom Calendar Entries
    customEvents.forEach((c) => {
      if (!c.startDate) return;
      const start = new Date(c.startDate);
      if (isNaN(start.getTime())) return;

      const clientName = c.client?.name || c.client?.company || 'General Event';
      const dtStart = formatIcsDate(start);
      const dtEnd = c.endDate ? getNextDayIcsDate(c.endDate) : getNextDayIcsDate(start);

      const descLines = [
        `Event: ${c.title}`,
        `Client: ${clientName}`,
      ];
      if (c.description) descLines.push(`Description: ${c.description}`);

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:calendar-${c._id}@remindpro`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsText(c.title)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`);
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');

    const icsContent = lines.join('\r\n');

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="remindpro-renewals.ics"');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(200).send(icsContent);
  } catch (err) {
    next(err);
  }
};

// POST /api/calendar (custom calendar event creation)
const create = async (req, res, next) => {
  try {
    const { client, title, description, startDate, endDate, type } = req.body;
    if (!title || !startDate)
      return res.status(400).json({ success: false, message: 'title and startDate are required' });

    const parsedStart = new Date(startDate);
    if (isNaN(parsedStart.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid startDate' });

    let parsedEnd;
    if (endDate) {
      parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime()))
        return res.status(400).json({ success: false, message: 'Invalid endDate' });
      if (parsedEnd < parsedStart)
        return res.status(400).json({ success: false, message: 'endDate cannot be before startDate' });
    }

    const event = await Calendar.create({
      client, title, description, startDate: parsedStart, endDate: parsedEnd, type, createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) { next(err); }
};

// GET /api/calendar
const getAll = async (req, res, next) => {
  try {
    const events = await Calendar.find({ createdBy: req.user.id })
      .populate('client', 'name company email phone')
      .sort({ startDate: 1 });
    res.json({ success: true, data: events });
  } catch (err) { next(err); }
};

// GET /api/calendar/:id
const getOne = async (req, res, next) => {
  try {
    const event = await Calendar.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client', 'name company email phone');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
};

// PUT /api/calendar/:id
const update = async (req, res, next) => {
  try {
    const { createdBy, ...safe } = req.body;
    if (safe.startDate && isNaN(new Date(safe.startDate).getTime()))
      return res.status(400).json({ success: false, message: 'Invalid startDate' });
    if (safe.endDate && isNaN(new Date(safe.endDate).getTime()))
      return res.status(400).json({ success: false, message: 'Invalid endDate' });
    if (safe.startDate && safe.endDate && new Date(safe.endDate) < new Date(safe.startDate))
      return res.status(400).json({ success: false, message: 'endDate cannot be before startDate' });

    const event = await Calendar.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      safe,
      { returnDocument: 'after', runValidators: true }
    );
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, data: event });
  } catch (err) { next(err); }
};

// DELETE /api/calendar/:id
const remove = async (req, res, next) => {
  try {
    const event = await Calendar.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) { next(err); }
};

// Disconnect and OAuth Controllers
const calendarSyncService = require('./calendarSync.service');

/**
 * GET /api/calendar/oauth/google/auth-url
 */
const getGoogleAuthUrl = async (req, res, next) => {
  try {
    const authUrl = calendarSyncService.getGoogleAuthUrl(req.user.id);
    res.json({ success: true, data: { authUrl } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/oauth/google/callback
 */
const googleCallback = async (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${clientUrl}/calendar?oauth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${clientUrl}/calendar?oauth_error=${encodeURIComponent('Missing authorization code or state parameter.')}`);
  }

  try {
    await calendarSyncService.handleGoogleCallback(code, state);
    res.redirect(`${clientUrl}/calendar?oauth_success=google`);
  } catch (err) {
    res.redirect(`${clientUrl}/calendar?oauth_error=${encodeURIComponent(err.message || 'Failed to authenticate with Google.')}`);
  }
};

/**
 * POST /api/calendar/sync/google
 */
const syncGoogle = async (req, res, next) => {
  try {
    const result = await calendarSyncService.syncToGoogle(req.user.id);
    res.json({
      success: true,
      message: 'Google Calendar synchronized successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calendar/oauth/google/disconnect
 */
const disconnectGoogle = async (req, res, next) => {
  try {
    await calendarSyncService.disconnectGoogle(req.user.id);
    res.json({
      success: true,
      message: 'Google Calendar disconnected.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/oauth/microsoft/auth-url
 */
const getMicrosoftAuthUrl = async (req, res, next) => {
  try {
    const authUrl = calendarSyncService.getMicrosoftAuthUrl(req.user.id);
    res.json({ success: true, data: { authUrl } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/calendar/oauth/microsoft/callback
 */
const microsoftCallback = async (req, res, next) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const { code, state, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${clientUrl}/calendar?oauth_error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code || !state) {
    return res.redirect(`${clientUrl}/calendar?oauth_error=${encodeURIComponent('Missing authorization code or state parameter.')}`);
  }

  try {
    await calendarSyncService.handleMicrosoftCallback(code, state);
    res.redirect(`${clientUrl}/calendar?oauth_success=microsoft`);
  } catch (err) {
    res.redirect(`${clientUrl}/calendar?oauth_error=${encodeURIComponent(err.message || 'Failed to authenticate with Microsoft Outlook.')}`);
  }
};

/**
 * POST /api/calendar/sync/microsoft
 */
const syncMicrosoft = async (req, res, next) => {
  try {
    const result = await calendarSyncService.syncToMicrosoft(req.user.id);
    res.json({
      success: true,
      message: 'Microsoft Outlook synchronized successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calendar/oauth/microsoft/disconnect
 */
const disconnectMicrosoft = async (req, res, next) => {
  try {
    await calendarSyncService.disconnectMicrosoft(req.user.id);
    res.json({
      success: true,
      message: 'Microsoft Outlook disconnected.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/calendar/sync/all
 */
const syncAll = async (req, res, next) => {
  try {
    const syncSettings = await CalendarSync.findOne({ user: req.user.id });
    const results = {};

    if (syncSettings?.google?.connected && syncSettings.google.syncEnabled) {
      try {
        results.google = await calendarSyncService.syncToGoogle(req.user.id);
      } catch (err) {
        results.google = { error: err.message };
      }
    }

    if (syncSettings?.microsoft?.connected && syncSettings.microsoft.syncEnabled) {
      try {
        results.microsoft = await calendarSyncService.syncToMicrosoft(req.user.id);
      } catch (err) {
        results.microsoft = { error: err.message };
      }
    }

    res.json({
      success: true,
      message: 'Calendar sync completed.',
      data: results,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNormalizedEvents,
  getSyncSettings,
  updateSyncSettings,
  generateAppleFeed,
  regenerateAppleFeed,
  disableAppleFeed,
  getIcsFeed,
  getGoogleAuthUrl,
  googleCallback,
  syncGoogle,
  disconnectGoogle,
  getMicrosoftAuthUrl,
  microsoftCallback,
  syncMicrosoft,
  disconnectMicrosoft,
  syncAll,
  create,
  getAll,
  getOne,
  update,
  remove,
};
