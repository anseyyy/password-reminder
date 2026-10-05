const Notification = require('./notifications.model');
const Domain = require('../domains/domains.model');
const Hosting = require('../hosting/hosting.model');

// Helper to calculate calendar days difference
const getDaysDiff = (expiryDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.round((exp - today) / (1000 * 60 * 60 * 24));
};

// GET /api/notifications
const getAll = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch user domains & hostings to automatically ensure renewal alerts exist
    const [domains, hostings] = await Promise.all([
      Domain.find({ createdBy: userId }).populate('client', 'name'),
      Hosting.find({ createdBy: userId }).populate('client', 'name'),
    ]);

    for (const d of domains) {
      if (!d.expiryDate) continue;
      const days = getDaysDiff(d.expiryDate);
      if (days <= 30) {
        const clientText = d.client?.name ? ` for client ${d.client.name}` : '';
        let title = '';
        let message = '';
        if (days < 0) {
          title = `Domain Expired: ${d.domainName}`;
          message = `Domain ${d.domainName}${clientText} expired ${Math.abs(days)}d ago. Renew to avoid downtime.`;
        } else if (days === 0) {
          title = `Domain Expires Today: ${d.domainName}`;
          message = `Domain ${d.domainName}${clientText} expires today! Immediate renewal required.`;
        } else if (days <= 7) {
          title = `Urgent Expiry: ${d.domainName}`;
          message = `Domain ${d.domainName}${clientText} expires in ${days} days.`;
        } else {
          title = `Upcoming Renewal: ${d.domainName}`;
          message = `Domain ${d.domainName}${clientText} is due for renewal in ${days} days.`;
        }

        const existing = await Notification.findOne({ user: userId, title });
        if (!existing) {
          await Notification.create({
            user: userId,
            title,
            message,
            type: 'domain',
            read: false,
          });
        }
      }
    }

    for (const h of hostings) {
      if (!h.expiryDate) continue;
      const days = getDaysDiff(h.expiryDate);
      if (days <= 30) {
        const clientText = h.client?.name ? ` for client ${h.client.name}` : '';
        let title = '';
        let message = '';
        if (days < 0) {
          title = `Hosting Expired: ${h.hostingName}`;
          message = `Hosting plan ${h.hostingName}${clientText} expired ${Math.abs(days)}d ago. Renew to prevent server shutdown.`;
        } else if (days === 0) {
          title = `Hosting Expires Today: ${h.hostingName}`;
          message = `Hosting plan ${h.hostingName}${clientText} expires today! Action required.`;
        } else if (days <= 7) {
          title = `Urgent Expiry: ${h.hostingName}`;
          message = `Hosting plan ${h.hostingName}${clientText} expires in ${days} days.`;
        } else {
          title = `Upcoming Renewal: ${h.hostingName}`;
          message = `Hosting plan ${h.hostingName}${clientText} is due for renewal in ${days} days.`;
        }

        const existing = await Notification.findOne({ user: userId, title });
        if (!existing) {
          await Notification.create({
            user: userId,
            title,
            message,
            type: 'hosting',
            read: false,
          });
        }
      }
    }

    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

// PATCH /api/notifications/:id/read
const markRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { read: true },
      { returnDocument: 'after' }
    );
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: notification });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
const remove = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) { next(err); }
};

module.exports = { getAll, markRead, remove };
