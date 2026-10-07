
/**
 * Authoritative Base URL for API requests.
 *
 * In production:
 * - Requires NEXT_PUBLIC_API_URL (e.g. https://password-reminder.onrender.com/api).
 * - Never silently falls back to localhost.
 *
 * In development:
 * - Defaults to http://localhost:5000/api if NEXT_PUBLIC_API_URL is unset.
 */
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl && envUrl.trim()) {
    let url = envUrl.trim().replace(/\/+$/, '');
    if (!url.endsWith('/api') && !url.includes('/api/')) {
      url = `${url}/api`;
    }
    return url;
  }

  // Prevent silent fallback to localhost in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Configuration Error: Missing required NEXT_PUBLIC_API_URL environment variable in production. Please set NEXT_PUBLIC_API_URL in your Vercel project settings.'
    );
  }

  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;

