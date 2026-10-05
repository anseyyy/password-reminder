import apiClient from './client';

export const authApi = {
  /**
   * Register a new user
   * @param {{ name: string, email: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, message: string, data: { id: string } }>}
   */
  register: async ({ name, email, password }) => {
    return apiClient.post('/auth/register', { name, email, password });
  },

  /**
   * Login user with email and password
   * @param {{ email: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, message: string, token: string, data: { id: string, name: string, email: string } }>}
   */
  login: async ({ email, password }) => {
    return apiClient.post('/auth/login', { email, password });
  },

  /**
   * Send OTP for password reset
   * @param {{ email: string }} data
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  forgotPassword: async ({ email }) => {
    return apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Verify OTP for password reset
   * @param {{ email: string, otp: string }} data
   * @returns {Promise<{ success: boolean, message: string, resetToken: string }>}
   */
  verifyOtp: async ({ email, otp }) => {
    return apiClient.post('/auth/verify-otp', { email, otp });
  },

  /**
   * Reset password with resetToken
   * @param {{ email: string, resetToken: string, newPassword: string }} data
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  resetPassword: async ({ email, resetToken, newPassword }) => {
    return apiClient.post('/auth/reset-password', { email, resetToken, newPassword });
  },

  /**
   * Save token and user data to localStorage
   */
  saveAuth: (token, user) => {
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem('token', token);
    if (user) localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Clear auth data and remove token
   */
  clearAuth: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get stored JWT token
   */
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || null;
  },

  /**
   * Get stored user object
   */
  getUser: () => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Logout helper: clears stored credentials and redirects to login
   */
  logout: () => {
    if (typeof window === 'undefined') return;
    authApi.clearAuth();
    window.location.href = '/auth/login';
  },
};

export default authApi;
