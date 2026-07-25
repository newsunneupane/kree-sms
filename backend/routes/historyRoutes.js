const express = require('express');
const router = express.Router();
const { getHistory } = require('../controllers/userController');

router.get('/history', getHistory);

module.exports = router;