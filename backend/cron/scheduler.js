const { ScheduledSms, User, SmsLog, SystemSetting } = require('../models');
const { sequelize } = require('../models');
const aakashSmsService = require('../services/aakashSmsService');

async function processScheduledSms() {
  const t = await sequelize.transaction();
  try {
    const jobs = await ScheduledSms.findAll({
      where: {
        status: 'pending',
        scheduled_at: { [require('sequelize').Op.lte]: sequelize.fn('NOW') },
      },
      include: [{ model: User, required: true }],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    for (const job of jobs) {
      try {
        let messages = [];
        if (job.batch_data) {
          messages = typeof job.batch_data === 'string' ? JSON.parse(job.batch_data) : job.batch_data;
        } else {
          messages.push({ to: job.recipient, text: job.message });
        }

        if (messages.length === 0) {
          job.status = 'failed';
          await job.save({ transaction: t });
          continue;
        }

        const totalCredits = messages.reduce((sum, m) => sum + Math.ceil((m.text || '').length / 160), 0);

        if (job.User.sms_balance < totalCredits) {
          job.status = 'failed';
          await job.save({ transaction: t });
          continue;
        }

        job.User.sms_balance -= totalCredits;
        await job.User.save({ transaction: t });

        let successCount = 0;
        for (const msg of messages) {
          const result = await aakashSmsService.sendSms(msg.to, msg.text);
          if (result.success) {
            successCount++;
            await SmsLog.create({
              user_id: job.user_id,
              sms_type: job.sms_type,
              recipient: msg.to,
              message: msg.text,
              status: 'success',
              gateway_response: 'Scheduled automatic delivery.',
            }, { transaction: t });

            if (result.availableCredit !== null) {
              const setting = await SystemSetting.findByPk('aakash_api_balance', { transaction: t });
              if (setting) {
                setting.value = String(result.availableCredit);
                await setting.save({ transaction: t });
              }
            }
          } else {
            await SmsLog.create({
              user_id: job.user_id,
              sms_type: job.sms_type,
              recipient: msg.to,
              message: msg.text,
              status: 'failed',
              gateway_response: 'Gateway connection failed on scheduled release.',
            }, { transaction: t });
          }
        }

        job.status = successCount > 0 ? 'sent' : 'failed';
        await job.save({ transaction: t });
      } catch (err) {
        console.error(`[Cron] Failed processing job ${job.id}:`, err.message);
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error('[Cron] Scheduler error:', err.message);
  }
}

module.exports = { processScheduledSms };