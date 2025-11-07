import express from 'express';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

function maskEmail(email) {
  if (!email) return null;
  const [name, domain] = String(email).split('@');
  if (!domain) return email;
  const masked = name.length <= 2 ? name[0] + '*' : name[0] + '*'.repeat(Math.max(1, name.length - 2)) + name[name.length - 1];
  return `${masked}@${domain}`;
}

async function findUserByUsernameOrEmail(input) {
  const v = String(input || '').trim();
  if (!v) return null;
  // Try users by username
  let r = await db.query(`
    SELECT u.id, u.username, u.email, u.role_id, COALESCE(r.role_name,'') AS role
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.username = $1
  `, [v]);
  if (r.rows.length) return { type: 'user', row: r.rows[0] };
  // Try users by email
  r = await db.query(`
    SELECT u.id, u.username, u.email, u.role_id, COALESCE(r.role_name,'') AS role
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.email = $1
  `, [v]);
  if (r.rows.length) return { type: 'user', row: r.rows[0] };
  // Try clients by username
  r = await db.query(`SELECT id, username, email, role_id FROM clients WHERE username = $1`, [v]);
  if (r.rows.length) return { type: 'client', row: r.rows[0] };
  // Try clients by email
  r = await db.query(`SELECT id, username, email, role_id FROM clients WHERE email = $1`, [v]);
  if (r.rows.length) return { type: 'client', row: r.rows[0] };
  return null;
}

// Start: discover account and return options
router.post('/password/start', async (req, res) => {
  try {
    const { usernameOrEmail } = req.body || {};
    const found = await findUserByUsernameOrEmail(usernameOrEmail);
    if (!found) return res.status(404).json({ error: 'Account not found' });
    const { type, row } = found;
    const emailHint = maskEmail(row.email);
    return res.json({
      userType: type,
      userId: row.id,
      username: row.username,
      role: row.role || null,
      isClient: type === 'client',
      emailHint,
      canEmailReset: !!row.email,
    });
  } catch (err) {
    console.error('password/start error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Users (chief/driver/manpower): create request to supervisor
router.post('/password/user/request-supervisor', async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'username is required' });
    const r = await db.query(
      `SELECT u.id, r.role_name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.username = $1 AND r.role_name IN ('chief','driver','manpower')`,
      [username]
    );
    const u = r.rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    const ins = await db.query(
      `INSERT INTO password_reset_requests(user_type, user_id, kind, status)
       VALUES ('user',$1,'client_request','pending')
       RETURNING id, created_at`,
      [u.id]
    );
    return res.json({ requestId: ins.rows[0].id, ok: true });
  } catch (err) {
    console.error('password/user/request-supervisor error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Supervisors: list pending requests (chiefs/drivers/manpower under their scope)
router.get('/password/supervisor/requests', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    // Chiefs in zones of this supervisor
    const chiefRows = await db.query(
      `SELECT pr.id, pr.created_at, u.id AS user_id, u.username, u.email, 'chief'::text AS role
       FROM password_reset_requests pr
       JOIN users u ON u.id = pr.user_id
       JOIN roles r ON r.id = u.role_id
       JOIN zones z ON z.assigned_chief = u.id
       WHERE pr.user_type = 'user' AND pr.kind IN ('client_request','supervisor_request') AND pr.status = 'pending'
         AND r.role_name = 'chief' AND z.supervisor_id = $1
       ORDER BY pr.created_at DESC`,
      [supervisorId]
    );
    // Drivers assigned to vehicles of this supervisor
    const driverRows = await db.query(
      `SELECT pr.id, pr.created_at, u.id AS user_id, u.username, u.email, 'driver'::text AS role
       FROM password_reset_requests pr
       JOIN users u ON u.id = pr.user_id
       JOIN roles r ON r.id = u.role_id
       JOIN driver_vehicle_assignments dva ON dva.user_id = u.id
       JOIN vehicles v ON v.id = dva.vehicle_id
       WHERE pr.user_type = 'user' AND pr.kind IN ('client_request','supervisor_request') AND pr.status = 'pending'
         AND r.role_name = 'driver' AND v.supervisor_id = $1
       ORDER BY pr.created_at DESC`,
      [supervisorId]
    );
    // Manpower assigned to vehicles of this supervisor
    const mpRows = await db.query(
      `SELECT pr.id, pr.created_at, u.id AS user_id, u.username, u.email, 'manpower'::text AS role
       FROM password_reset_requests pr
       JOIN users u ON u.id = pr.user_id
       JOIN roles r ON r.id = u.role_id
       JOIN manpower_vehicle_assignments mva ON mva.manpower_id = u.id
       JOIN vehicles v ON v.id = mva.vehicle_id
       WHERE pr.user_type = 'user' AND pr.kind IN ('client_request','supervisor_request') AND pr.status = 'pending'
         AND r.role_name = 'manpower' AND v.supervisor_id = $1
       ORDER BY pr.created_at DESC`,
      [supervisorId]
    );
    const all = [...chiefRows.rows, ...driverRows.rows, ...mpRows.rows];
    // Merge duplicates by pr.id (if any join overlaps)
    const seen = new Map();
    for (const r of all) seen.set(r.id, r);
    const requests = Array.from(seen.values()).map(r => ({ id: r.id, userId: r.user_id, username: r.username, emailHint: maskEmail(r.email), role: r.role, createdAt: r.created_at }));
    return res.json({ requests });
  } catch (err) {
    console.error('password/supervisor/requests error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Supervisors: approve reset for a user request
router.post('/password/supervisor/requests/:id/reset', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const rid = Number(req.params.id);
    if (!Number.isFinite(rid)) return res.status(400).json({ error: 'Invalid id' });
    // Load request and user role
    const qr = await db.query(
      `SELECT pr.id, pr.user_id, u.id AS user_id, r.role_name AS role
       FROM password_reset_requests pr
       JOIN users u ON u.id = pr.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE pr.id = $1 AND pr.user_type = 'user' AND pr.kind IN ('client_request','supervisor_request') AND pr.status = 'pending'`,
      [rid]
    );
    const pr = qr.rows[0];
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    // Scope checks by role
    if (pr.role === 'chief') {
      const own = await db.query(`SELECT 1 FROM zones WHERE assigned_chief = $1 AND supervisor_id = $2 LIMIT 1`, [pr.user_id, supervisorId]);
      if (!own.rows.length) return res.status(403).json({ error: 'Forbidden' });
    } else if (pr.role === 'driver') {
      const own = await db.query(`
        SELECT 1
        FROM driver_vehicle_assignments dva
        JOIN vehicles v ON v.id = dva.vehicle_id
        WHERE dva.user_id = $1 AND v.supervisor_id = $2
        LIMIT 1
      `, [pr.user_id, supervisorId]);
      if (!own.rows.length) return res.status(403).json({ error: 'Forbidden' });
    } else if (pr.role === 'manpower') {
      const own = await db.query(`
        SELECT 1
        FROM manpower_vehicle_assignments mva
        JOIN vehicles v ON v.id = mva.vehicle_id
        WHERE mva.manpower_id = $1 AND v.supervisor_id = $2
        LIMIT 1
      `, [pr.user_id, supervisorId]);
      if (!own.rows.length) return res.status(403).json({ error: 'Forbidden' });
    } else {
      return res.status(400).json({ error: 'Unsupported role' });
    }
    await db.query(`UPDATE users SET password = '123' WHERE id = $1`, [pr.user_id]);
    await db.query(`UPDATE password_reset_requests SET status = 'completed' WHERE id = $1`, [rid]);
    return res.json({ ok: true, resetTo: '123' });
  } catch (err) {
    console.error('password/supervisor/requests/:id/reset error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
// Send email code
router.post('/password/email/send', async (req, res) => {
  try {
    const { userType, userId } = req.body || {};
    if (!userType || !userId) return res.status(400).json({ error: 'userType and userId are required' });
    const table = userType === 'client' ? 'clients' : 'users';
    const r = await db.query(`SELECT id, email FROM ${table} WHERE id = $1`, [userId]);
    const row = r.rows[0];
    if (!row || !row.email) return res.status(400).json({ error: 'Email not set for this account' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    const ins = await db.query(
      `INSERT INTO password_reset_requests(user_type, user_id, email, kind, code, status, expires_at)
       VALUES ($1,$2,$3,'email',$4,'pending',$5)
       RETURNING id, email, expires_at`,
      [userType, userId, row.email, code, expiresAt]
    );
    // TODO: integrate email provider; for now, return masked hint
    return res.json({ requestId: ins.rows[0].id, emailHint: maskEmail(ins.rows[0].email) });
  } catch (err) {
    console.error('password/email/send error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify code and reset to default '123'
router.post('/password/email/verify', async (req, res) => {
  try {
    const { requestId, code } = req.body || {};
    if (!requestId || !code) return res.status(400).json({ error: 'requestId and code are required' });
    const r = await db.query(`SELECT * FROM password_reset_requests WHERE id = $1`, [requestId]);
    const pr = r.rows[0];
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (pr.status !== 'pending') return res.status(400).json({ error: 'Request not pending' });
    if (pr.kind !== 'email') return res.status(400).json({ error: 'Invalid request kind' });
    if (String(pr.code) !== String(code)) return res.status(400).json({ error: 'Invalid code' });
    if (pr.expires_at && new Date(pr.expires_at).getTime() < Date.now()) {
      await db.query(`UPDATE password_reset_requests SET status = 'expired' WHERE id = $1`, [requestId]);
      return res.status(400).json({ error: 'Code expired' });
    }
    const table = pr.user_type === 'client' ? 'clients' : 'users';
    await db.query(`UPDATE ${table} SET password = '123' WHERE id = $1`, [pr.user_id]);
    await db.query(`UPDATE password_reset_requests SET status = 'completed' WHERE id = $1`, [requestId]);
    return res.json({ ok: true, resetTo: '123' });
  } catch (err) {
    console.error('password/email/verify error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Client path: create request visible to chiefs
router.post('/password/client/request', async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ error: 'username is required' });
    const r = await db.query(`SELECT id FROM clients WHERE username = $1`, [username]);
    const client = r.rows[0];
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const ins = await db.query(
      `INSERT INTO password_reset_requests(user_type, user_id, kind, status)
       VALUES ('client',$1,'client_request','pending')
       RETURNING id, created_at`,
      [client.id]
    );
    return res.json({ requestId: ins.rows[0].id, ok: true });
  } catch (err) {
    console.error('password/client/request error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Chiefs: list pending client requests for zones they own
router.get('/password/chief/requests', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const zones = await db.query(`SELECT id FROM zones WHERE assigned_chief = $1`, [chiefId]);
    const zoneIds = zones.rows.map(r => r.id);
    if (!zoneIds.length) return res.json({ requests: [] });
    const { rows } = await db.query(
      `SELECT pr.id, pr.created_at, c.id AS client_id, c.username, c.email, c.zone_id
       FROM password_reset_requests pr
       JOIN clients c ON c.id = pr.user_id
       WHERE pr.user_type = 'client' AND pr.kind = 'client_request' AND pr.status = 'pending'
         AND c.zone_id = ANY($1)
       ORDER BY pr.created_at DESC`,
      [zoneIds]
    );
    return res.json({ requests: rows.map(r => ({ id: r.id, clientId: r.client_id, username: r.username, emailHint: maskEmail(r.email), zoneId: r.zone_id, createdAt: r.created_at })) });
  } catch (err) {
    console.error('password/chief/requests error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Chiefs: approve reset for a client request
router.post('/password/chief/requests/:id/reset', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const rid = Number(req.params.id);
    if (!Number.isFinite(rid)) return res.status(400).json({ error: 'Invalid id' });
    const r = await db.query(
      `SELECT pr.id, pr.user_id, pr.status, c.zone_id
       FROM password_reset_requests pr
       JOIN clients c ON c.id = pr.user_id
       WHERE pr.id = $1 AND pr.user_type = 'client' AND pr.kind = 'client_request'`,
      [rid]
    );
    const pr = r.rows[0];
    if (!pr) return res.status(404).json({ error: 'Request not found' });
    if (pr.status !== 'pending') return res.status(400).json({ error: 'Request not pending' });
    const own = await db.query(`SELECT 1 FROM zones WHERE id = $1 AND assigned_chief = $2`, [pr.zone_id, chiefId]);
    if (!own.rows.length) return res.status(403).json({ error: 'Forbidden' });
    await db.query(`UPDATE clients SET password = '123' WHERE id = $1`, [pr.user_id]);
    await db.query(`UPDATE password_reset_requests SET status = 'completed' WHERE id = $1`, [rid]);
    return res.json({ ok: true, resetTo: '123' });
  } catch (err) {
    console.error('password/chief/requests/:id/reset error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
