const Client = require('./clients.model');

// POST /api/clients
const create = async (req, res, next) => {
  try {
    const { name, company, email, phone, notes } = req.body;
    if (!name || !String(name).trim())
      return res.status(400).json({ success: false, message: 'Name is required' });
    const client = await Client.create({
      name: String(name).trim(), company, email, phone, notes, createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: client });
  } catch (err) { next(err); }
};

// GET /api/clients
const getAll = async (req, res, next) => {
  try {
    const clients = await Client.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: clients });
  } catch (err) { next(err); }
};

// GET /api/clients/:id
const getOne = async (req, res, next) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, createdBy: req.user.id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) { next(err); }
};

// PUT /api/clients/:id
const update = async (req, res, next) => {
  try {
    // Prevent ownership hijack
    const { createdBy, ...safe } = req.body;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      safe,
      { returnDocument: 'after', runValidators: true }
    );
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, data: client });
  } catch (err) { next(err); }
};

// DELETE /api/clients/:id
const remove = async (req, res, next) => {
  try {
    const client = await Client.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });
    res.json({ success: true, message: 'Client deleted' });
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getOne, update, remove };

