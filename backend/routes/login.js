import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.password, u.role_id AS role_id, r.role_name AS role
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1`,
      [username]
    );

    const user = rows[0];
    if (user) {
      let valid = false;
      if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        valid = await bcrypt.compare(password, user.password);
      } else {
        valid = password === user.password;
      }
      if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
      const payload = { id: user.id, username: user.username, role: user.role || null, roleId: user.role_id ?? null };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
      return res.json({ token, user: payload });
    }

    // Fallback: try clients table
    const cr = await db.query(
      `SELECT c.id, c.username, c.password, c.role_id AS role_id
       FROM clients c
       WHERE c.username = $1`,
      [username]
    );
    const client = cr.rows[0];
    if (!client) return res.status(400).json({ error: 'Invalid credentials' });

    let cvalid = false;
    if (typeof client.password === 'string' && client.password.startsWith('$2')) {
      cvalid = await bcrypt.compare(password, client.password);
    } else {
      cvalid = password === client.password;
    }
    if (!cvalid) return res.status(400).json({ error: 'Invalid credentials' });

    const cpayload = { id: client.id, username: client.username, role: 'client', roleId: client.role_id ?? null };
    const ctoken = jwt.sign(cpayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token: ctoken, user: cpayload });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
