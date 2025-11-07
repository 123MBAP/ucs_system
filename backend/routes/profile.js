import express from 'express';
import db from '../db.js';
import auth from '../middlewares/auth.js';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

const router = express.Router();

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function ensureProfileColumns() {
  try {
    await db.query(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS phone_number TEXT,
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT UNIQUE,
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await db.query(`
      ALTER TABLE IF EXISTS clients
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        code TEXT,
        token TEXT,
        expires_at TIMESTAMP NOT NULL,
        consumed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_email_verif_user ON email_verifications(user_id, consumed);`);
  } catch (e) {
    console.error('ensureProfileColumns error', e);
  }
}

router.use(async (_req, _res, next) => {
  await ensureProfileColumns();
  next();
});

// GET current profile (unified for users and clients)
router.get('/', auth, async (req, res) => {
  try {
    const role = req?.user?.role;
    if (role === 'client') {
      const { rows } = await db.query(
        `SELECT id, username, first_name, last_name, phone_number, profile_image_url, email, email_verified
         FROM clients WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json({ profile: { ...rows[0], role } });
    } else {
      const { rows } = await db.query(
        `SELECT id, username, first_name, last_name, phone_number, profile_image_url, email, email_verified
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json({ profile: { ...rows[0], role } });
    }
  } catch (err) {
    console.error('profile get error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update current profile
// Body may include { firstName, lastName, username, phone, profileImageUrl }
router.put('/', auth, async (req, res) => {
  try {
    const role = req?.user?.role;
    const { firstName, lastName, username, phone, profileImageUrl } = req.body || {};
    if (role === 'client') {
      const up = await db.query(
        `UPDATE clients
         SET username = COALESCE($2, username),
             first_name = COALESCE($3, first_name),
             last_name = COALESCE($4, last_name),
             phone_number = COALESCE($5, phone_number),
             profile_image_url = COALESCE($6, profile_image_url)
         WHERE id = $1
         RETURNING id, username, first_name, last_name, phone_number, profile_image_url, email, email_verified`,
        [req.user.id, username ?? null, firstName ?? null, lastName ?? null, phone ?? null, profileImageUrl ?? null]
      );
      return res.json({ profile: up.rows[0] });
    } else {
      const up = await db.query(
        `UPDATE users
         SET username = COALESCE($2, username),
             first_name = COALESCE($3, first_name),
             last_name = COALESCE($4, last_name),
             phone_number = COALESCE($5, phone_number),
             profile_image_url = COALESCE($6, profile_image_url)
         WHERE id = $1
         RETURNING id, username, first_name, last_name, phone_number, profile_image_url, email, email_verified`,
        [req.user.id, username ?? null, firstName ?? null, lastName ?? null, phone ?? null, profileImageUrl ?? null]
      );
      return res.json({ profile: up.rows[0] });
    }
  } catch (err) {
    console.error('profile put error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------- Email management ----------------
// PUT /api/profile/email { email }
router.put('/email', auth, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    // Ensure uniqueness across users table (and optionally clients)
    const inUsers = await db.query(`SELECT 1 FROM users WHERE email = $1 AND id <> $2 LIMIT 1`, [email, req.user.id]);
    const inClients = await db.query(`SELECT 1 FROM clients WHERE email = $1 AND id <> $2 LIMIT 1`, [email, req.user.id]);
    if (inUsers.rowCount || inClients.rowCount) return res.status(409).json({ error: 'Email already in use' });

    const role = req?.user?.role;
    if (role === 'client') {
      await db.query(`UPDATE clients SET email = $2, email_verified = FALSE WHERE id = $1`, [req.user.id, email]);
      const { rows } = await db.query(`SELECT email, email_verified FROM clients WHERE id = $1`, [req.user.id]);
      return res.json(rows[0]);
    } else {
      await db.query(`UPDATE users SET email = $2, email_verified = FALSE WHERE id = $1`, [req.user.id, email]);
      const { rows } = await db.query(`SELECT email, email_verified FROM users WHERE id = $1`, [req.user.id]);
      return res.json(rows[0]);
    }
  } catch (err) {
    console.error('profile email put error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/email/send-code { email? }
router.post('/email/send-code', auth, async (req, res) => {
  try {
    const role = req?.user?.role;
    const bodyEmail = req.body?.email;
    const table = role === 'client' ? 'clients' : 'users';
    const { rows } = await db.query(`SELECT email FROM ${table} WHERE id = $1`, [req.user.id]);
    const savedEmail = rows[0]?.email || bodyEmail || '';
    if (!savedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(savedEmail))) {
      return res.status(400).json({ error: 'No valid email on file' });
    }

    // Rate limit: last request < 60s
    const recent = await db.query(
      `SELECT 1 FROM email_verifications WHERE user_id=$1 AND consumed=FALSE AND created_at > NOW() - INTERVAL '60 seconds' LIMIT 1`,
      [req.user.id]
    );
    if (recent.rowCount) return res.status(429).json({ error: 'Please wait before requesting another code' });

    const code = generateVerificationCode();
    const token = crypto.randomBytes(24).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await db.query(
      `INSERT INTO email_verifications (user_id, email, code, token, expires_at, consumed) VALUES ($1,$2,$3,$4,$5,FALSE)`,
      [req.user.id, savedEmail, code, token, expires]
    );

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const LOGO_URL = 'https://res.cloudinary.com/dlpwhqgux/image/upload/v1750453280/connect_bg5yej.png';
    try {
      await transporter.sendMail({
        from: `"UCS Compony" <${process.env.EMAIL_USER}>`,
        to: savedEmail,
        subject: 'Verify your email - ucs management system',
        html: `
          <div style="background:#f9f9f9;padding:0;margin:0;">
            <div style="max-width:480px;margin:40px auto 0 auto;background:#fff;border-radius:12px;box-shadow:0 2px 16px #0001;">
              <div style="text-align:center;padding:32px 32px 10px 32px;">
                <img src="${LOGO_URL}" alt="HafiConnect Logo" style="width:160px;max-width:80%;height:auto;display:block;margin:0 auto 12px auto;">
              </div>
              <div style="padding:0 32px 32px 32px;font-family:sans-serif;color:#333;">
                <h2 style="color:#2b7a78;">Verify your email</h2>
                <p>Use the code below to verify your email:</p>
                <div style="background:#f2f2f2;padding:18px 0;font-size:22px;font-weight:bold;letter-spacing:2px;text-align:center;border-radius:8px;margin:16px 0 24px 0;">
                  ${code}
                </div>
                <p style="text-align:center;">
                  <a href="${FRONTEND_URL}/verify-email?email=${encodeURIComponent(savedEmail)}&code=${code}"
                     style="display:inline-block;background:#2b7a78;color:#fff;text-decoration:none;padding:10px 30px;border-radius:5px;font-size:16px;margin:8px 0;">
                    Verify My Email
                  </a>
                </p>
                <p style="color:#999;font-size:13px;margin-top:20px;">
                  This code and link will expire in 1 hour.
                </p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.warn('Email send failed, but code created:', e?.message);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('profile email send-code error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/email/verify-code { code }
router.post('/email/verify-code', auth, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'Code required' });
    const { rows } = await db.query(
      `SELECT * FROM email_verifications WHERE user_id=$1 AND consumed=FALSE AND expires_at > NOW() AND code=$2 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, String(code)]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired code' });
    const ev = rows[0];
    const role = req?.user?.role;
    if (role === 'client') {
      await db.query(`UPDATE clients SET email=$2, email_verified=TRUE WHERE id=$1`, [req.user.id, ev.email]);
    } else {
      await db.query(`UPDATE users SET email=$2, email_verified=TRUE WHERE id=$1`, [req.user.id, ev.email]);
    }
    await db.query(`UPDATE email_verifications SET consumed=TRUE WHERE user_id=$1`, [req.user.id]);
    return res.json({ email_verified: true });
  } catch (err) {
    console.error('profile email verify-code error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/email/verify-link { token }
router.post('/email/verify-link', auth, async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Token required' });
    const { rows } = await db.query(
      `SELECT * FROM email_verifications WHERE user_id=$1 AND consumed=FALSE AND expires_at > NOW() AND token=$2 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, String(token)]
    );
    if (!rows.length) return res.status(400).json({ error: 'Invalid or expired token' });
    const ev = rows[0];
    const role = req?.user?.role;
    if (role === 'client') {
      await db.query(`UPDATE clients SET email=$2, email_verified=TRUE WHERE id=$1`, [req.user.id, ev.email]);
    } else {
      await db.query(`UPDATE users SET email=$2, email_verified=TRUE WHERE id=$1`, [req.user.id, ev.email]);
    }
    await db.query(`UPDATE email_verifications SET consumed=TRUE WHERE user_id=$1`, [req.user.id]);
    return res.json({ email_verified: true });
  } catch (err) {
    console.error('profile email verify-link error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// --------------- Password management ---------------
// POST /api/profile/password/verify { oldPassword }
router.post('/password/verify', auth, async (req, res) => {
  try {
    const { oldPassword } = req.body || {};
    if (!oldPassword) return res.status(400).json({ error: 'Old password is required' });
    const role = req?.user?.role;
    const table = role === 'client' ? 'clients' : 'users';
    const { rows } = await db.query(`SELECT password FROM ${table} WHERE id = $1`, [req.user.id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Account not found' });
    const stored = row.password || '';
    let valid = false;
    if (typeof stored === 'string' && stored.startsWith('$2')) {
      valid = await bcrypt.compare(oldPassword, stored);
    } else {
      valid = oldPassword === stored;
    }
    if (!valid) return res.status(400).json({ error: 'Old password is incorrect' });
    return res.json({ ok: true });
  } catch (err) {
    console.error('profile password verify error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/profile/password/change { oldPassword, newPassword }
router.post('/password/change', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password are required' });
    }
    if (String(newPassword).length < 3) {
      return res.status(400).json({ error: 'New password is too short' });
    }
    const role = req?.user?.role;
    const table = role === 'client' ? 'clients' : 'users';
    const { rows } = await db.query(`SELECT password FROM ${table} WHERE id = $1`, [req.user.id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ error: 'Account not found' });
    const stored = row.password || '';
    let valid = false;
    if (typeof stored === 'string' && stored.startsWith('$2')) {
      valid = await bcrypt.compare(oldPassword, stored);
    } else {
      valid = oldPassword === stored;
    }
    if (!valid) return res.status(400).json({ error: 'Old password is incorrect' });
    const hashed = await bcrypt.hash(String(newPassword), 10);
    await db.query(`UPDATE ${table} SET password = $2 WHERE id = $1`, [req.user.id, hashed]);
    return res.json({ ok: true });
  } catch (err) {
    console.error('profile password change error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload a profile image via base64 data URL, save locally, and update DB
router.post('/upload-base64', auth, async (req, res) => {
  try {
    const { dataUrl } = req.body || {};
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }

    const CLOUD_NAME = process.env.CLOUD_NAME;
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
    if (!CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return res.status(500).json({ error: 'Cloudinary is not configured' });
    }

    // Build signed payload
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'profiles';
    const crypto = await import('node:crypto');
    const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    // Use global fetch + FormData (Node 18+)
    const form = new FormData();
    form.append('file', dataUrl);
    form.append('api_key', CLOUDINARY_API_KEY);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('signature', signature);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const upRes = await fetch(endpoint, { method: 'POST', body: form });
    const upJson = await upRes.json();
    if (!upRes.ok) {
      return res.status(400).json({ error: upJson?.error?.message || 'Cloudinary upload failed' });
    }

    const secureUrl = upJson.secure_url || upJson.url;
    if (!secureUrl) return res.status(400).json({ error: 'Upload succeeded but no URL returned' });

    // Update DB
    const role = req?.user?.role;
    if (role === 'client') {
      await db.query(`UPDATE clients SET profile_image_url = $2 WHERE id = $1`, [req.user.id, secureUrl]);
    } else {
      await db.query(`UPDATE users SET profile_image_url = $2 WHERE id = $1`, [req.user.id, secureUrl]);
    }

    return res.json({ profile_image_url: secureUrl });
  } catch (err) {
    console.error('profile upload error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
