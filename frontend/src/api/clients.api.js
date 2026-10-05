import apiClient from './client';

export const clientsApi = {
  /**
   * Get all clients for authenticated user
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/clients');
  },

  /**
   * Get single client by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getOne: async (id) => {
    return apiClient.get(`/clients/${id}`);
  },

  /**
   * Create a new client
   * @param {{ name: string, company?: string, email?: string, phone?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async (data) => {
    return apiClient.post('/clients', data);
  },

  /**
   * Update client by id
   * @param {string} id
   * @param {{ name?: string, company?: string, email?: string, phone?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  update: async (id, data) => {
    return apiClient.put(`/clients/${id}`, data);
  },

  /**
   * Delete client by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/clients/${id}`);
  },
};

export default clientsApi;
