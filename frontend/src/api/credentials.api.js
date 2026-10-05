import apiClient from './client';

export const credentialsApi = {
  /**
   * Get all credentials (passwords not returned in list)
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/credentials');
  },

  /**
   * Get single credential by id (returns decrypted password)
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getOne: async (id) => {
    return apiClient.get(`/credentials/${id}`);
  },

  /**
   * Create new credential
   * @param {{ client: string, name: string, username?: string, password?: string, url?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async (data) => {
    return apiClient.post('/credentials', data);
  },

  /**
   * Update credential by id
   * @param {string} id
   * @param {{ name?: string, username?: string, password?: string, url?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  update: async (id, data) => {
    return apiClient.put(`/credentials/${id}`, data);
  },

  /**
   * Delete credential by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/credentials/${id}`);
  },
};

export default credentialsApi;
