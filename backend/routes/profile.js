import express from 'express';
import db from '../db.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

async function ensureProfileColumns() {
  try {
    await db.query(`
      ALTER TABLE IF EXISTS users
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS phone_number TEXT,
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    `);
    await db.query(`
      ALTER TABLE IF EXISTS clients
        ADD COLUMN IF NOT EXISTS first_name TEXT,
        ADD COLUMN IF NOT EXISTS last_name TEXT,
        ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    `);
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
        `SELECT id, username, first_name, last_name, phone_number, profile_image_url
         FROM clients WHERE id = $1`,
        [req.user.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Not found' });
      return res.json({ profile: { ...rows[0], role } });
    } else {
      const { rows } = await db.query(
        `SELECT id, username, first_name, last_name, phone_number, profile_image_url
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
         RETURNING id, username, first_name, last_name, phone_number, profile_image_url`,
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
         RETURNING id, username, first_name, last_name, phone_number, profile_image_url`,
        [req.user.id, username ?? null, firstName ?? null, lastName ?? null, phone ?? null, profileImageUrl ?? null]
      );
      return res.json({ profile: up.rows[0] });
    }
  } catch (err) {
    console.error('profile put error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

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
