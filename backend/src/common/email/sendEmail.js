const dns = require('dns');
const nodemailer = require('nodemailer');

// Force IPv4 DNS resolution order in Node 17+ to prevent ENETUNREACH errors on cloud container hosts like Render
if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

/**
 * Creates and returns a configured Nodemailer transporter
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;
  
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
    // Force IPv4 address family to prevent IPv6 routing failures on Render/cloud containers
    family: Number(process.env.SMTP_FAMILY) || 4,
    // Reasonable connection timeouts to prevent requests hanging for ~120s
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
 * Sends an email using the configured SMTP transporter
 */
const sendEmail = async ({ to, subject, message, html }) => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const fromAddress = process.env.SMTP_FROM || user;

  if (!user || !pass) {
    throw new Error('SMTP credentials (SMTP_USER / SMTP_PASS) are not configured');
  }

  if (!fromAddress) {
    throw new Error('SMTP sender address (SMTP_FROM / SMTP_USER) is not configured');
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
 * Startup SMTP verification (non-fatal, safe logging)
 */
const verifyTransporter = async () => {
  try {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (!user || !pass) {
      console.warn('[Email] SMTP credentials not set (SMTP_USER / SMTP_PASS). Email functionality will be unavailable.');
      return false;
    }

    const transporter = getTransporter();
    await transporter.verify();
    console.log(`[Email] SMTP connection verified successfully (${host})`);
    return true;
  } catch (err) {
    // Log safely without revealing passwords
    console.warn('[Email] SMTP verification failed:', err.message);
    return false;
  }
};

module.exports = { sendEmail, verifyTransporter, createTransporter, getTransporter };


