const express = require('express');
const router = express.Router();
const { User, SmsLog, CreditRequest, SystemSetting, ScheduledSms, Contact, Group } = require('../models');
const aakashSmsService = require('../services/aakashSmsService');
const { calculateCreditCost } = require('../services/creditCalculator');
const { Op } = require('sequelize');

router.all('/user.php', async (req, res, next) => {
  try {
    const input = req.method === 'GET' ? req.query : req.body;
    const action = input.action || '';
    const user_id = parseInt(input.user_id, 10);

    if (!user_id) {
      return res.json({ success: false, message: 'Unauthorized access request.' });
    }

    const user = await User.scope(null).findByPk(user_id);
    if (!user) {
      return res.json({ success: false, message: 'User account verification failed.' });
    }

    if (action === 'get_profile') {
      const setting = await SystemSetting.findByPk('aakash_api_balance');
      return res.json({
        success: true,
        data: {
          sms_balance: user.sms_balance,
          gateway_status: 'Connected',
          gateway_credits: setting ? parseInt(setting.value, 10) : 0,
        },
      });
    }

    if (action === 'get_history') {
      const logs = await SmsLog.findAll({
        where: { user_id },
        order: [['id', 'DESC']],
      });
      return res.json({ success: true, data: logs });
    }

    if (action === 'get_purchases') {
      const purchases = await CreditRequest.findAll({
        where: { user_id },
        order: [['id', 'DESC']],
      });
      return res.json({ success: true, data: purchases });
    }

    if (action === 'buy_credits') {
      const credits = parseInt(input.credits, 10);
      const ref = input.reference || '';
      if (!credits || credits <= 0 || !ref) {
        return res.json({ success: false, message: 'Invalid order data fields.' });
      }
      await CreditRequest.create({ user_id, requested_credits: credits, payment_reference: ref });
      return res.json({ success: true, message: 'Order requested!' });
    }

    if (action === 'send_sms') {
      const { sms_type, to, message, csv_raw_text, global_message, scheduled_at } = input;
      const messagesToSend = [];

      if (sms_type === 'single') {
        if (!to || !message) {
          return res.json({ success: false, message: 'Fields cannot be blank.' });
        }
        messagesToSend.push({ to, text: message });

      } else if (sms_type === 'bulk') {
        if (!csv_raw_text || !global_message) {
          return res.json({ success: false, message: 'Missing bulk text parameters.' });
        }
        if (typeof csv_raw_text === 'string' && csv_raw_text.startsWith('SYSTEM_GROUP_ID:')) {
          const groupId = parseInt(csv_raw_text.replace('SYSTEM_GROUP_ID:', ''), 10);
          const contacts = await Contact.findAll({
            where: { user_id },
            include: [{
              model: Group,
              through: { attributes: [] },
              where: { id: groupId },
              required: true,
            }],
          });
          for (const c of contacts) messagesToSend.push({ to: c.mobile, text: global_message });
        } else {
          const lines = csv_raw_text.replace(/\r/g, '').split('\n');
          for (let i = 1; i < lines.length; i++) {
            const phone = lines[i].trim();
            if (phone) messagesToSend.push({ to: phone, text: global_message });
          }
        }

      } else if (sms_type === 'dynamic') {
        if (!csv_raw_text) return res.json({ success: false, message: 'CSV data required.' });

        const match = csv_raw_text.match(/SYSTEM_DYNAMIC_GROUP:(\d+)\|\|TEMPLATE:(.*)/s);
        if (match) {
          const groupId = parseInt(match[1], 10);
          const template = match[2];
          const contacts = await Contact.findAll({
            where: { user_id },
            include: [{
              model: Group,
              through: { attributes: [] },
              where: { id: groupId },
              required: true,
            }],
          });
          for (const c of contacts) {
            messagesToSend.push({ to: c.mobile, text: template.replace(/{name}/g, c.firstname) });
          }
        } else {
          const rows = csv_raw_text.replace(/\r/g, '').split('\n');
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
        return res.json({ success: false, message: 'No valid messages to send.' });
      }

      const compiledPackets = messagesToSend.map(m => ({
        to: m.to, text: m.text, cost: calculateCreditCost(m.text),
      }));

      const totalRequired = compiledPackets.reduce((s, p) => s + p.cost, 0);

      if (totalRequired === 0) {
        return res.json({ success: false, message: 'No valid text content found.' });
      }
      if (user.sms_balance < totalRequired) {
        return res.json({
          success: false,
          message: `Insufficient credits! Requires ${totalRequired} credits, you have ${user.sms_balance}.`,
        });
      }

      if (scheduled_at) {
        await ScheduledSms.create({
          user_id, sms_type, recipient: 'BATCH_QUEUE', message: 'BATCH_TEMPLATE',
          scheduled_at, status: 'pending', batch_data: compiledPackets,
        });
        return res.json({
          success: true,
          message: `Campaign scheduled! ${compiledPackets.length} messages queued for ${scheduled_at}.`,
        });
      }

      let successCount = 0, failedCount = 0, actualDeducted = 0;

      for (const packet of compiledPackets) {
        try {
          const result = await aakashSmsService.sendSms(packet.to, packet.text);
          if (result.success) {
            successCount++;
            actualDeducted += packet.cost;
            if (result.availableCredit !== null) {
              await SystemSetting.upsert({ key: 'aakash_api_balance', value: String(result.availableCredit) });
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
        }
      }

      if (actualDeducted > 0) {
        user.sms_balance -= actualDeducted;
        await user.save();
      }

      return res.json({
        success: true,
        message: `Campaign completed. Sent: ${successCount}, Failed: ${failedCount}. Total credits charged: ${actualDeducted}.`,
      });
    }

    return res.json({ success: false, message: 'Unknown user action.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;