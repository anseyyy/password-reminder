const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error('SMTP_HOST and SMTP_FROM must be set in environment');
  }
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const transporter = createTransporter();

const sendEmail = async ({ to, subject, message, html }) => {
  await transporter.sendMail({
    from:    process.env.SMTP_FROM,
    to,
    subject,
    text: message,
    ...(html ? { html } : {}),
  });
};

// Optional startup verification — non-fatal
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified');
  } catch (err) {
    // Log safely — never expose SMTP password
    console.warn('[Email] SMTP verification failed:', err.message);
  }
};

module.exports = { sendEmail, verifyTransporter };

