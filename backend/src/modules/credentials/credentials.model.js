const mongoose = require('mongoose');

const credentialSchema = new mongoose.Schema({
  client:    { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  name:      { type: String, required: true },
  username:  { type: String },
  password:  { type: String }, // stored encrypted
  url:       { type: String },
  notes:     { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Credential', credentialSchema);
