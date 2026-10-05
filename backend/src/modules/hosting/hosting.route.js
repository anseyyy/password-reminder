const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth.middleware');
const { create, getAll, getOne, update, remove } = require('./hosting.controller');

router.use(auth); // all hosting routes require login

router.post('/',      create);
router.get('/',       getAll);
router.get('/:id',    getOne);
router.put('/:id',    update);
router.delete('/:id', remove);

module.exports = router;
