import express from 'express';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

router.get('/dashboard', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const username = req.user.username || null;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const zonesRes = await db.query('SELECT id, zone_name FROM zones WHERE assigned_chief = $1 ORDER BY zone_name ASC', [chiefId]);
    const zones = zonesRes.rows;
    const zoneIds = zones.map(z => z.id);

    if (!zoneIds.length) {
      return res.json({
        chiefName: username,
        zoneName: null,
        zones: [],
        clientsTotal: 0,
        amountTotal: 0,
        amountPaid: 0,
        amountRemaining: 0,
        clientsPaid: 0,
        clientsRemaining: 0,
        todayPayments: 0,
        period: { year, month }
      });
    }

    const clientsRes = await db.query(
      `SELECT 
         COUNT(*)::int AS clients_total,
         COALESCE(SUM(COALESCE(monthly_amount, 0)), 0)::numeric AS amount_total
       FROM clients
       WHERE zone_id = ANY($1)`,
      [zoneIds]
    );
    const clientsTotal = clientsRes.rows[0]?.clients_total || 0;
    const amountTotal = Number(clientsRes.rows[0]?.amount_total || 0);

    const paidRes = await db.query(
      `SELECT 
         COALESCE(SUM(CASE 
           WHEN status = 'success'
            AND EXTRACT(YEAR FROM completed_at) = $1
            AND EXTRACT(MONTH FROM completed_at) = $2
           THEN amount ELSE 0 END), 0)::numeric AS amount_paid,
         COUNT(DISTINCT CASE 
           WHEN status = 'success'
            AND EXTRACT(YEAR FROM completed_at) = $1
            AND EXTRACT(MONTH FROM completed_at) = $2
           THEN client_id END)::int AS clients_paid,
         COALESCE(SUM(CASE 
           WHEN status = 'success' 
            AND DATE(completed_at) = CURRENT_DATE
           THEN amount ELSE 0 END), 0)::numeric AS today_paid
       FROM payments_completed pc
       JOIN clients c ON c.id = pc.client_id
       WHERE c.zone_id = ANY($3)`,
      [year, month, zoneIds]
    );
    const amountPaid = Number(paidRes.rows[0]?.amount_paid || 0);
    const clientsPaid = Number(paidRes.rows[0]?.clients_paid || 0);
    const todayPayments = Number(paidRes.rows[0]?.today_paid || 0);

    const amountRemaining = Math.max(0, amountTotal - amountPaid);
    const clientsRemaining = Math.max(0, clientsTotal - clientsPaid);

    const zoneName = zones.length === 1 ? zones[0].zone_name : (zones.length > 1 ? 'Multiple Zones' : null);

    return res.json({
      chiefName: username,
      zoneName,
      zones: zones.map(z => ({ id: z.id, name: z.zone_name })),
      clientsTotal,
      amountTotal,
      amountPaid,
      amountRemaining,
      clientsPaid,
      clientsRemaining,
      todayPayments,
      period: { year, month }
    });
  } catch (err) {
    console.error('Chief dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List clients assigned to this chief with optional filter
// GET /api/chief/clients?filter=all|paid|remaining
router.get('/clients', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const filter = String(req.query.filter || 'all').toLowerCase();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const zonesRes = await db.query('SELECT id FROM zones WHERE assigned_chief = $1', [chiefId]);
    const zoneIds = zonesRes.rows.map(r => r.id);
    if (!zoneIds.length) return res.json({ clients: [] });

    if (filter === 'paid') {
      const { rows } = await db.query(
        `SELECT DISTINCT c.id, c.username, c.name, c.zone_id, c.phone_number, c.monthly_amount, c.created_at
         FROM clients c
         JOIN payments_completed pc ON pc.client_id = c.id
         WHERE c.zone_id = ANY($1)
           AND pc.status = 'success'
           AND EXTRACT(YEAR FROM pc.completed_at) = $2
           AND EXTRACT(MONTH FROM pc.completed_at) = $3
         ORDER BY c.id DESC`,
        [zoneIds, year, month]
      );
      return res.json({ clients: rows });
    }

    if (filter === 'remaining') {
      const { rows } = await db.query(
        `SELECT c.id, c.username, c.name, c.zone_id, c.phone_number, c.monthly_amount, c.created_at
         FROM clients c
         WHERE c.zone_id = ANY($1)
           AND c.id NOT IN (
             SELECT DISTINCT pc.client_id
             FROM payments_completed pc
             WHERE pc.status = 'success'
               AND EXTRACT(YEAR FROM pc.completed_at) = $2
               AND EXTRACT(MONTH FROM pc.completed_at) = $3
           )
         ORDER BY c.id DESC`,
        [zoneIds, year, month]
      );
      return res.json({ clients: rows });
    }

    // default all
    const { rows } = await db.query(
      `SELECT c.id, c.username, c.name, c.zone_id, c.phone_number, c.monthly_amount, c.created_at
       FROM clients c
       WHERE c.zone_id = ANY($1)
       ORDER BY c.id DESC`,
      [zoneIds]
    );
    return res.json({ clients: rows });
  } catch (err) {
    console.error('Chief clients list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Day of Service Plan for a zone assigned to this chief
// GET /api/chief/zones/:id/service-plan
router.get('/zones/:id/service-plan', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });

    // Ensure zone is assigned to this chief
    const zr = await db.query('SELECT id, zone_name FROM zones WHERE id = $1 AND assigned_chief = $2', [zoneId, chiefId]);
    if (!zr.rows.length) return res.status(403).json({ error: 'Forbidden' });

    const q = await db.query(
      `SELECT 
         s.id,
         s.zone_id,
         z.zone_name,
         s.supervisor_id,
         s.vehicle_id,
         v.plate AS vehicle_plate,
         s.driver_id,
         ud.username AS driver_username,
         ud.phone_number AS driver_phone,
         s.service_day,
         s.service_start,
         s.service_end,
         s.created_at,
         s.chief_report_status,
         s.chief_report_reason,
         s.chief_reported_at,
         s.supervisor_status,
         s.supervisor_reason,
         s.supervisor_decided_at,
         COALESCE(
           (
             SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'phone', u.phone_number) ORDER BY u.username)
             FROM unnest(s.assigned_manpower_ids) mid
             JOIN users u ON u.id = mid
           ),
           '[]'::json
         ) AS assigned_manpower_users
       FROM supervisor_service_schedule s
       JOIN zones z ON z.id = s.zone_id
       LEFT JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN users ud ON ud.id = s.driver_id
       WHERE s.zone_id = $1
       ORDER BY s.service_day, s.service_start`,
      [zoneId]
    );

    return res.json({
      zone: { id: zr.rows[0].id, name: zr.rows[0].zone_name },
      schedule: q.rows,
    });
  } catch (err) {
    console.error('Chief service plan error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Chief reports a service status (complete or not_complete with optional reason)
router.post('/service/:id/report', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId)) return res.status(400).json({ error: 'Invalid id' });
    const { status, reason } = req.body || {};
    const st = String(status || '').toLowerCase();
    if (st !== 'complete' && st !== 'not_complete') {
      return res.status(400).json({ error: "status must be 'complete' or 'not_complete'" });
    }

    // Ensure the schedule entry belongs to a zone assigned to this chief
    const own = await db.query(
      `SELECT s.id
       FROM supervisor_service_schedule s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.id = $1 AND z.assigned_chief = $2`,
      [entryId, chiefId]
    );
    if (!own.rows.length) return res.status(404).json({ error: 'Entry not found' });

    const up = await db.query(
      `UPDATE supervisor_service_schedule
       SET chief_report_status = $2,
           chief_report_reason = $3,
           chief_reported_at = NOW()
       WHERE id = $1
       RETURNING id, chief_report_status, chief_report_reason, chief_reported_at`,
      [entryId, st, reason || null]
    );
    return res.json({ report: up.rows[0] });
  } catch (err) {
    console.error('Chief report service error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List completed services for this chief with year/month filters (uses supervisor_decided_at)
router.get('/completed-services', auth, requireRole('chief'), async (req, res) => {
  try {
    const chiefId = req.user.id;
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    const { rows } = await db.query(
      `SELECT 
         s.id,
         s.zone_id,
         z.zone_name,
         s.vehicle_id,
         v.plate AS vehicle_plate,
         s.driver_id,
         ud.username AS driver_username,
         ud.phone_number AS driver_phone,
         s.service_day,
         s.service_start,
         s.service_end,
         s.created_at,
         s.supervisor_status,
         s.supervisor_reason,
         s.supervisor_decided_at,
         COALESCE(
           (
             SELECT json_agg(json_build_object('id', u.id, 'username', u.username, 'phone', u.phone_number) ORDER BY u.username)
             FROM unnest(s.assigned_manpower_ids) mid
             JOIN users u ON u.id = mid
           ),
           '[]'::json
         ) AS assigned_manpower_users
       FROM supervisor_service_schedule s
       JOIN zones z ON z.id = s.zone_id
       LEFT JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN users ud ON ud.id = s.driver_id
       WHERE z.assigned_chief = $1
         AND s.supervisor_status = 'complete'
         AND s.supervisor_decided_at IS NOT NULL
         AND EXTRACT(YEAR FROM s.supervisor_decided_at) = $2
         AND EXTRACT(MONTH FROM s.supervisor_decided_at) = $3
       ORDER BY s.supervisor_decided_at DESC, s.id DESC`,
      [chiefId, year, month]
    );
    return res.json({ services: rows, period: { year, month } });
  } catch (err) {
    console.error('Chief completed services list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
