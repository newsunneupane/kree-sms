const express = require('express');
const router = express.Router();
const { scheduleSms, getScheduled } = require('../controllers/scheduleController');

router.get('/get-scheduled', getScheduled);
router.post('/schedule-sms', scheduleSms);

module.exports = router;