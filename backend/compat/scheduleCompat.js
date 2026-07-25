const express = require('express');
const router = express.Router();
const { ScheduledSms } = require('../models');

router.all('/schedule.php', async (req, res, next) => {
  try {
    const input = req.method === 'GET' ? req.query : req.body;
    const action = input.action || req.query.action || '';
    const user_id = parseInt(input.user_id || req.query.user_id, 10);

    if (!user_id) {
      return res.json({ success: false, message: 'Unauthorized access request.' });
    }

    if (action === 'get_scheduled') {
      const schedules = await ScheduledSms.findAll({
        where: { user_id },
        attributes: ['id', 'sms_type', 'recipient', 'message', 'scheduled_at', 'status'],
        order: [['scheduled_at', 'ASC']],
      });
      return res.json({ success: true, data: schedules });
    }

    if (action === 'schedule_sms') {
      const { recipient, message, scheduled_at } = input;
      if (!recipient?.trim() || !message?.trim() || !scheduled_at) {
        return res.json({ success: false, message: 'All fields are mandatory.' });
      }
      await ScheduledSms.create({
        user_id, sms_type: 'single', recipient, message, scheduled_at, status: 'pending',
      });
      return res.json({ success: true, message: 'Message task queued successfully!' });
    }

    return res.json({ success: false, message: 'Unknown schedule action.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;