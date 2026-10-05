require('dotenv').config();
const mongoose = require('mongoose');
const dbConnect = require('./src/common/database/dbConnect');
const app = require('./src/app/app');
const { startScheduler } = require('./src/common/scheduler/scheduler');

const PORT = process.env.PORT || 5000;

const shutdown = (signal) => {
  console.log(`[Server] ${signal} received — shutting down gracefully`);
  mongoose.connection.close(() => {
    console.log('[DB] MongoDB connection closed');
    process.exit(0);
  });
};

(async () => {
  try {
    await dbConnect();
    await startScheduler();
    app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
})();