const Client     = require('../clients/clients.model');
const Domain     = require('../domains/domains.model');
const Hosting    = require('../hosting/hosting.model');
const Credential = require('../credentials/credentials.model');

// Escape special regex characters to prevent ReDoS
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/search?q=
const search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q)
      return res.json({ success: true, data: { clients: [], domains: [], hosting: [], credentials: [] } });
    if (q.length > 100)
      return res.status(400).json({ success: false, message: 'Search query must be under 100 characters' });

    const regex = { $regex: escapeRegex(q), $options: 'i' };
    const owner = req.user.id;

    const [clients, domains, hosting, credentials] = await Promise.all([
      Client.find({
        createdBy: owner,
        $or: [{ name: regex }, { company: regex }, { email: regex }, { phone: regex }],
      }).select('name company email phone'),

      Domain.find({
        createdBy: owner,
        $or: [{ domainName: regex }, { registrar: regex }],
      }).select('domainName registrar expiryDate').populate('client', 'name'),

      Hosting.find({
        createdBy: owner,
        $or: [{ hostingName: regex }, { provider: regex }, { hostname: regex }, { serverIp: regex }],
      }).select('hostingName provider hostname serverIp expiryDate').populate('client', 'name'),

      Credential.find({
        createdBy: owner,
        $or: [{ name: regex }, { username: regex }, { url: regex }],
      }).select('name username url client').populate('client', 'name'),
    ]);

    res.json({ success: true, data: { clients, domains, hosting, credentials } });
  } catch (err) { next(err); }
};

module.exports = { search };

