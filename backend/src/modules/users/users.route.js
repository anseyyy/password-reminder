const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { getMe } = require('./users.controller');

router.get('/me', auth, getMe);

module.exports = router;
