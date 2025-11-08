import express from 'express';
import db from '../db.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

// Manager-only middleware
function requireManager(req, res, next) {
  const role = req?.user?.role || null;
  if (role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden: manager role required' });
  }
  return next();
}

// List zones (any authenticated user)
router.get('/', auth, async (req, res) => {
  try {
    const onlyUnassigned = String(req.query.unassigned || '').toLowerCase() === 'true';
    const scopeChief = String(req.query.scope || '').toLowerCase() === 'chief' && (req?.user?.role === 'chief');
    const scopeSupervisor = String(req.query.scope || '').toLowerCase() === 'supervisor' && (req?.user?.role === 'supervisor');

    const whereParts = [];
    const params = [];
    if (onlyUnassigned) {
      whereParts.push('z.supervisor_id IS NULL');
    }
    if (scopeChief) {
      params.push(req.user.id);
      whereParts.push(`z.assigned_chief = $${params.length}`);
    }
    if (scopeSupervisor) {
      params.push(req.user.id);
      whereParts.push(`z.supervisor_id = $${params.length}`);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT 
         z.id,
         z.zone_name,
         z.cell,
         z.village,
         z.description,
         z.assigned_chief,
         z.supervisor_id,
         z.vehicle_id,
         v.plate AS vehicle_plate,
         z.created_at,
         uc.username AS chief_username,
         us.username AS supervisor_username,
         (
           SELECT COUNT(*)::int FROM clients c WHERE c.zone_id = z.id
         ) AS client_count
       FROM zones z
       LEFT JOIN users uc ON uc.id = z.assigned_chief
       LEFT JOIN users us ON us.id = z.supervisor_id
       LEFT JOIN vehicles v ON v.id = z.vehicle_id
       ${whereSql}
       ORDER BY z.id DESC`,
      params
    );
    return res.json({ zones: rows });
  } catch (err) {
    console.error('List zones error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new zone
router.post('/', auth, requireManager, async (req, res) => {
  try {
    const { zoneName, cell, village, description, assignedChief } = req.body || {};

    if (!zoneName || !cell || !village || !description) {
      return res.status(400).json({ error: 'zoneName, cell, village, and description are required' });
    }

    let chiefId = null;
    if (assignedChief) {
      // Validate chief user exists if provided
      const chiefRes = await db.query('SELECT id FROM users WHERE id = $1', [assignedChief]);
      chiefId = chiefRes.rows.length ? chiefRes.rows[0].id : null;
      if (assignedChief && !chiefId) {
        return res.status(400).json({ error: 'Assigned chief not found' });
      }
    }

    const insert = await db.query(
      `INSERT INTO zones (zone_name, cell, village, description, assigned_chief)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, zone_name, cell, village, description, assigned_chief, created_at`,
      [zoneName, cell, village, description, chiefId]
    );

    return res.status(201).json({ zone: insert.rows[0] });
  } catch (err) {
    console.error('Create zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Zone detail (any authenticated user)
router.get('/:id', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid zone id' });
    }

    const { rows } = await db.query(
      `SELECT 
         z.id,
         z.zone_name,
         z.cell,
         z.village,
         z.description,
         z.assigned_chief,
         z.supervisor_id,
         z.vehicle_id,
         v.plate AS vehicle_plate,
         z.created_at,
         uc.username AS chief_username,
         us.username AS supervisor_username,
         (
           SELECT COUNT(*)::int FROM clients c WHERE c.zone_id = z.id
         ) AS client_count
       FROM zones z
       LEFT JOIN users uc ON uc.id = z.assigned_chief
       LEFT JOIN users us ON us.id = z.supervisor_id
       LEFT JOIN vehicles v ON v.id = z.vehicle_id
       WHERE z.id = $1`,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Zone not found' });

    // Compute real payments from DB
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1; // 1-12
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    const startOfDay = new Date(y, m, d, 0, 0, 0, 0);
    const endOfDay = new Date(y, m, d, 23, 59, 59, 999);

    // Total to be paid = sum of clients.monthly_amount in this zone
    const amtToPayRes = await db.query(
      `SELECT COALESCE(SUM(COALESCE(monthly_amount,0)),0) AS amount_to_pay
       FROM clients WHERE zone_id = $1`,
      [id]
    );
    const amountToBePaid = Number(amtToPayRes.rows[0]?.amount_to_pay || 0);

    // Current month paid = sum of payments_completed.amount with status success for this month
    const monthPaidRes = await db.query(
      `SELECT COALESCE(SUM(pc.amount),0) AS amount_paid
       FROM payments_completed pc
       JOIN clients c ON c.id = pc.client_id
       WHERE c.zone_id = $1
         AND pc.status = 'success'
         AND EXTRACT(YEAR FROM pc.completed_at) = $2
         AND EXTRACT(MONTH FROM pc.completed_at) = $3`,
      [id, year, month]
    );
    const currentMonthPaid = Number(monthPaidRes.rows[0]?.amount_paid || 0);

    // Today's paid = sum of payments_completed.amount today
    const todayPaidRes = await db.query(
      `SELECT COALESCE(SUM(pc.amount),0) AS amount_paid
       FROM payments_completed pc
       JOIN clients c ON c.id = pc.client_id
       WHERE c.zone_id = $1
         AND pc.status = 'success'
         AND pc.completed_at >= $2
         AND pc.completed_at <= $3`,
      [id, startOfDay, endOfDay]
    );
    const todayPaid = Number(todayPaidRes.rows[0]?.amount_paid || 0);

    return res.json({
      zone: rows[0],
      payments: {
        amountToBePaid,
        currentMonthPaid,
        todayPaid,
      }
    });
  } catch (err) {
    console.error('Zone detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Zone service days (any authenticated user)
router.get('/:id/service-days', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid zone id' });
    }

    // Ensure table exists (in case supervisor routes haven't been hit to create it)
    await db.query(`
      CREATE TABLE IF NOT EXISTS zone_service_days (
        zone_id INTEGER PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
        days SMALLINT[] NOT NULL DEFAULT '{}'
      );
    `);

    const { rows } = await db.query('SELECT days FROM zone_service_days WHERE zone_id = $1', [id]);
    const days = rows.length ? rows[0].days : [];
    return res.json({ zone_id: id, serviceDays: days });
  } catch (err) {
    console.error('Zone service days error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Zone service schedule (any authenticated user)
router.get('/:id/schedule', auth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Invalid zone id' });
    }

    const { rows } = await db.query(
      `SELECT 
         s.id,
         s.zone_id,
         s.supervisor_id,
         s.vehicle_id,
         v.plate AS vehicle_plate,
         s.driver_id,
         ud.username AS driver_username,
         s.service_day,
         s.service_start,
         s.service_end,
         s.supervisor_status,
         s.supervisor_reason,
         s.supervisor_decided_at,
        COALESCE(s.complained_client_ids, '{}') AS complained_client_ids
       FROM supervisor_service_schedule s
       LEFT JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN users ud ON ud.id = s.driver_id
       WHERE s.zone_id = $1
       ORDER BY s.service_day, s.service_start`,
      [id]
    );
    return res.json({ schedule: rows });
  } catch (err) {
    console.error('Zone schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
