import apiClient from './client';

export const remindersApi = {
  /**
   * Get all reminders (manual and auto)
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/reminders');
  },

  /**
   * Get single reminder by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getOne: async (id) => {
    return apiClient.get(`/reminders/${id}`);
  },

  /**
   * Create manual reminder
   * @param {{ client: string, type: 'domain' | 'hosting', title: string, message?: string, reminderDate: string, expiryDate?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async (data) => {
    return apiClient.post('/reminders', data);
  },

  /**
   * Update manual reminder by id
   * @param {string} id
   * @param {{ type?: string, title?: string, message?: string, reminderDate?: string, expiryDate?: string, sent?: boolean }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  update: async (id, data) => {
    return apiClient.put(`/reminders/${id}`, data);
  },

  /**
   * Delete reminder by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/reminders/${id}`);
  },
};

export default remindersApi;
