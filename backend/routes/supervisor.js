import express from 'express';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

async function ensureTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS zone_service_days (
        zone_id INTEGER PRIMARY KEY REFERENCES zones(id) ON DELETE CASCADE,
        days SMALLINT[] NOT NULL DEFAULT '{}'
      );
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS supervisor_zone_driver_assignments (
        zone_id INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
        weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
        driver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY(zone_id, weekday)
      );
    `);
    await db.query(`
      ALTER TABLE driver_vehicle_assignments
      ADD COLUMN IF NOT EXISTS assigned_manpowers INTEGER[] DEFAULT '{}';
    `);
    await db.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS supervisor_service_schedule (
        id SERIAL PRIMARY KEY,
        zone_id INT NOT NULL REFERENCES zones(id) ON UPDATE CASCADE ON DELETE CASCADE,
        supervisor_id INT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE,
        driver_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        service_day SMALLINT NOT NULL CHECK (service_day BETWEEN 1 AND 7),
        service_start TIME NOT NULL,
        service_end TIME NOT NULL,
        assigned_manpower_ids INT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.error('ensureTables error', e);
  }
}

router.use(async (req, res, next) => {
  await ensureTables();
  next();
});

// List service schedule entries for this supervisor in a zone
router.get('/zones/:id/schedule', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    const { rows } = await db.query(
      `SELECT id, zone_id, supervisor_id, vehicle_id, driver_id, service_day, service_start, service_end, assigned_manpower_ids, created_at
       FROM supervisor_service_schedule
       WHERE zone_id = $1 AND supervisor_id = $2
       ORDER BY service_day, service_start`,
      [zoneId, supervisorId]
    );
    return res.json({ schedule: rows });
  } catch (err) {
    console.error('List schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new schedule entry
router.post('/zones/:id/schedule', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const { service_day, service_start, service_end, vehicle_id, driver_id, assigned_manpower_ids } = req.body || {};
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    const day = Number(service_day);
    if (!Number.isFinite(day) || day < 1 || day > 7) return res.status(400).json({ error: 'Invalid service_day' });
    if (!Number.isFinite(Number(vehicle_id))) return res.status(400).json({ error: 'vehicle_id is required' });
    if (typeof service_start !== 'string' || typeof service_end !== 'string') return res.status(400).json({ error: 'service_start/end must be time strings' });
    const manpowers = Array.isArray(assigned_manpower_ids) ? assigned_manpower_ids.map(Number).filter(Number.isFinite) : [];
    // Ensure vehicle belongs to this supervisor
    const v = await db.query('SELECT id FROM vehicles WHERE id = $1 AND supervisor_id = $2', [Number(vehicle_id), supervisorId]);
    if (!v.rows.length) return res.status(400).json({ error: 'Vehicle not assigned to you' });
    // Optional: validate driver exists
    let driverIdVal = null;
    if (Number.isFinite(Number(driver_id))) {
      const dr = await db.query("SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1 AND r.role_name = 'driver'", [Number(driver_id)]);
      if (!dr.rows.length) return res.status(400).json({ error: 'Invalid driver_id' });
      driverIdVal = Number(driver_id);
    }
    const ins = await db.query(
      `INSERT INTO supervisor_service_schedule (zone_id, supervisor_id, vehicle_id, driver_id, service_day, service_start, service_end, assigned_manpower_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [zoneId, supervisorId, Number(vehicle_id), driverIdVal, day, service_start, service_end, manpowers]
    );
    return res.status(201).json({ entry: ins.rows[0] });
  } catch (err) {
    console.error('Create schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a schedule entry
router.delete('/zones/:id/schedule/:entryId', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const entryId = Number(req.params.entryId);
    if (!Number.isFinite(zoneId) || !Number.isFinite(entryId)) return res.status(400).json({ error: 'Invalid id' });
    const del = await db.query(
      `DELETE FROM supervisor_service_schedule
       WHERE id = $1 AND zone_id = $2 AND supervisor_id = $3
       RETURNING id`,
      [entryId, zoneId, supervisorId]
    );
    if (!del.rows.length) return res.status(404).json({ error: 'Entry not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Zones supervised by current user
router.get('/zones', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const { rows } = await db.query(
      `SELECT z.id, z.zone_name, z.cell, z.village, z.description,
              uc.username AS chief_username,
              (SELECT COUNT(*)::int FROM clients c WHERE c.zone_id = z.id) AS client_count
       FROM zones z
       LEFT JOIN users uc ON uc.id = z.assigned_chief
       WHERE z.supervisor_id = $1
       ORDER BY z.zone_name ASC`,
      [supervisorId]
    );
    return res.json({ zones: rows });
  } catch (err) {
    console.error('Supervisor zones error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Zone supervision detail
router.get('/zones/:id/supervision', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });

    const zr = await db.query('SELECT id, zone_name, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    const sd = await db.query('SELECT days FROM zone_service_days WHERE zone_id = $1', [zoneId]);
    const serviceDays = sd.rows.length ? sd.rows[0].days : [];

    const da = await db.query(
      `SELECT weekday, driver_user_id FROM supervisor_zone_driver_assignments WHERE zone_id = $1 ORDER BY weekday ASC`,
      [zoneId]
    );

    const drivers = await db.query(
      `SELECT u.id, u.username,
              dva.vehicle_id,
              v.plate AS vehicle_plate,
              COALESCE(dva.assigned_manpowers, '{}') AS assigned_manpowers
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN driver_vehicle_assignments dva ON dva.user_id = u.id
       LEFT JOIN vehicles v ON v.id = dva.vehicle_id
       WHERE r.role_name = 'driver'
       ORDER BY u.username ASC`
    );

    const manpower = await db.query(
      `SELECT DISTINCT u.id, u.username
       FROM manpower_vehicle_assignments mva
       JOIN users u ON u.id = mva.manpower_id
       JOIN roles r ON r.id = u.role_id
       JOIN vehicles v ON v.id = mva.vehicle_id
       WHERE v.supervisor_id = $1 AND r.role_name = 'manpower'
       ORDER BY u.username ASC`,
      [supervisorId]
    );

    const vehicles = await db.query(
      `SELECT v.id, v.plate,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('id', u.id, 'username', u.username) ORDER BY u.username)
                  FROM manpower_vehicle_assignments mva
                  JOIN users u ON u.id = mva.manpower_id
                  WHERE mva.vehicle_id = v.id
                ),
                '[]'::json
              ) AS assigned_manpower_users
       FROM vehicles v
       WHERE v.supervisor_id = $1
       ORDER BY v.plate ASC`,
      [supervisorId]
    );

    return res.json({
      zone: { id: zr.rows[0].id, name: zr.rows[0].zone_name },
      serviceDays,
      driverAssignments: da.rows,
      drivers: drivers.rows,
      manpower: manpower.rows,
      vehicles: vehicles.rows,
      supervisorVehicles: vehicles.rows,
    });
  } catch (err) {
    console.error('Zone supervision detail error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Set service days for a zone (array of 1..7)
router.patch('/zones/:id/service-days', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const { days } = req.body || {};
    if (!Array.isArray(days)) return res.status(400).json({ error: 'days must be an array' });
    const clean = days.map((d) => Number(d)).filter((d) => d >= 1 && d <= 7);

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    const up = await db.query(
      `INSERT INTO zone_service_days (zone_id, days)
       VALUES ($1, $2)
       ON CONFLICT (zone_id) DO UPDATE SET days = EXCLUDED.days
       RETURNING zone_id, days`,
      [zoneId, clean]
    );
    return res.json({ serviceDays: up.rows[0].days });
  } catch (err) {
    console.error('Set service days error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign driver for a weekday
router.patch('/zones/:id/driver', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const { weekday, driverUserId } = req.body || {};
    if (!Number.isFinite(Number(weekday)) || weekday < 1 || weekday > 7) return res.status(400).json({ error: 'Invalid weekday' });
    if (!Number.isFinite(Number(driverUserId))) return res.status(400).json({ error: 'Invalid driverUserId' });

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    await db.query(
      `INSERT INTO supervisor_zone_driver_assignments (zone_id, weekday, driver_user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (zone_id, weekday) DO UPDATE SET driver_user_id = EXCLUDED.driver_user_id`,
      [zoneId, Number(weekday), Number(driverUserId)]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('Assign driver error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reassign vehicle for a driver
router.patch('/zones/:id/driver/vehicle', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const { driverUserId, vehicleId } = req.body || {};
    if (!Number.isFinite(Number(driverUserId))) return res.status(400).json({ error: 'Invalid driverUserId' });
    if (!Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'Invalid vehicleId' });

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    const up = await db.query(
      `INSERT INTO driver_vehicle_assignments (user_id, vehicle_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id
       RETURNING user_id, vehicle_id`,
      [Number(driverUserId), Number(vehicleId)]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Reassign vehicle error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Set assigned manpowers for a driver's vehicle assignment
router.patch('/zones/:id/driver/vehicle/manpowers', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const { driverUserId, manpowerIds } = req.body || {};
    if (!Number.isFinite(Number(driverUserId))) return res.status(400).json({ error: 'Invalid driverUserId' });
    if (!Array.isArray(manpowerIds)) return res.status(400).json({ error: 'manpowerIds must be an array' });
    const ids = manpowerIds.map((x) => Number(x)).filter((x) => Number.isFinite(x));

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    // Ensure record exists and vehicle is assigned before setting manpowers
    const drv = await db.query(
      `SELECT user_id, vehicle_id FROM driver_vehicle_assignments WHERE user_id = $1`,
      [Number(driverUserId)]
    );
    if (!drv.rows.length || drv.rows[0].vehicle_id == null) {
      return res.status(400).json({ error: 'Assign a vehicle to this driver first' });
    }

    const up = await db.query(
      `UPDATE driver_vehicle_assignments
       SET assigned_manpowers = $2
       WHERE user_id = $1
       RETURNING user_id, vehicle_id, assigned_manpowers`,
      [Number(driverUserId), ids]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Set vehicle manpowers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add manpower to zone
router.post('/zones/:id/manpower', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const { userId } = req.body || {};
    if (!Number.isFinite(Number(userId))) return res.status(400).json({ error: 'Invalid userId' });

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [Number(userId)]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'manpower') return res.status(400).json({ error: 'User is not manpower' });

    const up = await db.query(
      `INSERT INTO manpower_assignments (user_id, zone_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET zone_id = EXCLUDED.zone_id
       RETURNING user_id, zone_id`,
      [Number(userId), zoneId]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Add manpower error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove manpower from zone
router.delete('/zones/:id/manpower/:userId', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const userId = Number(req.params.userId);

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    const del = await db.query('DELETE FROM manpower_assignments WHERE user_id = $1 AND zone_id = $2 RETURNING user_id', [userId, zoneId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Remove manpower error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
