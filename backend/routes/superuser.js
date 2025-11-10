import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.get('/summary', auth, requireRole('superuser'), async (req, res) => {
  try {
    const ur = await db.query('SELECT COUNT(*)::int AS c FROM users');
    const cr = await db.query('SELECT COUNT(*)::int AS c FROM clients');
    const users = Number(ur.rows[0]?.c || 0);
    const clients = Number(cr.rows[0]?.c || 0);
    return res.json({ users, clients, total: users + clients });
  } catch (err) {
    console.error('superuser/summary error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-manager', auth, requireRole('superuser'), async (req, res) => {
  try {
    const tempPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['manager']);
    if (!roleRes.rows.length) return res.status(400).json({ error: 'manager role not found' });
    const roleId = roleRes.rows[0].id;
    await db.query('UPDATE users SET password = $1 WHERE role_id = $2', [hash, roleId]);
    return res.json({ ok: true, resetTo: '123' });
  } catch (err) {
    console.error('superuser/reset-manager error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-supervisors', auth, requireRole('superuser'), async (req, res) => {
  try {
    const tempPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['supervisor']);
    if (!roleRes.rows.length) return res.status(400).json({ error: 'supervisor role not found' });
    const roleId = roleRes.rows[0].id;
    await db.query('UPDATE users SET password = $1 WHERE role_id = $2', [hash, roleId]);
    return res.json({ ok: true, resetTo: '123' });
  } catch (err) {
    console.error('superuser/reset-supervisors error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
