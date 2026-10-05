const Reminder = require('./reminders.model');
const Client   = require('../clients/clients.model');
const { EXPIRY_STATUSES } = require('../../constants/reminder.constants');

// POST /api/reminders  (manual reminders only)
const create = async (req, res, next) => {
  try {
    const { client, type, title, message, reminderDate, expiryDate } = req.body;
    if (!client || !type || !title || !reminderDate)
      return res.status(400).json({ success: false, message: 'client, type, title and reminderDate are required' });

    const parsedReminderDate = new Date(reminderDate);
    if (isNaN(parsedReminderDate.getTime()))
      return res.status(400).json({ success: false, message: 'Invalid reminderDate' });

    const ownedClient = await Client.findOne({ _id: client, createdBy: req.user.id });
    if (!ownedClient) return res.status(404).json({ success: false, message: 'Client not found' });

    const reminder = await Reminder.create({
      client, type, title, message,
      reminderDate: parsedReminderDate,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      source: 'manual',
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: reminder });
  } catch (err) { next(err); }
};

// GET /api/reminders
// Returns all reminders for the logged-in user, sorted:
//   1. upcoming / today  (by reminderDate ascending)
//   2. expired           (by reminderDate descending — most recent expiry first)
const getAll = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ createdBy: req.user.id })
      .populate('client', 'name company')
      .sort({ reminderDate: -1 }); // newest first; UI can re-sort by status

    // Enrich each reminder with a computed display label
    const enriched = reminders.map(r => {
      const doc = r.toObject();

      // Derive a display status label for the UI (fallback for manual reminders)
      if (!doc.status && doc.expiryDate) {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const expiry = new Date(doc.expiryDate); expiry.setHours(0, 0, 0, 0);
        const diff = Math.round((today - expiry) / (1000 * 60 * 60 * 24));
        if (diff < 0)       doc.status = EXPIRY_STATUSES.UPCOMING;
        else if (diff === 0) doc.status = EXPIRY_STATUSES.TODAY;
        else                 doc.status = EXPIRY_STATUSES.EXPIRED;
      }

      return doc;
    });

    res.json({ success: true, data: enriched });
  } catch (err) { next(err); }
};

// GET /api/reminders/:id
const getOne = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({ _id: req.params.id, createdBy: req.user.id })
      .populate('client', 'name company');
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: reminder });
  } catch (err) { next(err); }
};

// PUT /api/reminders/:id
const update = async (req, res, next) => {
  try {
    // Strip protected fields (auto-reminders should not be mutated via this endpoint)
    const { createdBy, client: _c, source, sourceId, sourceType, daysOffset, status, ...safe } = req.body;
    if (safe.reminderDate) {
      const d = new Date(safe.reminderDate);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, message: 'Invalid reminderDate' });
      safe.reminderDate = d;
    }
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user.id },
      safe,
      { returnDocument: 'after', runValidators: true }
    );
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, data: reminder });
  } catch (err) { next(err); }
};

// DELETE /api/reminders/:id
const remove = async (req, res, next) => {
  try {
    const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (err) { next(err); }
};

module.exports = { create, getAll, getOne, update, remove };


