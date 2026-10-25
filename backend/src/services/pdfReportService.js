/**
 * Feature 11: Automated PDF Reports
 * Generates branded HTML reports — print to PDF in browser or use puppeteer
 */

const generateReportHTML = ({ website, auditData, rankings = [], adPerformance = null, period, branding = {} }) => {
  const score = auditData?.overall_score || 0;
  const improved = rankings.filter(r => r.previous_position && r.position < r.previous_position).length;
  const declined  = rankings.filter(r => r.previous_position && r.position > r.previous_position).length;
  const top10     = rankings.filter(r => r.position <= 10).length;
  const issues    = Array.isArray(auditData?.technical_issues) ? auditData.technical_issues : [];
  const quickWins = auditData?.ai_analysis?.quickWins || [];
  const brandName = branding.name || 'RankPilot';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<title>SEO Report — ${website.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;font-size:14px}
.page{max-width:900px;margin:0 auto;padding:40px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:30px;border-bottom:3px solid #6366f1;margin-bottom:36px}
.logo h1{font-size:26px;font-weight:900;color:#6366f1}.logo p{color:#888;font-size:12px;margin-top:3px}
.meta{text-align:right}.meta h2{font-size:17px;font-weight:700}.meta p{color:#888;font-size:12px;margin-top:3px}
.banner{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:16px;padding:30px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center}
.circle{width:90px;height:90px;border-radius:50%;background:rgba(255,255,255,0.15);display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid rgba(255,255,255,0.4)}
.circle .n{font-size:32px;font-weight:900}.circle .s{font-size:10px;opacity:.7}
.banner-text h2{font-size:20px;font-weight:800;margin-bottom:8px}.banner-text p{opacity:.85;max-width:480px;line-height:1.6}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:30px}
.card{background:#f8f9ff;border:1px solid #e8eaf6;border-radius:12px;padding:18px;text-align:center}
.card .v{font-size:26px;font-weight:900;color:#6366f1}.card .l{font-size:11px;color:#888;margin-top:5px}
.sec{margin-bottom:32px}.sec h3{font-size:16px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid #e8eaf6}
.issue{padding:12px;border-radius:8px;margin-bottom:8px;border-left:4px solid}
.issue.critical{background:#fef2f2;border-color:#ef4444}.issue.warning{background:#fffbeb;border-color:#f59e0b}
.issue-title{font-weight:600;font-size:13px;margin-bottom:3px}.issue-fix{font-size:12px;color:#555}
table{width:100%;border-collapse:collapse}
th{background:#6366f1;color:#fff;padding:9px 13px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
td{padding:9px 13px;border-bottom:1px solid #f0f0f0;font-size:13px}tr:nth-child(even) td{background:#fafafe}
.badge{display:inline-block;padding:2px 9px;border-radius:100px;font-size:11px;font-weight:700}
.b-green{background:#d1fae5;color:#059669}.b-yellow{background:#fef3c7;color:#d97706}.b-gray{background:#f3f4f6;color:#666}
.up{color:#059669;font-weight:600}.down{color:#dc2626;font-weight:600}
.rec{background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;padding:14px;margin-bottom:10px}
.rec h4{font-size:13px;font-weight:700;color:#1d4ed8;margin-bottom:5px}.rec p{font-size:12px;color:#374151;line-height:1.6}
.footer{margin-top:48px;padding-top:18px;border-top:2px solid #e8eaf6;display:flex;justify-content:space-between;color:#aaa;font-size:11px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.page{padding:20px}}
</style></head><body><div class="page">

<div class="header">
  <div class="logo"><h1>${brandName}</h1><p>AI SEO &amp; Marketing Report</p></div>
  <div class="meta">
    <h2>${website.name}</h2>
    <p>${website.url}</p>
    <p>Period: ${period}</p>
    <p>Generated: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</p>
  </div>
</div>

<div class="banner">
  <div class="banner-text">
    <h2>Overall SEO Health Score</h2>
    <p>${score >= 80 ? 'Excellent! Your website is performing well in search engines.' : score >= 60 ? 'Good progress — a few key improvements will significantly boost rankings.' : 'Your website needs attention in several areas to improve Google rankings.'}</p>
  </div>
  <div class="circle"><span class="n">${score}</span><span class="s">/100</span></div>
</div>

<div class="grid4">
  <div class="card"><div class="v">${rankings.length}</div><div class="l">Keywords Tracked</div></div>
  <div class="card"><div class="v" style="color:#4ade80">${top10}</div><div class="l">In Top 10</div></div>
  <div class="card"><div class="v" style="color:#4ade80">+${improved}</div><div class="l">Improved</div></div>
  <div class="card"><div class="v" style="color:#f87171">-${declined}</div><div class="l">Declined</div></div>
</div>

${issues.length > 0 ? `<div class="sec"><h3>🔧 Technical Issues (${issues.length} found)</h3>
${issues.slice(0,8).map(i=>`<div class="issue ${i.severity}"><div class="issue-title">${i.title}</div><div class="issue-fix">Fix: ${i.fix}</div></div>`).join('')}
</div>` : ''}

${rankings.length > 0 ? `<div class="sec"><h3>📊 Keyword Rankings</h3>
<table><thead><tr><th>Keyword</th><th>Position</th><th>Change</th></tr></thead><tbody>
${rankings.slice(0,20).map(r=>{
  const ch = r.previous_position ? r.previous_position - r.position : 0;
  const bc = r.position<=3?'b-green':r.position<=10?'b-yellow':'b-gray';
  return `<tr><td>${r.keyword}</td><td><span class="badge ${bc}">#${r.position}</span></td><td class="${ch>0?'up':ch<0?'down':''}">${ch>0?'▲ +'+ch:ch<0?'▼ '+ch:'—'}</td></tr>`;
}).join('')}
</tbody></table></div>` : ''}

${adPerformance && parseFloat(adPerformance.spend) > 0 ? `<div class="sec"><h3>📣 Ad Performance</h3>
<div class="grid4">
  <div class="card"><div class="v">$${parseFloat(adPerformance.spend).toFixed(2)}</div><div class="l">Spend</div></div>
  <div class="card"><div class="v">${(adPerformance.clicks||0).toLocaleString()}</div><div class="l">Clicks</div></div>
  <div class="card"><div class="v">${(adPerformance.impressions||0).toLocaleString()}</div><div class="l">Impressions</div></div>
  <div class="card"><div class="v">${adPerformance.conversions||0}</div><div class="l">Leads</div></div>
</div></div>` : ''}

${quickWins.length > 0 ? `<div class="sec"><h3>🚀 Priority Recommendations</h3>
${quickWins.slice(0,4).map(w=>`<div class="rec"><h4>${w.action}</h4><p>${w.reason} — Impact: <strong>${w.impact}</strong> | Effort: <strong>${w.effort}</strong></p></div>`).join('')}
</div>` : ''}

<div class="sec"><h3>📅 Action Plan</h3>
<div class="rec"><h4>This Week</h4><p>Fix all critical technical issues first — they have the biggest immediate impact on rankings.</p></div>
<div class="rec"><h4>This Month</h4><p>Publish 2-4 SEO-optimised blog posts targeting your top keyword opportunities.</p></div>
<div class="rec"><h4>Next Quarter</h4><p>Build quality backlinks from local directories and industry publications to increase domain authority.</p></div>
</div>

<div class="footer">
  <span>Generated by ${brandName} — AI SEO Platform</span>
  <span>Confidential — Prepared for ${website.name}</span>
  <span>${new Date().toLocaleDateString()}</span>
</div>
</div></body></html>`;
};

module.exports = { generateReportHTML };
