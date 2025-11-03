import express from 'express';
import db from '../db.js';
import auth, { requireManpower } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/manpower/dashboard
// Returns: profile name, salary, assigned vehicle (plate), driver username (if any), supervisor username (if any)
router.get('/dashboard', auth, requireManpower, async (req, res) => {
  try {
    const userId = req.user.id;

    const profileQ = await db.query(
      `SELECT u.username, up.first_name, up.last_name
       FROM users u
       LEFT JOIN user_profiles up ON up.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );
    const profile = profileQ.rows[0] || { username: '', first_name: null, last_name: null };

    const salQ = await db.query(`SELECT amount::numeric AS amount FROM salaries WHERE user_id = $1`, [userId]);
    const salary = salQ.rows.length ? Number(salQ.rows[0].amount) : null;

    const vehQ = await db.query(
      `SELECT v.id, v.plate, v.supervisor_id
       FROM manpower_vehicle_assignments mva
       JOIN vehicles v ON v.id = mva.vehicle_id
       WHERE mva.manpower_id = $1`,
      [userId]
    );
    const vehicle = vehQ.rows.length ? vehQ.rows[0] : null;

    let driver = null;
    let supervisor = null;

    if (vehicle) {
      const drvQ = await db.query(
        `SELECT u.id, u.username
         FROM driver_vehicle_assignments dva
         JOIN users u ON u.id = dva.user_id
         WHERE dva.vehicle_id = $1`,
        [vehicle.id]
      );
      driver = drvQ.rows.length ? drvQ.rows[0] : null;

      if (vehicle.supervisor_id) {
        const supQ = await db.query(`SELECT id, username FROM users WHERE id = $1`, [vehicle.supervisor_id]);
        supervisor = supQ.rows.length ? supQ.rows[0] : null;
      }
    }

    return res.json({
      user: { id: userId, username: profile.username, first_name: profile.first_name, last_name: profile.last_name },
      salary,
      vehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate } : null,
      driver,
      supervisor,
    });
  } catch (err) {
    console.error('manpower dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

// GET /api/manpower/schedule
// Returns schedule entries where this manpower is assigned, or for their current vehicle
router.get('/schedule', auth, requireManpower, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find current vehicle (if any)
    const vehQ = await db.query(
      `SELECT vehicle_id FROM manpower_vehicle_assignments WHERE manpower_id = $1`,
      [userId]
    );
    const currentVehicleId = vehQ.rows.length ? vehQ.rows[0].vehicle_id : null;

    const where = [
      `($1 = ANY(s.assigned_manpower_ids))`,
    ];
    const params = [userId];
    let p = 2;
    if (currentVehicleId != null) {
      where.push(`s.vehicle_id = $${p++}`);
      params.push(currentVehicleId);
    }

    const sql = `SELECT 
        s.id,
        s.zone_id,
        z.zone_name,
        s.vehicle_id,
        v.plate AS vehicle_plate,
        s.driver_id,
        ud.username AS driver_username,
        s.service_day,
        s.service_start,
        s.service_end,
        s.created_at,
        s.supervisor_status,
        s.supervisor_reason,
        s.supervisor_decided_at
      FROM supervisor_service_schedule s
      JOIN zones z ON z.id = s.zone_id
      LEFT JOIN vehicles v ON v.id = s.vehicle_id
      LEFT JOIN users ud ON ud.id = s.driver_id
      WHERE ${where.join(' OR ')}
      ORDER BY s.service_day, s.service_start`;

    const { rows } = await db.query(sql, params);
    return res.json({ schedule: rows });
  } catch (err) {
    console.error('manpower schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
