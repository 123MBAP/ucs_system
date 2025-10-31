import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Create/register a client
// Body: { firstName, lastName, username, phone, zoneId, monthlyAmount }
router.post('/', auth, requireRole('manager', 'supervisor'), async (req, res) => {
  try {
    const { firstName, lastName, username, phone, zoneId, monthlyAmount } = req.body || {};

    if (!firstName || !lastName || !username || !phone || !zoneId) {
      return res.status(400).json({ error: 'firstName, lastName, username, phone, zoneId are required' });
    }

    // Ensure zone exists
    const zoneRes = await db.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
    if (!zoneRes.rows.length) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    // Ensure role_id for client
    let clientRoleId = null;
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['client']);
    if (!roleRes.rows.length) {
      // Create role client if missing
      const ins = await db.query('INSERT INTO roles (role_name) VALUES ($1) RETURNING id', ['client']);
      clientRoleId = ins.rows[0].id;
    } else {
      clientRoleId = roleRes.rows[0].id;
    }

    // Optional: check duplicate username within clients
    const dup = await db.query('SELECT 1 FROM clients WHERE username = $1', [username]);
    if (dup.rows.length) {
      return res.status(409).json({ error: 'Client username already exists' });
    }

    const nameJson = { first: String(firstName).trim(), last: String(lastName).trim() };

    // Hash default password '123'
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash('123', salt);

    const insClient = await db.query(
      `INSERT INTO clients (username, name, role_id, zone_id, phone_number, monthly_amount, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, name, role_id, zone_id, phone_number, monthly_amount, created_at`,
      [username, nameJson, clientRoleId, zoneId, phone, monthlyAmount != null ? Number(monthlyAmount) : null, hashed]
    );

    const client = insClient.rows[0];

    return res.status(201).json({
      client,
      note: null
    });
  } catch (err) {
    console.error('Create client error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List clients by zone
router.get('/by-zone/:id', auth, requireRole('manager', 'supervisor', 'chief'), async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    // If chief, ensure the requested zone is assigned to this chief
    if (req?.user?.role === 'chief') {
      const chk = await db.query('SELECT 1 FROM zones WHERE id = $1 AND assigned_chief = $2', [zoneId, req.user.id]);
      if (!chk.rows.length) return res.status(403).json({ error: 'Forbidden: zone not assigned to this chief' });
    }
    const { rows } = await db.query(
      `SELECT id, username, name, zone_id, phone_number, monthly_amount, created_at
       FROM clients
       WHERE zone_id = $1
       ORDER BY id DESC`,
      [zoneId]
    );
    return res.json({ clients: rows });
  } catch (err) {
    console.error('List clients by zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Move a client to another zone
router.patch('/:id/zone', auth, requireRole('manager', 'supervisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'Invalid client id' });
    if (!zoneId) return res.status(400).json({ error: 'zoneId is required' });

    // Validate target zone exists
    const zoneRes = await db.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
    if (!zoneRes.rows.length) return res.status(404).json({ error: 'Target zone not found' });

    const upd = await db.query(
      `UPDATE clients SET zone_id = $1 WHERE id = $2
       RETURNING id, username, name, zone_id, phone_number, created_at`,
      [zoneId, clientId]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'Client not found' });
    return res.json({ client: upd.rows[0] });
  } catch (err) {
    console.error('Move client zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a client
router.delete('/:id', auth, requireRole('manager', 'supervisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'Invalid client id' });
    const del = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [clientId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Client not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update client fields (username, name, monthly_amount)
router.patch('/:id', auth, requireRole('manager', 'supervisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const { username, firstName, lastName, monthlyAmount } = req.body || {};
    if (!Number.isFinite(clientId)) return res.status(400).json({ error: 'Invalid client id' });

    // Fetch existing client to merge name JSON
    const cur = await db.query('SELECT id, name FROM clients WHERE id = $1', [clientId]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Client not found' });
    const curName = cur.rows[0].name || {};
    const newName = {
      first: firstName != null ? String(firstName) : (curName.first || null),
      last: lastName != null ? String(lastName) : (curName.last || null),
    };

    const upd = await db.query(
      `UPDATE clients
       SET username = COALESCE($1, username),
           name = $2,
           monthly_amount = COALESCE($3, monthly_amount)
       WHERE id = $4
       RETURNING id, username, name, zone_id, phone_number, monthly_amount, created_at`,
      [username ?? null, newName, (monthlyAmount != null ? Number(monthlyAmount) : null), clientId]
    );
    return res.json({ client: upd.rows[0] });
  } catch (err) {
    console.error('Update client error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
