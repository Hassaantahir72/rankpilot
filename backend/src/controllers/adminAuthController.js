const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, query } = require('../config/db');
const { sendOTPEmail } = require('../services/emailService');

const OWNER_EMAIL = 'hassaantahir991@gmail.com';
const ownerConfigured = () => String(process.env.OWNER_ADMIN_EMAIL || '').trim().toLowerCase() === OWNER_EMAIL;
const otp = () => crypto.randomInt(100000, 1000000).toString();
const stageToken = (user) => jwt.sign({ userId: user.id, tokenVersion: Number(user.token_version || 0), purpose: 'admin_stage' }, process.env.JWT_SECRET, { expiresIn: '10m' });
const finalToken = (user) => jwt.sign({ userId: user.id, tokenVersion: Number(user.token_version || 0), adminMfaAuthenticated: true, purpose: 'admin_session' }, process.env.JWT_SECRET, { expiresIn: '12h' });

const base32Encode = (buffer) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, value = 0, out = '';
  for (const byte of buffer) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += alphabet[(value << (5 - bits)) & 31];
  return out;
};
const base32Decode = (input) => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, value = 0; const out = [];
  for (const char of String(input).toUpperCase().replace(/=+$/,'').replace(/\s/g,'')) {
    const idx = alphabet.indexOf(char); if (idx < 0) throw new Error('Invalid authenticator secret');
    value = (value << 5) | idx; bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
};
const encryptionKey = () => crypto.hkdfSync('sha256', Buffer.from(process.env.JWT_SECRET || ''), Buffer.from('rankpilot-admin-totp-v1'), Buffer.from('totp-secret-encryption'), 32);
const encryptSecret = (secret) => {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
};
const decryptSecret = (stored) => {
  const [iv, tag, data] = String(stored || '').split('.');
  if (!iv || !tag || !data) throw new Error('Invalid encrypted authenticator secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(iv,'base64url'));
  decipher.setAuthTag(Buffer.from(tag,'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data,'base64url')), decipher.final()]).toString('utf8');
};
const totpCounter = (secret, counter) => {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(msg).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary = ((digest[offset] & 127) << 24) | ((digest[offset+1] & 255) << 16) | ((digest[offset+2] & 255) << 8) | (digest[offset+3] & 255);
  return String(binary % 1000000).padStart(6,'0');
};
const verifyTotp = (secret, code, lastCounter = -1) => {
  if (!/^\d{6}$/.test(String(code || ''))) return null;
  const current = Math.floor(Date.now() / 30000);
  for (const counter of [current, current - 1, current + 1]) {
    if (counter > Number(lastCounter) && crypto.timingSafeEqual(Buffer.from(totpCounter(secret,counter)), Buffer.from(String(code)))) return counter;
  }
  return null;
};
const ownerUser = async (userId) => queryOne('SELECT id,email,name,email_verified,is_banned,token_version,otp_code,otp_purpose,otp_expires_at,otp_attempts,admin_totp_secret_enc,admin_totp_enabled,admin_totp_last_counter,password_hash FROM users WHERE id=$1', [userId]);
const reject = (res, status, error) => res.status(status).json({ error });

const login = async (req,res) => {
  try {
    if (!ownerConfigured()) return reject(res,503,'Owner admin authentication is not configured on the server.');
    const email = String(req.body.email || '').trim().toLowerCase();
    if (email !== OWNER_EMAIL) return reject(res,401,'Invalid email or password.');
    const user = await queryOne('SELECT * FROM users WHERE email=$1',[OWNER_EMAIL]);
    if (!user || user.is_banned || !user.email_verified || !await bcrypt.compare(String(req.body.password || ''), user.password_hash || '')) return reject(res,401,'Invalid email or password.');
    const code = otp();
    await query("UPDATE users SET otp_code=$1,otp_purpose='admin_login',otp_expires_at=$2,otp_attempts=0 WHERE id=$3",[code,new Date(Date.now()+5*60*1000),user.id]);
    await sendOTPEmail(OWNER_EMAIL,user.name || 'RankPilot Owner',code,'login');
    return res.json({ requiresEmailOtp:true, userId:user.id, message:'A one-time code was sent to the owner email address.' });
  } catch (err) { console.error('Owner admin login failed:',err.message); return reject(res,503,'Could not start owner sign-in. Please try again.'); }
};

const verifyEmail = async (req,res) => {
  try {
    if (!ownerConfigured()) return reject(res,503,'Owner admin authentication is not configured.');
    const user = await ownerUser(req.body.userId);
    if (!user || String(user.email).toLowerCase() !== OWNER_EMAIL || user.is_banned || !user.email_verified) return reject(res,403,'Owner account verification failed.');
    if (user.otp_purpose !== 'admin_login' || !user.otp_code || !user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) return reject(res,400,'Code expired. Start owner sign-in again.');
    if ((user.otp_attempts || 0) >= 5) return reject(res,429,'Too many attempts. Start owner sign-in again.');
    if (String(user.otp_code) !== String(req.body.otp || '').trim()) {
      await query('UPDATE users SET otp_attempts=otp_attempts+1 WHERE id=$1',[user.id]);
      return reject(res,400,'Invalid verification code.');
    }
    await query('UPDATE users SET otp_code=NULL,otp_purpose=NULL,otp_expires_at=NULL,otp_attempts=0 WHERE id=$1',[user.id]);
    const token = stageToken(user);
    if (user.admin_totp_enabled && user.admin_totp_secret_enc) return res.json({ requiresTotp:true, stageToken:token });
    const secret = base32Encode(crypto.randomBytes(20));
    const label = encodeURIComponent('RankPilot Owner');
    const issuer = encodeURIComponent('RankPilot');
    const otpauthUrl = 'otpauth://totp/' + issuer + ':' + label + '?secret=' + secret + '&issuer=' + issuer + '&algorithm=SHA1&digits=6&period=30';
    return res.json({ requiresTotpSetup:true, stageToken:token, secret, otpauthUrl });
  } catch (err) { console.error('Owner email OTP verification failed:',err.message); return reject(res,500,'Could not verify owner code.'); }
};

const validateStage = async (token) => {
  const decoded = jwt.verify(String(token || ''),process.env.JWT_SECRET);
  if (decoded.purpose !== 'admin_stage' || !decoded.userId) throw new Error('Invalid stage token');
  const user = await ownerUser(decoded.userId);
  if (!user || String(user.email).toLowerCase() !== OWNER_EMAIL || !user.email_verified || user.is_banned || Number(decoded.tokenVersion) !== Number(user.token_version || 0)) throw new Error('Owner session invalid');
  return user;
};

const enrollTotp = async (req,res) => {
  try {
    const user = await validateStage(req.body.stageToken);
    if (user.admin_totp_enabled) return reject(res,409,'Authenticator is already enrolled. Enter its current code.');
    const secret = String(req.body.secret || '').toUpperCase().replace(/\s/g,'');
    if (secret.length < 20 || secret.length > 64) return reject(res,400,'Invalid authenticator setup secret.');
    const counter = verifyTotp(secret,req.body.code,-1);
    if (counter === null) return reject(res,400,'The authenticator code is invalid. Check the device time and try again.');
    await query('UPDATE users SET admin_totp_secret_enc=$1,admin_totp_enabled=TRUE,admin_totp_last_counter=$2 WHERE id=$3',[encryptSecret(secret),counter,user.id]);
    const fresh = await ownerUser(user.id);
    return res.json({ token:finalToken(fresh), message:'Authenticator verified. Owner admin session created.' });
  } catch (err) { return reject(res,401,'Owner setup session expired or invalid. Start again.'); }
};

const verifyTotpLogin = async (req,res) => {
  try {
    const user = await validateStage(req.body.stageToken);
    if (!user.admin_totp_enabled || !user.admin_totp_secret_enc) return reject(res,409,'Authenticator setup is required.');
    const secret = decryptSecret(user.admin_totp_secret_enc);
    const counter = verifyTotp(secret,req.body.code,user.admin_totp_last_counter);
    if (counter === null) return reject(res,401,'Invalid or already-used authenticator code.');
    await query('UPDATE users SET admin_totp_last_counter=$1 WHERE id=$2 AND (admin_totp_last_counter IS NULL OR admin_totp_last_counter < $1)',[counter,user.id]);
    const fresh = await ownerUser(user.id);
    return res.json({ token:finalToken(fresh), message:'Owner authenticator verified.' });
  } catch (err) { return reject(res,401,'Owner sign-in session expired or invalid. Start again.'); }
};

module.exports = { login, verifyEmail, enrollTotp, verifyTotpLogin };
