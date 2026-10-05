const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { search } = require('./search.controller');

router.get('/', auth, search);

module.exports = router;
