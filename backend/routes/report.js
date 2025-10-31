import express from 'express';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/report/clients-summary?year=YYYY&month=MM
// chief: returns all clients in zones assigned to the chief with amount_to_pay (monthly_amount),
// amount_paid (sum of completed payments in the given month/year, status=success), and remaining
router.get('/clients-summary', auth, requireRole('chief'), async (req, res) => {
  try {
    const userId = req.user.id;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const filter = String(req.query.filter || 'all').toLowerCase();
    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const zonesRes = await db.query('SELECT id FROM zones WHERE assigned_chief = $1', [userId]);
    const zoneIds = zonesRes.rows.map(r => r.id);
    if (!zoneIds.length) return res.json({ year, month, clients: [] });

    const { rows } = await db.query(
      `SELECT 
         c.id as client_id,
         c.username as client_username,
         COALESCE(c.monthly_amount, 0) as amount_to_pay,
         COALESCE(SUM(
           CASE WHEN pc.status = 'success' AND EXTRACT(YEAR FROM pc.completed_at) = $1 AND EXTRACT(MONTH FROM pc.completed_at) = $2
                THEN pc.amount ELSE 0 END
         ), 0) AS amount_paid
       FROM clients c
       LEFT JOIN payments_completed pc ON pc.client_id = c.id
       WHERE c.zone_id = ANY($3)
       GROUP BY c.id, c.username, c.monthly_amount
       ORDER BY c.username ASC`
      , [year, month, zoneIds]
    );

    let clients = rows.map(r => ({
      client_id: r.client_id,
      client_username: r.client_username,
      amount_to_pay: Number(r.amount_to_pay || 0),
      amount_paid: Number(r.amount_paid || 0),
      amount_remaining: Math.max(0, Number(r.amount_to_pay || 0) - Number(r.amount_paid || 0)),
    }));

    if (filter === 'paid') {
      clients = clients.filter(c => c.amount_paid > 0);
    } else if (filter === 'remaining') {
      clients = clients.filter(c => c.amount_remaining > 0);
    }

    return res.json({ year, month, clients });
  } catch (err) {
    console.error('Chief clients summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/report/zones-summary?year=YYYY&month=MM&zoneId=optional&filter=all|paid|remaining
// manager: all zones; supervisor: only zones assigned to him
router.get('/zones-summary', auth, requireRole('manager', 'supervisor'), async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    const zoneId = req.query.zoneId ? Number(req.query.zoneId) : null;
    const filter = String(req.query.filter || 'all').toLowerCase();
    const supervisorId = req.query.supervisorId ? Number(req.query.supervisorId) : null;

    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }

    const params = [];
    const whereParts = [];
    const base = 2; // $1 and $2 are year and month
    if (role === 'supervisor') {
      params.push(userId);
      whereParts.push(`z.supervisor_id = $${base + params.length}`);
    }
    if (role === 'manager' && Number.isFinite(supervisorId)) {
      params.push(supervisorId);
      whereParts.push(`z.supervisor_id = $${base + params.length}`);
    }
    if (zoneId) {
      params.push(zoneId);
      whereParts.push(`z.id = $${base + params.length}`);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const query = `
      WITH zone_base AS (
        SELECT z.id, z.zone_name
        FROM zones z
        ${whereSql}
      ),
      zone_clients AS (
        SELECT c.zone_id, COUNT(*)::int AS clients_count, COALESCE(SUM(COALESCE(c.monthly_amount,0)),0)::numeric AS amount_to_pay
        FROM clients c
        JOIN zone_base zb ON zb.id = c.zone_id
        GROUP BY c.zone_id
      ),
      zone_paid AS (
        SELECT c.zone_id, COALESCE(SUM(CASE WHEN pc.status='success' AND EXTRACT(YEAR FROM pc.completed_at)=$1 AND EXTRACT(MONTH FROM pc.completed_at)=$2 THEN pc.amount ELSE 0 END),0)::numeric AS amount_paid
        FROM payments_completed pc
        JOIN clients c ON c.id = pc.client_id
        JOIN zone_base zb ON zb.id = c.zone_id
        GROUP BY c.zone_id
      )
      SELECT 
        zb.id AS zone_id,
        zb.zone_name,
        COALESCE(zc.clients_count,0) AS clients_count,
        COALESCE(zc.amount_to_pay,0) AS amount_to_pay,
        COALESCE(zp.amount_paid,0) AS amount_paid,
        GREATEST(COALESCE(zc.amount_to_pay,0) - COALESCE(zp.amount_paid,0), 0) AS amount_remaining
      FROM zone_base zb
      LEFT JOIN zone_clients zc ON zc.zone_id = zb.id
      LEFT JOIN zone_paid zp ON zp.zone_id = zb.id
      ORDER BY zb.zone_name ASC`;

    const rowsRes = await db.query(query, [year, month, ...params]);
    let rows = rowsRes.rows.map(r => ({
      zone_id: r.zone_id,
      zone_name: r.zone_name,
      clients_count: Number(r.clients_count || 0),
      amount_to_pay: Number(r.amount_to_pay || 0),
      amount_paid: Number(r.amount_paid || 0),
      amount_remaining: Number(r.amount_remaining || 0),
    }));

    if (filter === 'paid') {
      rows = rows.filter(r => r.amount_paid > 0);
    } else if (filter === 'remaining') {
      rows = rows.filter(r => r.amount_remaining > 0);
    }

    const totals = rows.reduce((acc, r) => {
      acc.clients_count += r.clients_count;
      acc.amount_to_pay += r.amount_to_pay;
      acc.amount_paid += r.amount_paid;
      acc.amount_remaining += r.amount_remaining;
      return acc;
    }, { clients_count: 0, amount_to_pay: 0, amount_paid: 0, amount_remaining: 0 });

    return res.json({ year, month, rows, totals });
  } catch (err) {
    console.error('Zones summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/report/supervisors - list supervisors for manager filtering
router.get('/supervisors', auth, requireRole('manager'), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_name = 'supervisor'
       ORDER BY u.username ASC`
    );
    return res.json({ supervisors: rows });
  } catch (err) {
    console.error('List supervisors error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/report/my-summary?year=YYYY&month=MM
router.get('/my-summary', auth, requireRole('client'), async (req, res) => {
  try {
    const userId = req.user.id;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);
    if (!Number.isFinite(year) || year < 2000 || year > 3000) {
      return res.status(400).json({ error: 'Invalid year' });
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid month' });
    }
    const meRes = await db.query('SELECT id, username, monthly_amount FROM clients WHERE id = $1', [userId]);
    if (!meRes.rows.length) return res.status(404).json({ error: 'Client not found' });
    const me = meRes.rows[0];
    const amtToPay = Number(me.monthly_amount || 0);
    const paidRes = await db.query(
      `SELECT COALESCE(SUM(CASE WHEN status='success' AND EXTRACT(YEAR FROM completed_at)=$1 AND EXTRACT(MONTH FROM completed_at)=$2 THEN amount ELSE 0 END),0) AS amount_paid
       FROM payments_completed
       WHERE client_id = $3`,
      [year, month, userId]
    );
    const amountPaid = Number(paidRes.rows[0]?.amount_paid || 0);
    const amountRemaining = Math.max(0, amtToPay - amountPaid);
    return res.json({ year, month, client: { username: me.username, amount_to_pay: amtToPay, amount_paid: amountPaid, amount_remaining: amountRemaining } });
  } catch (err) {
    console.error('My summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
