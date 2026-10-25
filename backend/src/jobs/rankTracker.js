const { queryAll, query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const dataforSeoService = require('../services/dataforSeoService');

const runWeeklyRankCheck = async () => {
  console.log('Running weekly rank check...');
  try {
    const websites = await queryAll("SELECT * FROM websites WHERE status='active'");
    for (const site of websites) {
      const keywords = await queryAll('SELECT keyword FROM keywords WHERE website_id=$1 LIMIT 50', [site.id]);
      for (const kw of keywords) {
        try {
          const pos = await dataforSeoService.checkRanking(site.url, kw.keyword);
          if (pos !== null) {
            const prev = await queryAll('SELECT position FROM rankings WHERE website_id=$1 AND keyword=$2 ORDER BY checked_at DESC LIMIT 1', [site.id, kw.keyword]);
            await query('INSERT INTO rankings (id,website_id,user_id,keyword,position,previous_position,checked_at) VALUES ($1,$2,$3,$4,$5,$6,NOW())',
              [uuidv4(), site.id, site.user_id, kw.keyword, pos, prev[0]?.position||null]);
            await query('UPDATE keywords SET current_position=$1,updated_at=NOW() WHERE website_id=$2 AND keyword=$3', [pos, site.id, kw.keyword]);
          }
        } catch {}
      }
    }
    console.log('Weekly rank check complete.');
  } catch (err) { console.error('Rank check error:', err); }
};

module.exports = { runWeeklyRankCheck };
