const express = require('express');
const router = express.Router();
const c = require('../controllers/supportController');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// Public (no auth needed for guest chat/tickets)
router.post('/chat', c.chatWithBot);
router.post('/chat/request-agent', c.requestAgent);

// Authenticated user routes
router.use(authMiddleware);
router.post('/tickets', c.createTicket);
router.get('/tickets', c.getTickets);
router.get('/tickets/:ticketId', c.getTicket);
router.post('/tickets/:ticketId/reply', c.replyToTicket);
router.post('/tickets/:ticketId/rate', c.rateTicket);

// Admin only
router.get('/admin/stats', requireAdmin, c.adminGetSupportStats);
router.get('/admin/tickets', requireAdmin, c.adminGetTickets);
router.get('/admin/tickets/:ticketId', requireAdmin, c.adminGetTicket);
router.post('/admin/tickets/:ticketId/reply', requireAdmin, c.adminReplyTicket);
router.patch('/admin/tickets/:ticketId', requireAdmin, c.adminUpdateTicket);
router.get('/admin/chats', requireAdmin, c.adminGetChatSessions);
router.get('/admin/canned', requireAdmin, c.getCannedResponses);

module.exports = router;
