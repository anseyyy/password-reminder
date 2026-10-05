const mongoose = require('mongoose');

const dbConnect = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined in environment');
  await mongoose.connect(uri);
  console.log('[DB] MongoDB connected');
};

module.exports = dbConnect;