const express = require('express');
const router = express.Router();
router.use(require('./register/register.route'));
router.use(require('./login/login.route'));
router.use(require('./forgotPassword/forgotPassword.route'));
module.exports = router;
