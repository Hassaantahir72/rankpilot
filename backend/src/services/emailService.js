const nodemailer = require('nodemailer');

// Escape all user-controlled text before placing it into HTML email templates.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>\"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;',
}[char]));

const transporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const send = async (to, subject, html) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
    throw new Error('Email is not configured. Set SMTP_USER, SMTP_PASS, and EMAIL_FROM in the backend environment.');
  }
  try {
    await transporter().sendMail({ from: process.env.EMAIL_FROM || 'RankPilot <noreply@rankpilot.ai>', to, subject, html });
  } catch (err) {
    console.error('Email delivery failed:', err.message);
    throw err;
  }
};

const base = (content) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a14;color:#fff}
.wrap{max-width:560px;margin:40px auto;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08)}
.hdr{background:linear-gradient(135deg,#6366f1,#7c3aed);padding:32px;text-align:center}
.hdr h1{font-size:22px;font-weight:800;color:#fff;margin:0}
.hdr p{color:rgba(255,255,255,0.7);font-size:13px;margin-top:6px}
.body{background:#111118;padding:36px}
.body h2{font-size:20px;font-weight:700;margin-bottom:14px;color:#fff}
.body p{color:rgba(255,255,255,0.6);line-height:1.7;margin-bottom:16px;font-size:14px}
.otp{font-size:48px;font-weight:900;letter-spacing:12px;color:#818cf8;text-align:center;padding:28px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:12px;margin:24px 0;font-family:monospace}
.btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;margin:8px 0}
.note{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px 18px;font-size:13px;color:rgba(255,255,255,0.45);margin-top:20px}
.foot{background:#08080f;padding:20px;text-align:center;font-size:12px;color:rgba(255,255,255,0.25);border-top:1px solid rgba(255,255,255,0.06)}
</style></head><body><div class="wrap">
<div class="hdr"><h1>🚀 RankPilot</h1><p>AI SEO & Marketing Autopilot</p></div>
<div class="body">${content}</div>
<div class="foot">© ${new Date().getFullYear()} RankPilot · <a href="${process.env.FRONTEND_URL}" style="color:#818cf8;text-decoration:none">rankpilot.ai</a></div>
</div></body></html>`;

const sendOTPEmail = async (email, name, otp, type, plan = 'trial') => {
  const subjects = { verify: 'Verify your email — RankPilot', login: 'Your login code — RankPilot', reset: 'Password reset code — RankPilot' };
  const titles = { verify: 'Verify your email address', login: 'Your sign-in code', reset: 'Reset your password' };
  const descs = {
    verify: plan === 'trial' ? `Welcome to RankPilot, ${escapeHtml(name)}! Enter the code below to verify your email and activate your 14-day Free Trial.` : `Welcome to RankPilot, ${escapeHtml(name)}! Verify your email to continue setting up your selected plan.`,
    login: `Hi ${escapeHtml(name)}, here is your sign-in verification code.`,
    reset: `Hi ${escapeHtml(name)}, use the code below to reset your password. It expires in 15 minutes.`,
  };
  const html = base(`
    <h2>${titles[type]}</h2>
    <p>${descs[type]}</p>
    <div class="otp">${otp}</div>
    <div class="note">⏱ This code expires in ${type === 'reset' ? '15' : '10'} minutes. Do not share it with anyone.</div>
    ${type === 'verify' ? '<p style="margin-top:20px;font-size:13px;color:rgba(255,255,255,0.35)">If you did not create a RankPilot account, ignore this email.</p>' : ''}
  `);
  await send(email, subjects[type], html);
};

const sendWelcomeEmail = async (email, name, plan = 'trial') => {
  const isTrial = plan === 'trial';
  const nextStep = isTrial
    ? '<p>Your 14-day Free Trial starts now. Here is how to get your first results fast:</p>'
    : '<p>Your email is verified and your RankPilot account is ready. Continue with your selected plan to finish setup.</p>';
  const html = base(`
    <h2>Welcome to RankPilot, ${escapeHtml(name)}! 🎉</h2>
    ${nextStep}
    <p>✅ <strong>Step 1:</strong> Add your website URL</p>
    <p>✅ <strong>Step 2:</strong> Run your first AI SEO audit (takes 3–5 minutes)</p>
    <p>✅ <strong>Step 3:</strong> Review your keyword recommendations and content fixes</p>
    <p>Open your dashboard to continue.</p>
  `);
  await send(email, 'Welcome to RankPilot', html);
};

const sendAuditCompleteEmail = async (email, name, websiteName, score, auditId) => {
  const col = score >= 70 ? '#4ade80' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Good' : score >= 40 ? 'Needs Work' : 'Critical Issues';
  const html = base(`
    <h2>Your SEO Audit is Ready, ${escapeHtml(name)}!</h2>
    <p>We finished analysing <strong>${escapeHtml(websiteName)}</strong>.</p>
    <div style="text-align:center;margin:28px 0">
      <div style="display:inline-block;width:110px;height:110px;border-radius:50%;background:${col};line-height:110px;font-size:32px;font-weight:900;color:#fff">${escapeHtml(score)}</div>
      <div style="margin-top:10px;font-size:16px;font-weight:700;color:${col}">${label}</div>
    </div>
    <p>Your full report includes technical issues, keyword opportunities, page-by-page fixes, and AI-written optimized content.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard/seo/audits/${encodeURIComponent(String(auditId ?? ''))}" class="btn">View full report →</a>
  `);
  await send(email, `✅ SEO Audit complete — Score: ${escapeHtml(score)}/100`, html);
};

const sendWeeklyReport = async (email, name, report) => {
  const html = base(`
    <h2>${escapeHtml(report.subject || 'Your weekly marketing report')}</h2>
    <p>${escapeHtml(report.summary || '')}</p>
    ${report.biggestWin ? `<div class="note">🏆 <strong>Biggest win:</strong> ${escapeHtml(report.biggestWin)}</div>` : ''}
    <p style="margin-top:20px"><strong>Rankings:</strong> ${escapeHtml(report.rankingChanges?.improved || 0)} improved · ${escapeHtml(report.rankingChanges?.declined || 0)} declined · ${escapeHtml(report.rankingChanges?.new || 0)} new</p>
    <a href="${process.env.FRONTEND_URL}/dashboard/reports" class="btn">View full report →</a>
    ${report.encouragingNote ? `<p style="margin-top:20px;font-style:italic;color:rgba(255,255,255,0.45)">${escapeHtml(report.encouragingNote)}</p>` : ''}
  `);
  await send(email, report.subject || 'Your RankPilot weekly report', html);
};

const sendPasswordResetEmail = async (email, name, token) => {
  const url = `${process.env.FRONTEND_URL}/auth/reset-password?token=${encodeURIComponent(String(token ?? ''))}`;
  const html = base(`
    <h2>Reset your password</h2>
    <p>Hi ${escapeHtml(name)}, you requested a password reset. Click below to set a new password.</p>
    <a href="${url}" class="btn">Reset password →</a>
    <div class="note">This link expires in 1 hour. If you did not request this, ignore this email.</div>
  `);
  await send(email, 'Reset your RankPilot password', html);
};

const sendTrialEndingEmail = async (email, name, daysLeft) => {
  const html = base(`
    <h2>Your trial ends in ${escapeHtml(daysLeft)} day${daysLeft !== 1 ? 's' : ''}</h2>
    <p>Hi ${escapeHtml(name)}, don't lose your SEO progress! Upgrade to keep full access.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard/billing" class="btn">Upgrade now →</a>
  `);
  await send(email, `⏰ Your RankPilot trial ends in ${escapeHtml(daysLeft)} day${daysLeft !== 1 ? 's' : ''}`, html);
};

module.exports = { sendOTPEmail, sendWelcomeEmail, sendAuditCompleteEmail, sendWeeklyReport, sendPasswordResetEmail, sendTrialEndingEmail };

const sendSupportTicketEmail = async (email, name, ticketNumber, subject) => {
  const html = base(`
    <h2>Support ticket received ✅</h2>
    <p>Hi ${escapeHtml(name)}, we've received your support request and created ticket <strong style="color:#818cf8">#${escapeHtml(ticketNumber)}</strong>.</p>
    <div class="note">
      <strong>Subject:</strong> ${escapeHtml(subject)}<br/>
      <strong>Expected response:</strong> Within 2-4 hours (Mon-Fri, 9am-6pm GMT)
    </div>
    <p>You'll receive an email notification when we reply. You can also view and reply to your ticket from your dashboard.</p>
    <a href="${process.env.FRONTEND_URL}/dashboard/support" class="btn">View ticket →</a>
  `);
  await send(email, `Support ticket #${escapeHtml(ticketNumber)} — RankPilot`, html);
};

const sendTicketReplyEmail = async (email, name, ticketNumber, message, subject) => {
  const html = base(`
    <h2>New reply on your ticket</h2>
    <p>Hi ${escapeHtml(name)}, our support team has replied to your ticket <strong style="color:#818cf8">#${escapeHtml(ticketNumber)}</strong>.</p>
    <p style="font-style:italic;color:rgba(255,255,255,0.5)">"${escapeHtml(subject)}"</p>
    <div class="note" style="margin:20px 0">${escapeHtml(message)}</div>
    <a href="${process.env.FRONTEND_URL}/dashboard/support" class="btn">View & Reply →</a>
  `);
  await send(email, `Reply on ticket #${escapeHtml(ticketNumber)} — RankPilot Support`, html);
};

module.exports = Object.assign(module.exports, { sendSupportTicketEmail, sendTicketReplyEmail });
