import apiClient from './client';

export const searchApi = {
  /**
   * Search across clients, domains, hosting, and credentials
   * @param {string} query Search term (must be at least 2 characters)
   * @returns {Promise<{ success: boolean, data: { clients: Array, domains: Array, hosting: Array, credentials: Array } }>}
   */
  search: async (query) => {
    const q = encodeURIComponent(query.trim());
    return apiClient.get(`/search?q=${q}`);
  },
};

export default searchApi;
