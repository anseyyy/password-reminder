import apiClient from './client';

export const usersApi = {
  /**
   * Get current authenticated user profile
   * @returns {Promise<{ success: boolean, data: { _id: string, name: string, email: string, createdAt: string } }>}
   */
  getMe: async () => {
    return apiClient.get('/users/me');
  },
};

export default usersApi;
