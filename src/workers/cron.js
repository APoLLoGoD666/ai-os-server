const cron = require('node-cron');

// Cron worker — scheduled background jobs for Apex AI OS

/**
 * Example scheduled job: runs every minute.
 * Extend this file with additional cron.schedule() calls as needed.
 */
cron.schedule('* * * * *', () => {
  console.log(`[CRON] ${new Date().toISOString()} - heartbeat started`);
  // TODO: add background task logic here
});

module.exports = {};