const cron = require('node-cron');
const { checkExpiryReminders } = require('./reminderJob');
const { verifyTransporter } = require('../email/sendEmail');

let started = false;

// Runs every day at 8:00 AM
const startScheduler = async () => {
  if (started) return; // prevent duplicate startup
  started = true;

  // Verify SMTP connection in background (non-fatal)
  verifyTransporter();

  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Running daily expiry check...');
    await checkExpiryReminders();
  });

  console.log('[Scheduler] Daily reminder scheduler started (runs at 08:00).');
};

module.exports = { startScheduler };

