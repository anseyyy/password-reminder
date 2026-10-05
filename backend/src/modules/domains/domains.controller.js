const Domain = require('./domains.model');
const Client = require('../clients/clients.model');

// POST /api/domains
const create = async (req, res, next) => {
  try {
    const { client, domainName, expiryDate, registrar, notes } = req.body;
    if (!client || !domainName || !expiryDate)
      return res.status(400).json({ success: false, message: 'client, domainName and expiryDate are required' });

    const parsedDate = new Date(expiryDate);
    if (isNaN(parsedDate.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid expiryDate' });

    const ownedClient = await Client.findOne({ _id: client, createdBy: req.user.id });
    if (!ownedClient) return res.status(404).json({ success: false, message: 'Client not found' });

    const domain = await Domain.create({
      client, domainName: String(domainName).trim(), expiryDate: parsedDate, registrar, notes, createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: domain });
  } catch (err) { next(err); }
};

// GET /api/domains
const getAll = async (req, res, next) => {
  try {
    const domains = await Domain.find({ createdBy: req.user.id })
      .populate('client', 'name company email phone notes')
      .sort({ expiryDate: 1 });
    res.json({ success: true, data: domains });
  } catch (err) { next(err); }
};

// GET /api/domains/:id
const getOne = async (req, res, next) => {
  try {
    const domain = await Domain.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client', 'name company email phone notes');
    if (!domain) return res.status(404).json({ success: false, message: 'Domain not found' });
    res.json({ success: true, data: domain });
  } catch (err) { next(err); }
};

// PUT /api/domains/:id
const update = async (req, res, next) => {
  try {
    const { createdBy, client: _c, ...safe } = req.body;
    if (safe.expiryDate) {
      const d = new Date(safe.expiryDate);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid expiryDate' });
      safe.expiryDate = d;
    }
    const domain = await Domain.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      safe,
      { returnDocument: 'after', runValidators: true }
    );
    if (!domain) return res.status(404).json({ success: false, message: 'Domain not found' });
    res.json({ success: true, data: domain });
  } catch (err) { next(err); }
};



// DELETE /api/domains/:id
const remove = async (req, res, next) => {
  try {
    const domain = await Domain.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!domain) return res.status(404).json({ success: false, message: 'Domain not found' });
    res.json({ success: true, message: 'Domain deleted' });
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getOne, update, remove };

