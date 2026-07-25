const { ScheduledSms } = require('../models');

exports.scheduleSms = async (req, res, next) => {
  try {
    const { user_id, recipient, message, scheduled_at } = req.body;

    if (!recipient?.trim() || !message?.trim() || !scheduled_at) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    await ScheduledSms.create({
      user_id,
      sms_type: 'single',
      recipient,
      message,
      scheduled_at,
      status: 'pending',
    });

    res.json({ success: true, message: 'SMS scheduled successfully!' });
  } catch (error) {
    next(error);
  }
};

exports.getScheduled = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const schedules = await ScheduledSms.findAll({
      where: { user_id },
      attributes: ['id', 'sms_type', 'recipient', 'message', 'scheduled_at', 'status'],
      order: [['scheduled_at', 'ASC']],
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
};