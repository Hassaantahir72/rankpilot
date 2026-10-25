const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

router.post('/', [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('message').trim().isLength({ min: 10 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, company, subject, message } = req.body;
  try {
    await query('INSERT INTO contact_messages (id,name,email,company,subject,message,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$$unread$$,NOW())',
      [uuidv4(), name, email, company, subject, message]);
    res.json({ message: 'Message received! We will respond within 24 hours.' });
  } catch (err) { res.status(500).json({ error: 'Failed to send message.' }); }
});
module.exports = router;
