const Hosting = require('./hosting.model');
const Client  = require('../clients/clients.model');



const create = async (req, res, next) => {
  try {
    const { client, hostingName, expiryDate, provider, hostname, serverIp, notes } = req.body;
    if (!client || !hostingName || !expiryDate)
      return res.status(400).json({ success: false, message: 'client, hostingName and expiryDate are required' });

    const parsedDate = new Date(expiryDate);
    if (isNaN(parsedDate.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid expiryDate' });

    const ownedClient = await Client.findOne({ _id: client, createdBy: req.user.id });
    if (!ownedClient) return res.status(404).json({ success: false, message: 'Client not found' });

    const hosting = await Hosting.create({
      client, hostingName: String(hostingName).trim(), expiryDate: parsedDate,
      provider, hostname, serverIp, notes, createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: hosting });
  } catch (err) { next(err); }
};



const getAll = async (req, res, next) => {
  try {
    const hostings = await Hosting.find({ createdBy: req.user.id })
      .populate('client', 'name company email phone notes')
      .sort({ expiryDate: 1 });
    res.json({ success: true, data: hostings });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const hosting = await Hosting.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client', 'name company email phone notes');
    if (!hosting) return res.status(404).json({ success: false, message: 'Hosting record not found' });
    res.json({ success: true, data: hosting });
  } catch (err) { next(err); }
};



const update = async (req, res, next) => {
  try {
    const { createdBy, client: _c, ...safe } = req.body;
    if (safe.expiryDate) {
      const d = new Date(safe.expiryDate);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid expiryDate' });
      safe.expiryDate = d;
    }
    const hosting = await Hosting.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      safe,
      { returnDocument: 'after', runValidators: true }
    );
    if (!hosting) return res.status(404).json({ success: false, message: 'Hosting record not found' });
    res.json({ success: true, data: hosting });
  } catch (err) { next(err); }
};


const remove = async (req, res, next) => {
  try {
    const hosting = await Hosting.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!hosting) return res.status(404).json({ success: false, message: 'Hosting record not found' });
    res.json({ success: true, message: 'Hosting record deleted' });
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getOne, update, remove };

