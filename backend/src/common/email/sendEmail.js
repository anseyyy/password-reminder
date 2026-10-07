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
    const port = Number(process.env.SMTP_PORT) || 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;

    if (!user || !pass) {
      console.warn('[Email] SMTP credentials not set (SMTP_USER / SMTP_PASS). Email functionality will be unavailable.');
      return false;
    }

    const transporter = getTransporter();
    await transporter.verify();
    console.log(`[Email] SMTP connection verified successfully over IPv4 (${host}:${port})`);
    return true;
  } catch (err) {
    // Log safely without revealing passwords
    console.warn('[Email] SMTP verification failed:', err.message);
    return false;
  }
};

module.exports = { sendEmail, verifyTransporter, createTransporter, getTransporter };


