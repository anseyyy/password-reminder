const crypto = require('crypto');
const CalendarSync = require('./calendarSync.model');
const CalendarEventMapping = require('./calendarEventMapping.model');
const Domain = require('../domains/domains.model');
const Hosting = require('../hosting/hosting.model');
const Reminder = require('../reminders/reminders.model');
const Calendar = require('./calendar.model');
const { encrypt, decrypt } = require('../../common/encryption/encrypt');

// Helper to compute next day string for all-day calendar events
const getNextDayString = (dateString) => {
  const d = new Date(dateString);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
};

// Generate signed state containing userId to prevent CSRF
const generateOAuthState = (userId, provider) => {
  const payload = JSON.stringify({ userId, provider, timestamp: Date.now() });
  return encrypt(payload);
};

// Validate and parse OAuth state
const parseOAuthState = (stateString) => {
  try {
    const decrypted = decrypt(stateString);
    const parsed = JSON.parse(decrypted);
    // Allow state within 30 minutes
    if (Date.now() - parsed.timestamp > 30 * 60 * 1000) {
      throw new Error('OAuth state expired. Please try connecting again.');
    }
    return parsed;
  } catch (err) {
    throw new Error('Invalid or expired OAuth state.');
  }
};

/**
 * ==========================================
 * GOOGLE CALENDAR INTEGRATION
 * ==========================================
 */

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v2/userinfo';

const getGoogleConfig = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/calendar/oauth/google/callback';

  if (!clientId || !clientSecret) {
    const error = new Error('Google Calendar OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the backend environment.');
    error.statusCode = 503;
    throw error;
  }

  return { clientId, clientSecret, redirectUri };
};

// Generate Google OAuth URL
const getGoogleAuthUrl = (userId) => {
  const { clientId, redirectUri } = getGoogleConfig();
  const state = generateOAuthState(userId, 'google');
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email');

  return `${GOOGLE_AUTH_ENDPOINT}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
};

// Handle Google OAuth Code Exchange Callback
const handleGoogleCallback = async (code, state) => {
  const { userId } = parseOAuthState(state);
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Google authorization code.');
  }

  // Fetch user email for display in UI
  let email = '';
  try {
    const userRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (userRes.ok) {
      const userData = await userRes.json();
      email = userData.email || '';
    }
  } catch {
    // Non-fatal
  }

  const updateData = {
    'google.connected': true,
    'google.email': email,
    'google.encryptedAccessToken': encrypt(tokenData.access_token),
    'google.tokenExpiry': new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
    'google.syncEnabled': true,
    'google.lastSyncStatus': 'idle',
    'google.lastSyncError': '',
  };

  if (tokenData.refresh_token) {
    updateData['google.encryptedRefreshToken'] = encrypt(tokenData.refresh_token);
  }

  await CalendarSync.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, upsert: true }
  );

  return { userId, email };
};

// Get a valid Google Access Token (auto-refreshes if needed)
const getValidGoogleAccessToken = async (userId) => {
  const syncRecord = await CalendarSync.findOne({ user: userId })
    .select('+google.encryptedAccessToken +google.encryptedRefreshToken');

  if (!syncRecord || !syncRecord.google?.connected) {
    throw new Error('Google Calendar is not connected.');
  }

  const { encryptedAccessToken, encryptedRefreshToken, tokenExpiry } = syncRecord.google;
  const isExpired = !tokenExpiry || new Date() >= new Date(tokenExpiry.getTime() - 60000);

  // If token is still valid, return decrypted access token
  if (!isExpired && encryptedAccessToken) {
    try {
      return decrypt(encryptedAccessToken);
    } catch {
      // Fall through to refresh
    }
  }

  // Refresh token required
  if (!encryptedRefreshToken) {
    await markGoogleConnectionExpired(userId, 'Session expired. Please reconnect Google Calendar.');
    throw new Error('Calendar connection expired. Please reconnect.');
  }

  const { clientId, clientSecret } = getGoogleConfig();
  const refreshToken = decrypt(encryptedRefreshToken);

  const refreshRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const refreshData = await refreshRes.json();
  if (!refreshRes.ok || !refreshData.access_token) {
    await markGoogleConnectionExpired(userId, refreshData.error_description || 'Refresh token expired or revoked.');
    throw new Error('Calendar connection expired. Please reconnect.');
  }

  const newEncryptedAccessToken = encrypt(refreshData.access_token);
  const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);

  await CalendarSync.updateOne(
    { user: userId },
    {
      $set: {
        'google.encryptedAccessToken': newEncryptedAccessToken,
        'google.tokenExpiry': newExpiry,
        'google.lastSyncStatus': 'idle',
      },
    }
  );

  return refreshData.access_token;
};

const markGoogleConnectionExpired = async (userId, errorMsg) => {
  await CalendarSync.updateOne(
    { user: userId },
    {
      $set: {
        'google.connected': false,
        'google.lastSyncStatus': 'expired',
        'google.lastSyncError': errorMsg || 'Calendar connection expired. Please reconnect.',
      },
    }
  );
};

// Sync all active RemindPro events to Google Calendar (idempotent, never duplicates)
const syncToGoogle = async (userId) => {
  const accessToken = await getValidGoogleAccessToken(userId);

  await CalendarSync.updateOne(
    { user: userId },
    { $set: { 'google.lastSyncStatus': 'syncing' } }
  );

  // Fetch real database records
  const [domains, hostings, reminders, customEvents] = await Promise.all([
    Domain.find({ createdBy: userId, expiryDate: { $exists: true, $ne: null } }).populate('client', 'name company'),
    Hosting.find({ createdBy: userId, expiryDate: { $exists: true, $ne: null } }).populate('client', 'name company'),
    Reminder.find({ createdBy: userId }).populate('client', 'name company'),
    Calendar.find({ createdBy: userId }).populate('client', 'name company'),
  ]);

  const itemsToSync = [];

  domains.forEach((d) => {
    const dateStr = new Date(d.expiryDate).toISOString().split('T')[0];
    const clientName = d.client?.name || d.client?.company || 'Direct Client';
    itemsToSync.push({
      sourceType: 'domain',
      sourceId: d._id,
      summary: `Domain Renewal — ${d.domainName}`,
      description: `Client: ${clientName}\nDomain: ${d.domainName}\nExpiry Date: ${dateStr}\nRegistrar: ${d.registrar || 'N/A'}\nAuto-Renew: ${d.autoRenew ? 'Enabled' : 'Disabled'}`,
      startDate: dateStr,
      endDate: getNextDayString(dateStr),
    });
  });

  hostings.forEach((h) => {
    const dateStr = new Date(h.expiryDate).toISOString().split('T')[0];
    const clientName = h.client?.name || h.client?.company || 'Direct Client';
    itemsToSync.push({
      sourceType: 'hosting',
      sourceId: h._id,
      summary: `Hosting Renewal — ${h.hostingName}`,
      description: `Client: ${clientName}\nHosting: ${h.hostingName}\nExpiry Date: ${dateStr}\nProvider: ${h.provider || 'N/A'}\nServer: ${h.hostname || h.ipAddress || 'N/A'}`,
      startDate: dateStr,
      endDate: getNextDayString(dateStr),
    });
  });

  reminders.forEach((r) => {
    const target = r.expiryDate || r.reminderDate;
    if (!target) return;
    const dateStr = new Date(target).toISOString().split('T')[0];
    const clientName = r.client?.name || r.client?.company || 'Direct Client';
    itemsToSync.push({
      sourceType: 'reminder',
      sourceId: r._id,
      summary: `Reminder — ${r.title}`,
      description: `Client: ${clientName}\nReminder: ${r.title}\nDue Date: ${dateStr}\nMessage: ${r.message || ''}`,
      startDate: dateStr,
      endDate: getNextDayString(dateStr),
    });
  });

  customEvents.forEach((c) => {
    if (!c.startDate) return;
    const startStr = new Date(c.startDate).toISOString().split('T')[0];
    const endStr = c.endDate ? getNextDayString(c.endDate) : getNextDayString(startStr);
    const clientName = c.client?.name || c.client?.company || 'General Event';
    itemsToSync.push({
      sourceType: 'calendar',
      sourceId: c._id,
      summary: c.title,
      description: `Client: ${clientName}\nEvent: ${c.title}\n${c.description || ''}`,
      startDate: startStr,
      endDate: endStr,
    });
  });

  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const item of itemsToSync) {
    try {
      const mapping = await CalendarEventMapping.findOne({
        user: userId,
        provider: 'google',
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      });

      const eventPayload = {
        summary: item.summary,
        description: item.description,
        start: { date: item.startDate },
        end: { date: item.endDate },
        transparency: 'transparent',
      };

      if (mapping && mapping.externalEventId) {
        // Update existing Google Calendar event
        const patchRes = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(mapping.externalEventId)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        });

        if (patchRes.ok) {
          mapping.lastSyncedDate = item.startDate;
          mapping.lastSyncedAt = new Date();
          await mapping.save();
          updatedCount++;
          continue;
        }

        // If event was deleted in Google Calendar (404/410), recreate it
        if (patchRes.status === 404 || patchRes.status === 410) {
          // Recreate below
        } else {
          failedCount++;
          continue;
        }
      }

      // Create new event in Google Calendar
      const postRes = await fetch(`${GOOGLE_CALENDAR_API_BASE}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (postRes.ok) {
        const createdEvent = await postRes.json();
        await CalendarEventMapping.findOneAndUpdate(
          {
            user: userId,
            provider: 'google',
            sourceType: item.sourceType,
            sourceId: item.sourceId,
          },
          {
            $set: {
              externalEventId: createdEvent.id,
              lastSyncedDate: item.startDate,
              lastSyncedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
        createdCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  // Update sync status on user record
  await CalendarSync.updateOne(
    { user: userId },
    {
      $set: {
        'google.lastSyncedAt': new Date(),
        'google.lastSyncStatus': failedCount > 0 && createdCount + updatedCount === 0 ? 'failed' : 'synced',
        'google.lastSyncError': failedCount > 0 ? `Synced with ${failedCount} event error(s)` : '',
      },
    }
  );

  return {
    total: itemsToSync.length,
    created: createdCount,
    updated: updatedCount,
    failed: failedCount,
  };
};

// Disconnect Google Calendar integration
const disconnectGoogle = async (userId) => {
  await Promise.all([
    CalendarSync.updateOne(
      { user: userId },
      {
        $set: {
          'google.connected': false,
          'google.email': '',
          'google.encryptedAccessToken': undefined,
          'google.encryptedRefreshToken': undefined,
          'google.tokenExpiry': undefined,
          'google.syncEnabled': false,
          'google.lastSyncStatus': 'idle',
          'google.lastSyncError': '',
        },
      }
    ),
    CalendarEventMapping.deleteMany({ user: userId, provider: 'google' }),
  ]);

  return { success: true };
};

/**
 * ==========================================
 * MICROSOFT OUTLOOK INTEGRATION (GRAPH API)
 * ==========================================
 */

const MS_AUTH_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

const getMicrosoftConfig = () => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/calendar/oauth/microsoft/callback';

  if (!clientId || !clientSecret) {
    const error = new Error('Microsoft Outlook OAuth is not configured. Please set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET in the backend environment.');
    error.statusCode = 503;
    throw error;
  }

  return { clientId, clientSecret, redirectUri };
};

// Generate Microsoft OAuth URL
const getMicrosoftAuthUrl = (userId) => {
  const { clientId, redirectUri } = getMicrosoftConfig();
  const state = generateOAuthState(userId, 'microsoft');
  const scope = encodeURIComponent('offline_access Calendars.ReadWrite User.Read');

  return `${MS_AUTH_ENDPOINT}?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&response_mode=query&scope=${scope}&state=${encodeURIComponent(state)}`;
};

// Handle Microsoft OAuth Code Exchange Callback
const handleMicrosoftCallback = async (code, state) => {
  const { userId } = parseOAuthState(state);
  const { clientId, clientSecret, redirectUri } = getMicrosoftConfig();

  const tokenRes = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope: 'offline_access Calendars.ReadWrite User.Read',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange Microsoft authorization code.');
  }

  // Fetch Microsoft user profile
  let email = '';
  try {
    const profileRes = await fetch(`${MS_GRAPH_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (profileRes.ok) {
      const profile = await profileRes.json();
      email = profile.mail || profile.userPrincipalName || '';
    }
  } catch {
    // Non-fatal
  }

  const updateData = {
    'microsoft.connected': true,
    'microsoft.email': email,
    'microsoft.encryptedAccessToken': encrypt(tokenData.access_token),
    'microsoft.tokenExpiry': new Date(Date.now() + (tokenData.expires_in || 3600) * 1000),
    'microsoft.syncEnabled': true,
    'microsoft.lastSyncStatus': 'idle',
    'microsoft.lastSyncError': '',
  };

  if (tokenData.refresh_token) {
    updateData['microsoft.encryptedRefreshToken'] = encrypt(tokenData.refresh_token);
  }

  await CalendarSync.findOneAndUpdate(
    { user: userId },
    { $set: updateData },
    { new: true, upsert: true }
  );

  return { userId, email };
};

// Get a valid Microsoft Access Token (auto-refreshes if needed)
const getValidMicrosoftAccessToken = async (userId) => {
  const syncRecord = await CalendarSync.findOne({ user: userId })
    .select('+microsoft.encryptedAccessToken +microsoft.encryptedRefreshToken');

  if (!syncRecord || !syncRecord.microsoft?.connected) {
    throw new Error('Microsoft Outlook is not connected.');
  }

  const { encryptedAccessToken, encryptedRefreshToken, tokenExpiry } = syncRecord.microsoft;
  const isExpired = !tokenExpiry || new Date() >= new Date(tokenExpiry.getTime() - 60000);

  if (!isExpired && encryptedAccessToken) {
    try {
      return decrypt(encryptedAccessToken);
    } catch {
      // Fall through to refresh
    }
  }

  if (!encryptedRefreshToken) {
    await markMicrosoftConnectionExpired(userId, 'Session expired. Please reconnect Microsoft Outlook.');
    throw new Error('Calendar connection expired. Please reconnect.');
  }

  const { clientId, clientSecret, redirectUri } = getMicrosoftConfig();
  const refreshToken = decrypt(encryptedRefreshToken);

  const refreshRes = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      redirect_uri: redirectUri,
      scope: 'offline_access Calendars.ReadWrite User.Read',
    }),
  });

  const refreshData = await refreshRes.json();
  if (!refreshRes.ok || !refreshData.access_token) {
    await markMicrosoftConnectionExpired(userId, refreshData.error_description || 'Refresh token expired or revoked.');
    throw new Error('Calendar connection expired. Please reconnect.');
  }

  const newEncryptedAccessToken = encrypt(refreshData.access_token);
  const newExpiry = new Date(Date.now() + (refreshData.expires_in || 3600) * 1000);

  const updateObj = {
    'microsoft.encryptedAccessToken': newEncryptedAccessToken,
    'microsoft.tokenExpiry': newExpiry,
    'microsoft.lastSyncStatus': 'idle',
  };
  if (refreshData.refresh_token) {
    updateObj['microsoft.encryptedRefreshToken'] = encrypt(refreshData.refresh_token);
  }

  await CalendarSync.updateOne({ user: userId }, { $set: updateObj });

  return refreshData.access_token;
};

const markMicrosoftConnectionExpired = async (userId, errorMsg) => {
  await CalendarSync.updateOne(
    { user: userId },
    {
      $set: {
        'microsoft.connected': false,
        'microsoft.lastSyncStatus': 'expired',
        'microsoft.lastSyncError': errorMsg || 'Calendar connection expired. Please reconnect.',
      },
    }
  );
};

// Sync all active RemindPro events to Microsoft Outlook Calendar (idempotent, never duplicates)
const syncToMicrosoft = async (userId) => {
  const accessToken = await getValidMicrosoftAccessToken(userId);

  await CalendarSync.updateOne(
    { user: userId },
    { $set: { 'microsoft.lastSyncStatus': 'syncing' } }
  );

  const [domains, hostings, reminders, customEvents] = await Promise.all([
    Domain.find({ createdBy: userId, expiryDate: { $exists: true, $ne: null } }).populate('client', 'name company'),
    Hosting.find({ createdBy: userId, expiryDate: { $exists: true, $ne: null } }).populate('client', 'name company'),
    Reminder.find({ createdBy: userId }).populate('client', 'name company'),
    Calendar.find({ createdBy: userId }).populate('client', 'name company'),
  ]);

  const itemsToSync = [];

  domains.forEach((d) => {
    const dateStr = new Date(d.expiryDate).toISOString().split('T')[0];
    const clientName = d.client?.name || d.client?.company || 'Direct Client';
    itemsToSync.push({
      sourceType: 'domain',
      sourceId: d._id,
      subject: `Domain Renewal — ${d.domainName}`,
      body: `Client: ${clientName}\nDomain: ${d.domainName}\nExpiry Date: ${dateStr}\nRegistrar: ${d.registrar || 'N/A'}\nAuto-Renew: ${d.autoRenew ? 'Enabled' : 'Disabled'}`,
      startDate: dateStr,
      endDate: getNextDayString(dateStr),
    });
  });

  hostings.forEach((h) => {
    const dateStr = new Date(h.expiryDate).toISOString().split('T')[0];
    const clientName = h.client?.name || h.client?.company || 'Direct Client';
    itemsToSync.push({
      sourceType: 'hosting',
      sourceId: h._id,
      subject: `Hosting Renewal — ${h.hostingName}`,
      body: `Client: ${clientName}\nHosting: ${h.hostingName}\nExpiry Date: ${dateStr}\nProvider: ${h.provider || 'N/A'}\nServer: ${h.hostname || h.ipAddress || 'N/A'}`,
      startDate: dateStr,
      endDate: getNextDayString(dateStr),
    });
  });

  reminders.forEach((r) => {
    const target = r.expiryDate || r.reminderDate;
    if (!target) return;
    const dateStr = new Date(target).toISOString().split('T')[0];
    const clientName = r.client?.name || r.client?.company || 'Direct Client';
    itemsToSync.push({
      sourceType: 'reminder',
      sourceId: r._id,
      subject: `Reminder — ${r.title}`,
      body: `Client: ${clientName}\nReminder: ${r.title}\nDue Date: ${dateStr}\nMessage: ${r.message || ''}`,
      startDate: dateStr,
      endDate: getNextDayString(dateStr),
    });
  });

  customEvents.forEach((c) => {
    if (!c.startDate) return;
    const startStr = new Date(c.startDate).toISOString().split('T')[0];
    const endStr = c.endDate ? getNextDayString(c.endDate) : getNextDayString(startStr);
    const clientName = c.client?.name || c.client?.company || 'General Event';
    itemsToSync.push({
      sourceType: 'calendar',
      sourceId: c._id,
      subject: c.title,
      body: `Client: ${clientName}\nEvent: ${c.title}\n${c.description || ''}`,
      startDate: startStr,
      endDate: endStr,
    });
  });

  let createdCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  for (const item of itemsToSync) {
    try {
      const mapping = await CalendarEventMapping.findOne({
        user: userId,
        provider: 'microsoft',
        sourceType: item.sourceType,
        sourceId: item.sourceId,
      });

      const eventPayload = {
        subject: item.subject,
        body: {
          contentType: 'text',
          content: item.body,
        },
        start: { dateTime: `${item.startDate}T00:00:00`, timeZone: 'UTC' },
        end: { dateTime: `${item.endDate}T00:00:00`, timeZone: 'UTC' },
        isAllDay: true,
        showAs: 'free',
      };

      if (mapping && mapping.externalEventId) {
        // Update existing Outlook event
        const patchRes = await fetch(`${MS_GRAPH_API_BASE}/me/events/${encodeURIComponent(mapping.externalEventId)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventPayload),
        });

        if (patchRes.ok) {
          mapping.lastSyncedDate = item.startDate;
          mapping.lastSyncedAt = new Date();
          await mapping.save();
          updatedCount++;
          continue;
        }

        // If event was removed in Outlook (404), fall through to recreate
        if (patchRes.status !== 404) {
          failedCount++;
          continue;
        }
      }

      // Create new event in Microsoft Outlook
      const postRes = await fetch(`${MS_GRAPH_API_BASE}/me/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (postRes.ok) {
        const createdEvent = await postRes.json();
        await CalendarEventMapping.findOneAndUpdate(
          {
            user: userId,
            provider: 'microsoft',
            sourceType: item.sourceType,
            sourceId: item.sourceId,
          },
          {
            $set: {
              externalEventId: createdEvent.id,
              lastSyncedDate: item.startDate,
              lastSyncedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
        createdCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }

  await CalendarSync.updateOne(
    { user: userId },
    {
      $set: {
        'microsoft.lastSyncedAt': new Date(),
        'microsoft.lastSyncStatus': failedCount > 0 && createdCount + updatedCount === 0 ? 'failed' : 'synced',
        'microsoft.lastSyncError': failedCount > 0 ? `Synced with ${failedCount} event error(s)` : '',
      },
    }
  );

  return {
    total: itemsToSync.length,
    created: createdCount,
    updated: updatedCount,
    failed: failedCount,
  };
};

// Disconnect Microsoft Outlook integration
const disconnectMicrosoft = async (userId) => {
  await Promise.all([
    CalendarSync.updateOne(
      { user: userId },
      {
        $set: {
          'microsoft.connected': false,
          'microsoft.email': '',
          'microsoft.encryptedAccessToken': undefined,
          'microsoft.encryptedRefreshToken': undefined,
          'microsoft.tokenExpiry': undefined,
          'microsoft.syncEnabled': false,
          'microsoft.lastSyncStatus': 'idle',
          'microsoft.lastSyncError': '',
        },
      }
    ),
    CalendarEventMapping.deleteMany({ user: userId, provider: 'microsoft' }),
  ]);

  return { success: true };
};

module.exports = {
  getGoogleAuthUrl,
  handleGoogleCallback,
  syncToGoogle,
  disconnectGoogle,
  getMicrosoftAuthUrl,
  handleMicrosoftCallback,
  syncToMicrosoft,
  disconnectMicrosoft,
};
