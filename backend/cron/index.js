const cron = require('node-cron');
const { processScheduledSms } = require('./scheduler');

function startCronJobs() {
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Checking scheduled SMS...');
    await processScheduledSms();
  });
}

module.exports = { startCronJobs };