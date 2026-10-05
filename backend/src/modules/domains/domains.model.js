const mongoose = require('mongoose');

const domainSchema = new mongoose.Schema({
  client:     { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  domainName: { type: String, required: true },
  registrar:  { type: String },
  expiryDate: { type: Date, required: true },
  notes:      { type: String },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Domain', domainSchema);
