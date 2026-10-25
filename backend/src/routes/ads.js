const express = require('express');
const router = express.Router();
const { authMiddleware, requireSubscription } = require('../middleware/auth');
const c = require('../controllers/adsController');

router.use(authMiddleware, requireSubscription);
router.get('/overview/:siteId',       c.getOverview);
router.get('/google/campaigns',        c.getGoogleCampaigns);
router.post('/google/campaigns',       c.createGoogleCampaign);
router.get('/google/performance',      c.getGooglePerformance);
router.get('/meta/campaigns',          c.getMetaCampaigns);
router.post('/meta/campaigns',         c.createMetaCampaign);
router.post('/generate-copy',          c.generateAdCopy);
router.post('/social/generate',        c.generateSocialContent);
router.get('/social/calendar/:websiteId', c.getSocialCalendar);
module.exports = router;
