import apiClient from './client';

export const notificationsApi = {
  /**
   * Get all notifications for authenticated user
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/notifications');
  },

  /**
   * Mark notification as read
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  markRead: async (id) => {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  /**
   * Delete notification by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/notifications/${id}`);
  },
};

export default notificationsApi;
