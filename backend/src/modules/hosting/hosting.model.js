const mongoose = require('mongoose');

const hostingSchema = new mongoose.Schema({
  client:      { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  provider:    { type: String },
  hostingName: { type: String, required: true },
  hostname:    { type: String },
  serverIp:    { type: String },
  expiryDate:  { type: Date, required: true },
  notes:       { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Hosting', hostingSchema);
