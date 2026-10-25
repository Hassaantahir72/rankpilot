const { queryAll } = require('../config/db');
const { sendWeeklyReport } = require('../services/emailService');
const aiService = require('../services/aiService');

const runWeeklyReports = async () => {
  console.log('Running weekly reports...');
  try {
    const users = await queryAll("SELECT u.*,pl.weekly_reports FROM users u JOIN plan_limits pl ON u.plan=pl.plan WHERE u.subscription_status IN ('active','trial') AND pl.weekly_reports=true");
    for (const user of users) {
      try {
        const websites = await queryAll('SELECT * FROM websites WHERE user_id=$1 LIMIT 1', [user.id]);
        if (!websites[0]) continue;
        const rankings = await queryAll('SELECT * FROM rankings WHERE user_id=$1 ORDER BY checked_at DESC LIMIT 20', [user.id]);
        const report = await aiService.generateWeeklyReport({ website: websites[0], rankings, adPerformance: null, period: 'This week' });
        await sendWeeklyReport(user.email, user.name, report);
      } catch {}
    }
    console.log('Weekly reports sent.');
  } catch (err) { console.error('Reports error:', err); }
};

const runMonthlyContentRefresh = async () => {
  console.log('Running monthly content refresh...');
};

module.exports = { runWeeklyReports, runMonthlyContentRefresh };
