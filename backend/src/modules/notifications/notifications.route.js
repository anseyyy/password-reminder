const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { getAll, markRead, remove } = require('./notifications.controller');

router.use(auth); // all notification routes require login

router.get('/',           getAll);
router.patch('/:id/read', markRead);
router.delete('/:id',     remove);

module.exports = router;
