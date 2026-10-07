const dns = require('dns');
const net = require('net');
const nodemailer = require('nodemailer');

// Force IPv4 DNS resolution order in Node 17+
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Custom socket factory that dynamically resolves host to IPv4 and opens
 * a direct IPv4 TCP socket. Nodemailer then manages STARTTLS or TLS wrapping.
 * This guarantees Nodemailer never attempts IPv6 connections on cloud
 * container environments like Render (eliminating ENETUNREACH errors).
 */
const createIPv4Socket = async (options, callback) => {
  try {
    const host = options.host || 'smtp.gmail.com';
    const port = Number(options.port) || (options.secure ? 465 : 587);
    const timeout = Number(options.connectionTimeout) || 10000;

    // Dynamically resolve hostname to an IPv4 address (family: 4)
    let ipAddress = host;
    if (!net.isIP(host)) {
      try {
        const lookupRes = await dns.promises.lookup(host, { family: 4 });
        ipAddress = lookupRes.address;
      } catch (dnsErr) {
        // Fallback to resolve4 if standard lookup fails
        const addrs = await dns.promises.resolve4(host);
        if (addrs && addrs.length > 0) {
          ipAddress = addrs[0];
        } else {
          throw dnsErr;
        }
      }
    }

    const socket = net.connect({
      host: ipAddress,
      port,
      family: 4,
      timeout,
    });

    let handled = false;
    socket.once('error', (err) => {
      if (!handled) {
        handled = true;
        callback(err);
      }
    });

    socket.once('connect', () => {
      if (!handled) {
        handled = true;
        socket.setKeepAlive(true);
        callback(null, { connection: socket });
      }
    });
  } catch (err) {
    callback(err);
  }
};

/**
 * Creates and returns a configured Nodemailer transporter
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  // Default to Port 465 on cloud hosting (Render blocks port 587/25 by default)
  const port = Number(process.env.SMTP_PORT) || 465;
  
  // Port 465 uses implicit TLS (secure: true), Port 587 uses STARTTLS (secure: false)
  const isSecure = process.env.SMTP_SECURE !== undefined
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

  const transportOptions = {
    host,
    port,
    secure: isSecure,
    // Strict IPv4 options
    family: Number(process.env.SMTP_FAMILY) || 4,
    getSocket: createIPv4Socket,
    // Connection timeouts to prevent hanging requests
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT) || 10000, // 10s
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT) || 10000,     // 10s
    socketTimeout: Number(process.env.SMTP_SOCKET_TIMEOUT) || 15000,         // 15s
    dnsTimeout: Number(process.env.SMTP_DNS_TIMEOUT) || 5000,                // 5s
    tls: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
    },
  };

  if (user && pass) {
    transportOptions.auth = { user, pass };
  }

  return nodemailer.createTransport(transportOptions);
};

// Cached transporter instance
let transporterInstance = null;

const getTransporter = () => {
  if (!transporterInstance) {
    transporterInstance = createTransporter();
  }
  return transporterInstance;
};

/**
 * Sends an email using Resend HTTP API (Port 443, never blocked on Render)
 */
const sendViaResend = async ({ to, subject, message, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.SMTP_FROM || process.env.RESEND_FROM || 'RemindPro <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      text: message,
      ...(html ? { html } : {}),
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error?.message || `Resend API Error (${response.status})`);
  }

  return data;
};

/**
 * Sends an email using either Resend API (recommended for Render) or SMTP transporter
 */
const sendEmail = async ({ to, subject, message, html }) => {
  // If Resend API key is configured, prioritize HTTPS API (bypasses Render SMTP port blocks)
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend({ to, subject, message, html });
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM || user;

  if (!user || !pass) {
    throw new Error('Email credentials not configured. Please set RESEND_API_KEY or SMTP_USER/SMTP_PASS in environment variables.');
  }

  if (!fromAddress) {
    throw new Error('Email sender address (SMTP_FROM / SMTP_USER) is not configured');
  }

  const transporter = getTransporter();

  const formattedFrom = fromAddress.includes('<')
    ? fromAddress
    : `"RemindPro" <${fromAddress}>`;

  return await transporter.sendMail({
    from: formattedFrom,
    to,
    subject,
    text: message,
    ...(html ? { html } : {}),
  });
};

/**
 * Startup email verification (non-fatal, safe logging)
 */
const verifyTransporter = async () => {
  try {
    if (process.env.RESEND_API_KEY) {
      console.log('[Email] Resend API configured (HTTPS port 443 — Render production ready)');
      return true;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (!user || !pass) {
      console.warn('[Email] Email credentials not set (RESEND_API_KEY or SMTP_USER/SMTP_PASS). Email functionality will be unavailable.');
      return false;
    }

    const transporter = getTransporter();
    await transporter.verify();
    console.log(`[Email] SMTP connection verified successfully over IPv4 (${host}:${port})`);
    return true;
  } catch (err) {
    // Log safely without revealing passwords
    console.warn('[Email] Email verification failed:', err.message);
    return false;
  }
};

module.exports = { sendEmail, verifyTransporter, createTransporter, getTransporter };


