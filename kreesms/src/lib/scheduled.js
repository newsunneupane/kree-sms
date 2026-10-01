import { Op } from "sequelize";
import { ScheduledSms, User, SmsLog, SystemSetting, sequelize } from "./models/index.js";
import { sendSms, actualSmsCredit, isSmsRejected } from "./aakash.js";
import { calculateCreditCost } from "./credits.js";

// Scheduled SMS processor — invoked by the
// Vercel Cron route (src/app/api/cron/dispatch-sms) and by instrumentation.js locally.
export async function processScheduledSms() {
  const t = await sequelize.transaction();
  try {
    const jobs = await ScheduledSms.findAll({
      where: { status: "pending", scheduled_at: { [Op.lte]: sequelize.fn("NOW") } },
      include: [{ model: User, required: true }],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    for (const job of jobs) {
      try {
        let messages = [];
        if (job.batch_data) {
          messages = typeof job.batch_data === "string" ? JSON.parse(job.batch_data) : job.batch_data;
        } else {
          messages.push({ to: job.recipient, text: job.message });
        }

        if (messages.length === 0) {
          job.status = "failed";
          await job.save({ transaction: t });
          continue;
        }

        const totalCredits = messages.reduce(
          (sum, m) => sum + calculateCreditCost(m.text || ""),
          0
        );

        if (job.User.sms_balance < totalCredits) {
          job.status = "failed";
          await job.save({ transaction: t });
          continue;
        }

        job.User.sms_balance -= totalCredits;
        await job.User.save({ transaction: t });

        let successCount = 0;
        let actualCharged = 0;
        for (const msg of messages) {
          const result = await sendSms(msg.to, msg.text);
          const estimate = calculateCreditCost(msg.text || "");
          const charged = actualSmsCredit(result, msg.to, estimate);
          if (result.success && !isSmsRejected(result, msg.to)) {
            successCount++;
            actualCharged += charged;
            await SmsLog.create(
              {
                user_id: job.user_id,
                sms_type: job.sms_type,
                recipient: msg.to,
                message: msg.text,
                status: "success",
                gateway_response: "Scheduled automatic delivery.",
              },
              { transaction: t }
            );
            if (result.availableCredit !== null && result.availableCredit !== undefined) {
              const setting = await SystemSetting.findByPk("aakash_api_balance", { transaction: t });
              if (setting) {
                setting.value = String(result.availableCredit);
                await setting.save({ transaction: t });
              }
            }
          } else {
            await SmsLog.create(
              {
                user_id: job.user_id,
                sms_type: job.sms_type,
                recipient: msg.to,
                message: msg.text,
                status: "failed",
                gateway_response: "Gateway connection failed on scheduled release.",
              },
              { transaction: t }
            );
          }
        }

        // Reconcile: the estimate was reserved above; refund the difference so
        // the user pays exactly what Aakash charged (failed sends cost 0).
        if (actualCharged !== totalCredits) {
          job.User.sms_balance += totalCredits - actualCharged;
          await job.User.save({ transaction: t });
        }

        job.status = successCount > 0 ? "sent" : "failed";
        await job.save({ transaction: t });
      } catch (err) {
        console.error(`[Cron] Failed processing job ${job.id}:`, err.message);
      }
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error("[Cron] Scheduler error:", err.message);
    throw err;
  }
}
