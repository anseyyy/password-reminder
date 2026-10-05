import apiClient from './client';

export const hostingApi = {
  /**
   * Get all hosting records for authenticated user (populated with client name & company)
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/hosting');
  },

  /**
   * Get single hosting record by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getOne: async (id) => {
    return apiClient.get(`/hosting/${id}`);
  },

  /**
   * Create a new hosting record
   * @param {{ client: string, hostingName: string, expiryDate: string, provider?: string, hostname?: string, serverIp?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async (data) => {
    return apiClient.post('/hosting', data);
  },

  /**
   * Update hosting record by id
   * @param {string} id
   * @param {{ hostingName?: string, expiryDate?: string, provider?: string, hostname?: string, serverIp?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  update: async (id, data) => {
    return apiClient.put(`/hosting/${id}`, data);
  },

  /**
   * Delete hosting record by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/hosting/${id}`);
  },
};

export default hostingApi;
