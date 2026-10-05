const Credential = require('./credentials.model');
const Client     = require('../clients/clients.model');
const { encrypt, decrypt } = require('../../common/encryption/encrypt');

// POST /api/credentials
const create = async (req, res, next) => {
  try {
    const { client, name, username, password, url, notes } = req.body;
    if (!client || !name)
      return res.status(400).json({ success: false, message: 'client and name are required' });

    const ownedClient = await Client.findOne({ _id: client, createdBy: req.user.id });
    if (!ownedClient) return res.status(404).json({ success: false, message: 'Client not found' });

    const encryptedPassword = password ? encrypt(String(password)) : undefined;
    const credential = await Credential.create({
      client, name: String(name).trim(), username, password: encryptedPassword, url, notes,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: _safe(credential) });
  } catch (err) { next(err); }
};

// GET /api/credentials — passwords NOT returned
const getAll = async (req, res, next) => {
  try {
    const credentials = await Credential.find({ createdBy: req.user.id })
      .populate('client', 'name company')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: credentials.map(_safe) });
  } catch (err) { next(err); }
};

// GET /api/credentials/:id — decrypted password returned to owner only
const getOne = async (req, res, next) => {
  try {
    const credential = await Credential.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client', 'name company');
    if (!credential) return res.status(404).json({ success: false, message: 'Credential not found' });

    const data = credential.toObject();
    if (data.password) data.password = decrypt(data.password);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// PUT /api/credentials/:id
const update = async (req, res, next) => {
  try {
    // Strip protected fields
    const { createdBy, client: _c, ...safe } = req.body;

    // Re-encrypt only if password provided; otherwise unset it so existing encrypted value is preserved
    if (safe.password) {
      safe.password = encrypt(String(safe.password));
    } else {
      delete safe.password; // don't overwrite with empty/null
    }

    const credential = await Credential.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      safe,
      { returnDocument: 'after', runValidators: true }
    );
    if (!credential) return res.status(404).json({ success: false, message: 'Credential not found' });
    res.json({ success: true, data: _safe(credential) });
  } catch (err) { next(err); }
};

// DELETE /api/credentials/:id
const remove = async (req, res, next) => {
  try {
    const credential = await Credential.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!credential) return res.status(404).json({ success: false, message: 'Credential not found' });
    res.json({ success: true, message: 'Credential deleted' });
  } catch (err) { next(err); }
};

// Strip password from list responses
const _safe = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  delete obj.password;
  return obj;
};

module.exports = { create, getAll, getOne, update, remove };

