const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// Trust proxy when behind Render / Vercel reverse proxy
app.set('trust proxy', 1);

/**
 * Normalizes origin by trimming whitespace and removing trailing slashes.
 */
const normalizeOrigin = (origin) => {
  if (!origin || typeof origin !== 'string') return '';
  return origin.trim().replace(/\/+$/, '').toLowerCase();
};

/**
 * Builds list of allowed origins from environment and defaults.
 */
const getAllowedOrigins = () => {
  const defaultAllowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    'https://password-reminder.vercel.app',
    'https://*.vercel.app',
  ];

  const envOrigins = [
    ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : []),
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : []),
  ];

  const combined = [...envOrigins, ...defaultAllowedOrigins]
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter(Boolean);

  return [...new Set(combined)];
};

/**
 * Checks if a given origin matches allowed origins (including wildcard support like *.vercel.app).
 */
const isOriginAllowed = (origin, allowedOriginsList) => {
  if (!origin) return true; // Allow non-browser requests (curl, server-to-server, postman)
  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOriginsList.some((allowed) => {
    if (allowed === '*' || allowed === normalizedOrigin) {
      return true;
    }
    if (allowed.includes('*')) {
      const escaped = allowed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      const regex = new RegExp(`^${escaped}$`, 'i');
      return regex.test(normalizedOrigin);
    }
    return false;
  });
};

// Configure Helmet with cross-origin resource policy enabled for API
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Robust CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Request from disallowed origin: ${origin}`);
      // Return callback(null, false) so browser rejects CORS cleanly without Express 500 error
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// Health check endpoints (available before rate limits and without authentication)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(morgan('dev'));

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || req.method === 'OPTIONS',
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test' || req.method === 'OPTIONS',
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});

app.use(globalLimiter);

const routes = require('../routes');
app.use('/api/auth', authLimiter);
app.use('/api', routes);

app.use(require('../middleware/not-found.middleware'));
app.use(require('../middleware/error.middleware'));

module.exports = app;