const { User, SmsLog, CreditRequest, SystemSetting, ScheduledSms } = require('../models');
const aakashSmsService = require('../services/aakashSmsService');
const { calculateCreditCost } = require('../services/creditCalculator');
const { Op, sequelize } = require('sequelize');

exports.sendSms = async (req, res, next) => {
  try {
    const { user_id, sms_type, to, message, csv_raw_text, global_message, scheduled_at } = req.body;

    const user = await User.scope(null).findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const messagesToSend = [];

    if (sms_type === 'single') {
      if (!to || !message) {
        return res.status(400).json({ success: false, message: 'Recipient and message required.' });
      }
      messagesToSend.push({ to, text: message });

    } else if (sms_type === 'bulk') {
      if (!csv_raw_text || !global_message) {
        return res.status(400).json({ success: false, message: 'Bulk data and message required.' });
      }

      if (csv_raw_text.startsWith('SYSTEM_GROUP_ID:')) {
        const groupId = parseInt(csv_raw_text.replace('SYSTEM_GROUP_ID:', ''), 10);
        const { Contact } = require('../models');
        const contacts = await Contact.findAll({
          where: { user_id, group_id: groupId },
        });
        for (const c of contacts) {
          messagesToSend.push({ to: c.mobile, text: global_message });
        }
      } else {
        const lines = csv_raw_text.replace(/\r/g, '').split('\n');
        for (let i = 1; i < lines.length; i++) {
          const phone = lines[i].trim();
          if (phone) messagesToSend.push({ to: phone, text: global_message });
        }
      }

    } else if (sms_type === 'dynamic') {
      if (!csv_raw_text) {
        return res.status(400).json({ success: false, message: 'Dynamic CSV data required.' });
      }

      const dynamicMatch = csv_raw_text.match(/SYSTEM_DYNAMIC_GROUP:(\d+)\|\|TEMPLATE:(.*)/s);
      if (dynamicMatch) {
        const groupId = parseInt(dynamicMatch[1], 10);
        const template = dynamicMatch[2];
        const { Contact } = require('../models');
        const contacts = await Contact.findAll({
          where: { user_id },
          include: [{
            model: require('../models/Group'),
            through: { attributes: [] },
            where: { id: groupId },
            required: true,
          }],
        });
        for (const c of contacts) {
          const personalized = template.replace(/{name}/g, c.firstname);
          messagesToSend.push({ to: c.mobile, text: personalized });
        }
      } else {
        const rows = csv_raw_text.split('\n');
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',');
          if (cols.length >= 2) {
            const phone = cols[0].trim();
            const msg = cols[1].trim();
            if (phone && msg) messagesToSend.push({ to: phone, text: msg });
          }
        }
      }
    }

    if (messagesToSend.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid messages to send.' });
    }

    const compiledPackets = messagesToSend.map(m => ({
      to: m.to,
      text: m.text,
      cost: calculateCreditCost(m.text),
    }));

    const totalRequired = compiledPackets.reduce((sum, p) => sum + p.cost, 0);

    if (user.sms_balance < totalRequired) {
      return res.status(400).json({
        success: false,
        message: `Insufficient credits! Requires ${totalRequired} credits, you have ${user.sms_balance}.`,
      });
    }

    if (scheduled_at) {
      await ScheduledSms.create({
        user_id,
        sms_type,
        recipient: 'BATCH_QUEUE',
        message: 'BATCH_TEMPLATE',
        scheduled_at,
        status: 'pending',
        batch_data: compiledPackets,
      });
      return res.json({
        success: true,
        message: `Campaign scheduled! ${compiledPackets.length} messages queued for ${scheduled_at}.`,
      });
    }

    let successCount = 0;
    let failedCount = 0;
    let actualDeducted = 0;

    for (const packet of compiledPackets) {
      try {
        const result = await aakashSmsService.sendSms(packet.to, packet.text);

        if (result.success) {
          successCount++;
          actualDeducted += packet.cost;

          if (result.availableCredit !== null) {
            await SystemSetting.upsert({
              key: 'aakash_api_balance',
              value: String(result.availableCredit),
            });
          } else {
            const setting = await SystemSetting.findByPk('aakash_api_balance');
            if (setting) {
              setting.value = String(parseInt(setting.value, 10) - packet.cost);
              await setting.save();
            }
          }

          await SmsLog.create({
            user_id, sms_type, recipient: packet.to, message: packet.text,
            status: 'success', gateway_response: JSON.stringify(result.raw),
          });
        } else {
          failedCount++;
          await SmsLog.create({
            user_id, sms_type, recipient: packet.to, message: packet.text,
            status: 'failed', gateway_response: JSON.stringify(result.raw || result.error),
          });
        }
      } catch (err) {
        failedCount++;
        await SmsLog.create({
          user_id, sms_type, recipient: packet.to, message: packet.text,
          status: 'failed', gateway_response: JSON.stringify({ error: err.message }),
        });
      }
    }

    if (actualDeducted > 0) {
      user.sms_balance -= actualDeducted;
      await user.save();
    }

    res.json({
      success: true,
      message: `Campaign done. Sent: ${successCount}, Failed: ${failedCount}. Credits used: ${actualDeducted}.`,
    });
  } catch (error) {
    next(error);
  }
};

exports.buyCredits = async (req, res, next) => {
  try {
    const { user_id, credits, reference } = req.body;
    await CreditRequest.create({ user_id, requested_credits: credits, payment_reference: reference });
    res.json({ success: true, message: 'Credit request submitted for admin approval.' });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const setting = await SystemSetting.findByPk('aakash_api_balance');
    const gatewayCredits = setting ? parseInt(setting.value, 10) : 0;

    res.json({
      success: true,
      data: {
        sms_balance: user.sms_balance,
        gateway_status: 'Connected',
        gateway_credits: gatewayCredits,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const logs = await SmsLog.findAll({
      where: { user_id },
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

exports.getPurchases = async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const purchases = await CreditRequest.findAll({
      where: { user_id },
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: purchases });
  } catch (error) {
    next(error);
  }
};