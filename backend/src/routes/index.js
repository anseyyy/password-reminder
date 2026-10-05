const express = require('express');
const router = express.Router();

router.use('/auth',    require('../modules/auth'));
router.use('/users',   require('../modules/users/users.route'));
router.use('/clients', require('../modules/clients/clients.route'));
router.use('/domains', require('../modules/domains/domains.route'));
router.use('/hosting',     require('../modules/hosting/hosting.route'));
router.use('/credentials', require('../modules/credentials/credentials.route'));
router.use('/reminders',   require('../modules/reminders/reminders.route'));
router.use('/calendar',    require('../modules/calendar/calendar.route'));
router.use('/search',        require('../modules/search/search.route'));
router.use('/notifications', require('../modules/notifications/notifications.route'));

module.exports = router;







