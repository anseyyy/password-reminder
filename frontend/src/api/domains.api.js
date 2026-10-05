import apiClient from './client';

export const domainsApi = {
  /**
   * Get all domains for authenticated user (populated with client name & company)
   * @returns {Promise<{ success: boolean, data: Array }>}
   */
  getAll: async () => {
    return apiClient.get('/domains');
  },

  /**
   * Get single domain by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  getOne: async (id) => {
    return apiClient.get(`/domains/${id}`);
  },

  /**
   * Create a new domain
   * @param {{ client: string, domainName: string, expiryDate: string, registrar?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  create: async (data) => {
    return apiClient.post('/domains', data);
  },

  /**
   * Update domain by id
   * @param {string} id
   * @param {{ domainName?: string, expiryDate?: string, registrar?: string, notes?: string }} data
   * @returns {Promise<{ success: boolean, data: Object }>}
   */
  update: async (id, data) => {
    return apiClient.put(`/domains/${id}`, data);
  },

  /**
   * Delete domain by id
   * @param {string} id
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  remove: async (id) => {
    return apiClient.delete(`/domains/${id}`);
  },
};

export default domainsApi;
