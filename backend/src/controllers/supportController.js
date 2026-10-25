const { v4: uuidv4 } = require('uuid');
const { queryOne, queryAll, query } = require('../config/db');
const { sendSupportTicketEmail, sendTicketReplyEmail } = require('../services/emailService');

const genTicketNumber = () => `RP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`;

// AI CHAT
const chatWithBot = async (req, res) => {
  const { message, sessionToken, history = [] } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Message required.' });
  const axios = require('axios');
  const userId = req.user?.id || null;

  let session = null;
  if (sessionToken) session = await queryOne('SELECT * FROM chat_sessions WHERE session_token=$1', [sessionToken]);
  if (!session) {
    const newToken = uuidv4();
    session = await queryOne(
      'INSERT INTO chat_sessions (id,user_id,session_token,status,started_at) VALUES ($1,$2,$3,$$bot$$,NOW()) RETURNING *',
      [uuidv4(), userId, newToken]
    );
  }

  await query('INSERT INTO chat_messages (id,session_id,sender_role,sender_name,message,created_at) VALUES ($1,$2,$$user$$,$3,$4,NOW())',
    [uuidv4(), session.id, req.user?.name||'Guest', message.trim()]);

  const systemPrompt = `You are Alex, RankPilot's AI support assistant. RankPilot is an AI SEO and marketing platform.
Plans: Free ($0), Trial (14 days), Starter ($15/month or $12/month billed annually), Growth ($29/month or $23/month billed annually), Pro ($59/month or $47/month billed annually), Agency ($99/month or $79/month billed annually). Actual access limits come from the database plan_limits table; never promise unlimited usage.
Key features: SEO audit, keyword research, AI content writing, rank tracking, Google Ads, Meta Ads, social posts, weekly reports.
Auth: Email OTP on signup + 2FA OTP every login. Dashboard at /dashboard.
Rules: Be warm and concise (2-3 sentences). If user wants human agent set escalate:true. For complex bugs set createTicket:true.
Respond ONLY as JSON: {"reply":"...","escalate":false,"createTicket":false,"quickReplies":["option1","option2"]}`;

  try {
    const msgs = [...history.slice(-6).map((h) => ({ role:h.role==='user'?'user':'assistant', content:h.content })), { role:'user', content:message }];
    const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions',
      { model:'llama3-70b-8192', max_tokens:512, temperature:0.7, messages:[{role:'system',content:systemPrompt},...msgs] },
      { headers:{ Authorization:`Bearer ${process.env.GROQ_API_KEY}` }, timeout:30000 }
    );
    const raw = groqRes.data.choices[0].message.content;
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json\n?/g,'').replace(/```\n?/g,'').trim()); }
    catch { parsed = { reply:raw, escalate:false, createTicket:false, quickReplies:[] }; }

    await query('INSERT INTO chat_messages (id,session_id,sender_role,sender_name,message,created_at) VALUES ($1,$2,$$bot$$,$$Alex (AI)$$,$3,NOW())',
      [uuidv4(), session.id, parsed.reply]);

    if (parsed.escalate) await query("UPDATE chat_sessions SET status='queued' WHERE id=$1", [session.id]);

    res.json({ reply:parsed.reply, sessionToken:session.session_token, escalate:parsed.escalate||false, createTicket:parsed.createTicket||false, quickReplies:parsed.quickReplies||[], sessionStatus:parsed.escalate?'queued':session.status });
  } catch (err) {
    console.error('Chat AI error:', err.message);
    res.json({ reply:"I'm having trouble connecting. Let me get you a human agent!", sessionToken:session?.session_token, escalate:true, quickReplies:[], sessionStatus:'queued' });
  }
};

// REQUEST AGENT
const requestAgent = async (req, res) => {
  const { sessionToken, name, email, issue } = req.body;
  const userId = req.user?.id || null;
  try {
    if (sessionToken) await query("UPDATE chat_sessions SET status='queued' WHERE session_token=$1", [sessionToken]);
    const ticketNumber = genTicketNumber();
    const ticket = await queryOne(
      `INSERT INTO support_tickets (id,ticket_number,user_id,guest_name,guest_email,subject,category,priority,status,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,'general','high','open',NOW(),NOW()) RETURNING *`,
      [uuidv4(), ticketNumber, userId, name||req.user?.name, email||req.user?.email, issue||'Live chat agent request']
    );
    if (sessionToken && ticket) await query('UPDATE chat_sessions SET ticket_id=$1 WHERE session_token=$2', [ticket.id, sessionToken]);
    const guestEmail = email||req.user?.email;
    if (guestEmail) await sendSupportTicketEmail(guestEmail, name||req.user?.name||'User', ticketNumber, issue||'Live chat agent request');
    res.json({ message:'Agent request received.', ticketNumber, ticketId:ticket?.id });
  } catch (err) {
    console.error('Request agent error:', err);
    res.status(500).json({ error:'Failed to connect to agent.' });
  }
};

// CREATE TICKET
const createTicket = async (req, res) => {
  const { subject, category, priority, message, guestName, guestEmail } = req.body;
  if (!subject||!message) return res.status(400).json({ error:'Subject and message required.' });
  const userId = req.user?.id||null;
  const ticketNumber = genTicketNumber();
  try {
    const ticket = await queryOne(
      `INSERT INTO support_tickets (id,ticket_number,user_id,guest_name,guest_email,subject,category,priority,status,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',NOW(),NOW()) RETURNING *`,
      [uuidv4(), ticketNumber, userId, guestName||req.user?.name, guestEmail||req.user?.email, subject, category||'general', priority||'normal']
    );
    await query('INSERT INTO ticket_messages (id,ticket_id,sender_id,sender_name,sender_role,message,created_at) VALUES ($1,$2,$3,$4,$$user$$,$5,NOW())',
      [uuidv4(), ticket.id, userId, guestName||req.user?.name||'Guest', message]);
    await query("INSERT INTO ticket_messages (id,ticket_id,sender_role,sender_name,message,created_at) VALUES ($1,$2,'bot','RankPilot Support',$3,NOW())",
      [uuidv4(), ticket.id, `Hi ${guestName||req.user?.name||'there'}! Your ticket #${ticketNumber} has been received. We typically respond within 2-4 hours Mon-Fri 9am-6pm GMT.`]);
    const notifyEmail = guestEmail||req.user?.email;
    if (notifyEmail) await sendSupportTicketEmail(notifyEmail, guestName||req.user?.name||'User', ticketNumber, subject);
    res.status(201).json({ message:'Ticket created!', ticket, ticketNumber });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error:'Failed to create ticket.' });
  }
};

const getTickets = async (req, res) => {
  const tickets = await queryAll('SELECT id,ticket_number,subject,category,priority,status,created_at,updated_at,satisfaction_rating FROM support_tickets WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ tickets });
};

const getTicket = async (req, res) => {
  const [ticket, messages] = await Promise.all([
    queryOne('SELECT * FROM support_tickets WHERE id=$1 AND user_id=$2', [req.params.ticketId, req.user.id]),
    queryAll('SELECT * FROM ticket_messages WHERE ticket_id=$1 AND is_internal=false ORDER BY created_at ASC', [req.params.ticketId]),
  ]);
  if (!ticket) return res.status(404).json({ error:'Ticket not found.' });
  res.json({ ticket, messages });
};

const replyToTicket = async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error:'Message required.' });
  const ticket = await queryOne('SELECT * FROM support_tickets WHERE id=$1 AND user_id=$2', [req.params.ticketId, req.user.id]);
  if (!ticket) return res.status(404).json({ error:'Ticket not found.' });
  await query('INSERT INTO ticket_messages (id,ticket_id,sender_id,sender_name,sender_role,message,created_at) VALUES ($1,$2,$3,$4,$$user$$,$5,NOW())',
    [uuidv4(), req.params.ticketId, req.user.id, req.user.name, message.trim()]);
  await query("UPDATE support_tickets SET status='open',updated_at=NOW() WHERE id=$1", [req.params.ticketId]);
  res.json({ message:'Reply sent.' });
};

const rateTicket = async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating||rating<1||rating>5) return res.status(400).json({ error:'Rating must be 1-5.' });
  await query('UPDATE support_tickets SET satisfaction_rating=$1,satisfaction_comment=$2,updated_at=NOW() WHERE id=$3 AND user_id=$4', [rating, comment, req.params.ticketId, req.user.id]);
  res.json({ message:'Thank you for your feedback!' });
};

// ADMIN
const adminGetTickets = async (req, res) => {
  const { status, priority, assigned } = req.query;
  const conds = ['1=1']; const params = [];
  if (status) { params.push(status); conds.push(`t.status=$${params.length}`); }
  if (priority) { params.push(priority); conds.push(`t.priority=$${params.length}`); }
  if (assigned==='me') { params.push(req.user.id); conds.push(`t.assigned_to=$${params.length}`); }
  if (assigned==='unassigned') conds.push('t.assigned_to IS NULL');
  const tickets = await queryAll(
    `SELECT t.*,u.name as user_name,u.email as user_email,u.plan as user_plan,a.name as agent_name
     FROM support_tickets t LEFT JOIN users u ON t.user_id=u.id LEFT JOIN users a ON t.assigned_to=a.id
     WHERE ${conds.join(' AND ')} ORDER BY t.created_at DESC`, params
  );
  res.json({ tickets });
};

const adminGetTicket = async (req, res) => {
  const [ticket, messages] = await Promise.all([
    queryOne('SELECT t.*,u.name as user_name,u.email as user_email,u.plan as user_plan FROM support_tickets t LEFT JOIN users u ON t.user_id=u.id WHERE t.id=$1', [req.params.ticketId]),
    queryAll('SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC', [req.params.ticketId]),
  ]);
  if (!ticket) return res.status(404).json({ error:'Ticket not found.' });
  res.json({ ticket, messages });
};

const adminReplyTicket = async (req, res) => {
  const { message, isInternal, status } = req.body;
  if (!message?.trim()) return res.status(400).json({ error:'Message required.' });
  const ticket = await queryOne('SELECT t.*,u.name,u.email FROM support_tickets t LEFT JOIN users u ON t.user_id=u.id WHERE t.id=$1', [req.params.ticketId]);
  if (!ticket) return res.status(404).json({ error:'Ticket not found.' });
  await query('INSERT INTO ticket_messages (id,ticket_id,sender_id,sender_name,sender_role,message,is_internal,created_at) VALUES ($1,$2,$3,$4,$$agent$$,$5,$6,NOW())',
    [uuidv4(), req.params.ticketId, req.user.id, req.user.name, message.trim(), isInternal||false]);
  const updates = ['updated_at=NOW()'];
  const params = [];
  if (!ticket.first_response_at) { updates.push('first_response_at=NOW()'); }
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (status==='resolved') updates.push('resolved_at=NOW()');
  params.push(req.params.ticketId);
  await query(`UPDATE support_tickets SET ${updates.join(',')} WHERE id=$${params.length}`, params);
  if (!isInternal) {
    const userEmail = ticket.guest_email||ticket.email;
    const userName = ticket.guest_name||ticket.name||'User';
    if (userEmail) await sendTicketReplyEmail(userEmail, userName, ticket.ticket_number, message.trim(), ticket.subject);
  }
  res.json({ message:'Reply sent.' });
};

const adminUpdateTicket = async (req, res) => {
  const { status, priority, assigned_to } = req.body;
  const updates = ['updated_at=NOW()']; const params = [];
  if (status) { params.push(status); updates.push(`status=$${params.length}`); }
  if (priority) { params.push(priority); updates.push(`priority=$${params.length}`); }
  if (assigned_to !== undefined) { params.push(assigned_to); updates.push(`assigned_to=$${params.length}`); }
  if (status==='resolved') updates.push('resolved_at=NOW()');
  params.push(req.params.ticketId);
  await query(`UPDATE support_tickets SET ${updates.join(',')} WHERE id=$${params.length}`, params);
  res.json({ message:'Ticket updated.' });
};

const adminGetChatSessions = async (req, res) => {
  const { status } = req.query;
  const params = status?[status]:[];
  const where = status?'WHERE s.status=$1':'';
  const sessions = await queryAll(`SELECT s.*,u.name as user_name,u.email as user_email FROM chat_sessions s LEFT JOIN users u ON s.user_id=u.id ${where} ORDER BY s.started_at DESC LIMIT 50`, params);
  res.json({ sessions });
};

const adminGetSupportStats = async (req, res) => {
  const [open, inProg, resolved, unassigned, chats] = await Promise.all([
    queryOne("SELECT COUNT(*) FROM support_tickets WHERE status='open'"),
    queryOne("SELECT COUNT(*) FROM support_tickets WHERE status='in_progress'"),
    queryOne("SELECT COUNT(*) FROM support_tickets WHERE status='resolved'"),
    queryOne("SELECT COUNT(*) FROM support_tickets WHERE assigned_to IS NULL AND status IN ('open','in_progress')"),
    queryOne("SELECT COUNT(*) FROM chat_sessions WHERE status='queued'"),
  ]);
  res.json({ open:parseInt(open.count), inProgress:parseInt(inProg.count), resolved:parseInt(resolved.count), unassigned:parseInt(unassigned.count), queuedChats:parseInt(chats.count) });
};

const getCannedResponses = async (req, res) => {
  const responses = await queryAll('SELECT * FROM canned_responses ORDER BY title');
  res.json({ responses });
};

module.exports = { chatWithBot, requestAgent, createTicket, getTickets, getTicket, replyToTicket, rateTicket, adminGetTickets, adminGetTicket, adminReplyTicket, adminUpdateTicket, adminGetChatSessions, adminGetSupportStats, getCannedResponses };
