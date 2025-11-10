import express from 'express';
import db from '../db.js';
import auth, { requireDriver } from '../middlewares/auth.js';

const router = express.Router();

// GET /api/driver/dashboard
// Returns: user basic profile, salary amount, assigned vehicle (plate), and zones list
router.get('/dashboard', auth, requireDriver, async (req, res) => {
  try {
    const userId = req.user.id;

    const profileQ = await db.query(
      `SELECT u.username, u.first_name, u.last_name, u.phone_number AS driver_phone
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );
    const profile = profileQ.rows[0] || { username: '', first_name: null, last_name: null };

    const salQ = await db.query(`SELECT amount::numeric AS amount FROM salaries WHERE user_id = $1`, [userId]);
    const salary = salQ.rows.length ? Number(salQ.rows[0].amount) : null;

    const vehQ = await db.query(
      `SELECT v.id, v.plate
       FROM driver_vehicle_assignments dva
       JOIN vehicles v ON v.id = dva.vehicle_id
       WHERE dva.user_id = $1`,
      [userId]
    );
    const vehicle = vehQ.rows.length ? vehQ.rows[0] : null;

    const zonesQ = await db.query(
      `SELECT z.id, z.zone_name
       FROM driver_zone_assignments dza
       JOIN zones z ON z.id = dza.zone_id
       WHERE dza.user_id = $1
       ORDER BY z.zone_name ASC`,
      [userId]
    );
    const zones = zonesQ.rows.map(r => ({ id: r.id, name: r.zone_name }));

    return res.json({
      user: { id: userId, username: profile.username, first_name: profile.first_name, last_name: profile.last_name },
      salary,
      vehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate } : null,
      zones,
    });
  } catch (err) {
    console.error('driver dashboard error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/driver/schedule
// Returns schedule entries where this driver is assigned or for their current vehicle
router.get('/schedule', auth, requireDriver, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find driver's current vehicle (if any)
    const vehQ = await db.query(
      `SELECT vehicle_id FROM driver_vehicle_assignments WHERE user_id = $1`,
      [userId]
    );
    const currentVehicleId = vehQ.rows.length ? vehQ.rows[0].vehicle_id : null;

    const where = [
      `s.driver_id = $1`
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
        s.service_day,
        s.service_start,
        s.service_end,
        s.supervisor_status,
        s.supervisor_reason,
        COALESCE(
          (
            SELECT ARRAY(SELECT u.username
                         FROM unnest(s.assigned_manpower_ids) AS mid
                         JOIN users u ON u.id = mid
                         ORDER BY u.username)
          ),
          ARRAY[]::text[]
        ) AS assigned_manpower_usernames
      FROM supervisor_service_schedule s
      JOIN zones z ON z.id = s.zone_id
      LEFT JOIN vehicles v ON v.id = s.vehicle_id
      WHERE ${where.join(' OR ')}
      ORDER BY s.service_day, s.service_start`;

    const { rows } = await db.query(sql, params);
    // map to expected keys
    const schedule = rows.map(r => ({
      id: r.id,
      service_day: r.service_day,
      service_start: r.service_start,
      service_end: r.service_end,
      zone_name: r.zone_name,
      vehicle_plate: r.vehicle_plate,
      assigned_manpower_usernames: r.assigned_manpower_usernames,
      supervisor_status: r.supervisor_status,
      supervisor_reason: r.supervisor_reason,
    }));

    return res.json({ schedule });
  } catch (err) {
    console.error('driver schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
