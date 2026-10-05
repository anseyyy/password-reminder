const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  company:   { type: String },
  email:     { type: String },
  phone:     { type: String },
  notes:     { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
