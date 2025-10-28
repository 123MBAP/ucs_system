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
       ORDER BY z.id DESC`
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

    // Payment placeholders until schema exists
    return res.json({
      zone: rows[0],
      payments: {
        amountToBePaid: null,
        currentMonthPaid: null,
        todayPaid: null,
      }
    });
  } catch (err) {
    console.error('Zone detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
