import { API_BASE_URL } from './baseurl';

/**
 * Custom API Error class containing status and backend payload
 */
export class ApiError extends Error {
  constructor(message, status = 500, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Helper to get stored auth token in browser environment
 */
export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token') || null;
};

/**
 * Helper to clear auth and redirect on 401 Unauthorized
 */
export const handleUnauthorized = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Dispatch custom event for React state listeners
  window.dispatchEvent(new Event('auth:unauthorized'));

  // Avoid redirect loop if already on an auth page
  const currentPath = window.location.pathname;
  if (!currentPath.startsWith('/auth/')) {
    window.location.href = '/auth/login';
  }
};

/**
 * Core request function using native fetch
 */
async function request(endpoint, options = {}) {
  const {
    method = 'GET',
    headers = {},
    body,
    token: customToken,
    ...restOptions
  } = options;

  // Clean endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  // Build headers
  const token = customToken !== undefined ? customToken : getStoredToken();
  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  // Build fetch configuration
  const config = {
    method,
    headers: requestHeaders,
    ...restOptions,
  };

  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new ApiError(
      'Unable to connect to server. Please check your internet connection or server status.',
      0,
      networkError
    );
  }

  // Parse JSON response body if present
  let responseData = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  }

  // Handle 401 Unauthorized
  if (response.status === 401) {
    handleUnauthorized();
    const message = responseData?.message || 'Unauthorized. Please sign in again.';
    throw new ApiError(message, 401, responseData);
  }

  // Handle other non-2xx status codes
  if (!response.ok) {
    const message =
      responseData?.message ||
      `Request failed with status ${response.status} (${response.statusText})`;
    throw new ApiError(message, response.status, responseData);
  }

  return responseData;
}

/**
 * Reusable API Client supporting standard HTTP methods
 */
export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, data, options = {}) =>
    request(endpoint, { ...options, method: 'POST', body: data }),
  put: (endpoint, data, options = {}) =>
    request(endpoint, { ...options, method: 'PUT', body: data }),
  patch: (endpoint, data, options = {}) =>
    request(endpoint, { ...options, method: 'PATCH', body: data }),
  delete: (endpoint, options = {}) =>
    request(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
