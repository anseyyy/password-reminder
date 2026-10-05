import apiClient from './client';

export const calendarApi = {
  /**
   * Get all raw calendar events
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/calendar');
  },

  /**
   * Get normalized calendar events across Domains, Hosting, Reminders and Calendar entries
   * @param {{ date?: string, month?: string, type?: string }} params
   * @returns {Promise<{ success: boolean, count: number, data: Array }>}
   */
  getNormalizedEvents: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.date) query.append('date', params.date);
    if (params.month) query.append('month', params.month);
    if (params.type) query.append('type', params.type);
    const qs = query.toString();
    return apiClient.get(`/calendar/events${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get user calendar sync settings
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getSyncSettings: async () => {
    return apiClient.get('/calendar/sync-settings');
  },

  /**
   * Update user calendar sync settings
   * @param {Object} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  updateSyncSettings: async (data) => {
    return apiClient.patch('/calendar/sync-settings', data);
  },

  /**
   * Generate Apple Calendar / ICS subscription feed URL
   * @returns {Promise<{ success: boolean, data: { subscriptionEnabled: boolean, feedToken: string, feedUrl: string, webcalUrl: string } }>}
   */
  generateAppleFeed: async () => {
    return apiClient.post('/calendar/feed/generate');
  },

  /**
   * Regenerate Apple Calendar subscription token
   * @returns {Promise<{ success: boolean, message: string, data: { subscriptionEnabled: boolean, feedToken: string, feedUrl: string, webcalUrl: string } }>}
   */
  regenerateAppleFeed: async () => {
    return apiClient.post('/calendar/feed/regenerate');
  },

  /**
   * Disable Apple Calendar subscription
   * @returns {Promise<{ success: boolean, message: string, data: { subscriptionEnabled: boolean } }>}
   */
  disableAppleFeed: async () => {
    return apiClient.post('/calendar/feed/disable');
  },

  /**
   * Get Google Calendar OAuth URL
   * @returns {Promise<{ success: boolean, data: { authUrl: string } }>}
   */
  getGoogleAuthUrl: async () => {
    return apiClient.get('/calendar/oauth/google/auth-url');
  },

  /**
   * Disconnect Google Calendar
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  disconnectGoogle: async () => {
    return apiClient.post('/calendar/oauth/google/disconnect');
  },

  /**
   * Sync RemindPro renewals to Google Calendar
   * @returns {Promise<{ success: boolean, message: string, data: { total: number, created: number, updated: number, failed: number } }>}
   */
  syncGoogle: async () => {
    return apiClient.post('/calendar/sync/google');
  },

  /**
   * Get Microsoft Outlook OAuth URL
   * @returns {Promise<{ success: boolean, data: { authUrl: string } }>}
   */
  getMicrosoftAuthUrl: async () => {
    return apiClient.get('/calendar/oauth/microsoft/auth-url');
  },

  /**
   * Disconnect Microsoft Outlook
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  disconnectMicrosoft: async () => {
    return apiClient.post('/calendar/oauth/microsoft/disconnect');
  },

  /**
   * Sync RemindPro renewals to Microsoft Outlook
   * @returns {Promise<{ success: boolean, message: string, data: { total: number, created: number, updated: number, failed: number } }>}
   */
  syncMicrosoft: async () => {
    return apiClient.post('/calendar/sync/microsoft');
  },

  /**
   * Trigger synchronization for all connected external calendar services
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  syncAll: async () => {
    return apiClient.post('/calendar/sync/all');
  },

  /**
   * Get single calendar event
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getOne: async (id) => {
    return apiClient.get(`/calendar/${id}`);
  },

  /**
   * Create calendar event
   * @param {{ client?: string, title: string, description?: string, startDate: string, endDate?: string, type?: 'domain' | 'hosting' | 'general' }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async (data) => {
    return apiClient.post('/calendar', data);
  },

  /**
   * Update calendar event by id
   * @param {string} id
   * @param {{ client?: string, title?: string, description?: string, startDate?: string, endDate?: string, type?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  update: async (id, data) => {
    return apiClient.put(`/calendar/${id}`, data);
  },

  /**
   * Delete calendar event by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/calendar/${id}`);
  },
};

export default calendarApi;
