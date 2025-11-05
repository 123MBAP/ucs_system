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
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(512);
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS manpower_vehicle_assignments (
        manpower_id INT PRIMARY KEY REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        vehicle_id INT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE CASCADE
      );
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
        complained_client_ids INT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.query(`
      ALTER TABLE supervisor_service_schedule
      ADD COLUMN IF NOT EXISTS complained_client_ids INT[] DEFAULT '{}';
    `);
  } catch (e) {
    console.error('ensureTables error', e);
  }
}

router.use(async (req, res, next) => {
  await ensureTables();
  next();
});

// Unassign driver from any vehicle (supervisor scope)
router.delete('/zones/:id/driver/vehicle/:driverUserId', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const driverUserId = Number(req.params.driverUserId);
    if (!Number.isFinite(zoneId) || !Number.isFinite(driverUserId)) return res.status(400).json({ error: 'Invalid id' });

    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [zoneId]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    if (zr.rows[0].supervisor_id !== supervisorId) return res.status(403).json({ error: 'Forbidden' });

    // Ensure the driver assignment belongs to a vehicle owned by this supervisor
    const own = await db.query(
      `SELECT dva.user_id
       FROM driver_vehicle_assignments dva
       JOIN vehicles v ON v.id = dva.vehicle_id
       WHERE dva.user_id = $1 AND v.supervisor_id = $2`,
      [driverUserId, supervisorId]
    );
    if (!own.rows.length) return res.status(404).json({ error: 'Assignment not found' });

    const del = await db.query('DELETE FROM driver_vehicle_assignments WHERE user_id = $1 RETURNING user_id', [driverUserId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Unassign driver (supervisor) error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Vehicles assigned to the current supervisor (with assigned driver's username if any)
router.get('/vehicles', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const { rows } = await db.query(
      `SELECT v.id, v.plate, v.image_url,
              ud.username AS driver_username
       FROM vehicles v
       LEFT JOIN driver_vehicle_assignments dva ON dva.vehicle_id = v.id
       LEFT JOIN users ud ON ud.id = dva.user_id
       LEFT JOIN roles r ON r.id = ud.role_id
       WHERE v.supervisor_id = $1 AND (ud.id IS NULL OR r.role_name = 'driver')
       ORDER BY v.plate ASC`,
      [supervisorId]
    );
    return res.json({ vehicles: rows });
  } catch (err) {
    console.error('Supervisor vehicles error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List all unconfirmed services for this supervisor across all zones
router.get('/schedule', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const { rows } = await db.query(
      `SELECT 
         s.id, s.zone_id, s.supervisor_id,
         s.vehicle_id, v.plate AS vehicle_plate,
         s.driver_id, ud.username AS driver_username,
         s.service_day, s.service_start, s.service_end,
         s.assigned_manpower_ids, s.created_at,
         s.chief_report_status, s.chief_report_reason, s.chief_reported_at,
         s.supervisor_status, s.supervisor_reason, s.supervisor_decided_at,
         z.zone_name
       FROM supervisor_service_schedule s
       JOIN zones z ON z.id = s.zone_id
       LEFT JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN users ud ON ud.id = s.driver_id
       WHERE s.supervisor_id = $1
         AND s.supervisor_status IS NULL
       ORDER BY s.service_day, s.service_start`,
      [supervisorId]
    );
    return res.json({ schedule: rows });
  } catch (err) {
    console.error('List unconfirmed schedule error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List completed (supervisor-confirmed) services for this supervisor with year/month filters
router.get('/completed-services', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const year = req.query.year != null && req.query.year !== '' ? Number(req.query.year) : null;
    const month = req.query.month != null && req.query.month !== '' ? Number(req.query.month) : null;
    const zoneId = req.query.zone_id != null && req.query.zone_id !== '' ? Number(req.query.zone_id) : null;

    const where = ["s.supervisor_id = $1", "s.supervisor_status IN ('complete','not_complete')", 's.supervisor_decided_at IS NOT NULL'];
    const params = [supervisorId];
    let p = 2;
    if (zoneId != null && Number.isFinite(zoneId)) { where.push(`s.zone_id = $${p++}`); params.push(zoneId); }
    if (year != null && Number.isFinite(year)) { where.push(`EXTRACT(YEAR FROM s.supervisor_decided_at) = $${p++}`); params.push(year); }
    if (month != null && Number.isFinite(month)) { where.push(`EXTRACT(MONTH FROM s.supervisor_decided_at) = $${p++}`); params.push(month); }

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
       WHERE ${where.join(' AND ')}
       ORDER BY s.supervisor_decided_at DESC, s.id DESC`;

    const { rows } = await db.query(sql, params);
    return res.json({ services: rows, filters: { zone_id: zoneId, year, month } });
  } catch (err) {
    console.error('Supervisor completed services list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Supervisor verifies (confirm or reject) a reported service status
// POST /api/supervisor/service/:id/verify { status: 'complete'|'not_complete', reason?: string }
router.post('/service/:id/verify', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const entryId = Number(req.params.id);
    if (!Number.isFinite(entryId)) return res.status(400).json({ error: 'Invalid id' });
    const { status, reason } = req.body || {};
    const st = String(status || '').toLowerCase();
    if (st !== 'complete' && st !== 'not_complete') {
      return res.status(400).json({ error: "status must be 'complete' or 'not_complete'" });
    }

    // Ensure this schedule entry belongs to this supervisor
    const own = await db.query(
      'SELECT id FROM supervisor_service_schedule WHERE id = $1 AND supervisor_id = $2',
      [entryId, supervisorId]
    );
    if (!own.rows.length) return res.status(404).json({ error: 'Entry not found' });

    const up = await db.query(
      `UPDATE supervisor_service_schedule
       SET supervisor_status = $2,
           supervisor_reason = $3,
           supervisor_decided_at = NOW()
       WHERE id = $1
       RETURNING id, supervisor_status, supervisor_reason, supervisor_decided_at`,
      [entryId, st, reason || null]
    );
    return res.json({ verification: up.rows[0] });
  } catch (err) {
    console.error('Supervisor verify service error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List service schedule entries for this supervisor in a zone
router.get('/zones/:id/schedule', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    const { rows } = await db.query(
      `SELECT 
         s.id, s.zone_id, s.supervisor_id,
         s.vehicle_id, v.plate AS vehicle_plate,
         s.driver_id, ud.username AS driver_username,
         s.service_day, s.service_start, s.service_end,
         s.assigned_manpower_ids, s.created_at,
         s.chief_report_status, s.chief_report_reason, s.chief_reported_at,
         s.supervisor_status, s.supervisor_reason, s.supervisor_decided_at
       FROM supervisor_service_schedule s
       LEFT JOIN vehicles v ON v.id = s.vehicle_id
       LEFT JOIN users ud ON ud.id = s.driver_id
       WHERE s.zone_id = $1 AND s.supervisor_id = $2
       ORDER BY s.service_day, s.service_start`,
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
      `SELECT 
         u.id,
         u.username,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), '') AS full_name,
         dva.vehicle_id,
         v.plate AS vehicle_plate,
         COALESCE(dva.assigned_manpowers, '{}') AS assigned_manpowers
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN driver_vehicle_assignments dva ON dva.user_id = u.id
       LEFT JOIN vehicles v ON v.id = dva.vehicle_id
       WHERE r.role_name = 'driver'
       ORDER BY COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), ''), u.username) ASC`
    );

    const manpower = await db.query(
      `SELECT 
         u.id,
         u.username,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), '') AS full_name
       FROM manpower_vehicle_assignments mva
       JOIN users u ON u.id = mva.manpower_id
       JOIN roles r ON r.id = u.role_id
       JOIN vehicles v ON v.id = mva.vehicle_id
       WHERE v.supervisor_id = $1 AND r.role_name = 'manpower'
       GROUP BY 
         u.id, 
         u.username, 
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), '')
       ORDER BY COALESCE(
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), ''), 
         u.username
       ) ASC`,
      [supervisorId]
    );

    const vehicles = await db.query(
      `SELECT v.id, v.plate,
              COALESCE(
                (
                  SELECT json_agg(
                           json_build_object(
                             'id', u.id,
                             'username', u.username,
                             'full_name', NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), '')
                           )
                           ORDER BY COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), ''), u.username)
                         )
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

    // Unassigned manpower (no vehicle assignment) available to be added
    const unassignedMp = await db.query(
      `SELECT 
         u.id,
         u.username,
         NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), '') AS full_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN manpower_vehicle_assignments mva ON mva.manpower_id = u.id
       WHERE r.role_name = 'manpower' AND mva.manpower_id IS NULL
       ORDER BY COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name,''),' ',COALESCE(u.last_name,''))), ''), u.username) ASC`
    );

    return res.json({
      zone: { id: zr.rows[0].id, name: zr.rows[0].zone_name },
      serviceDays,
      driverAssignments: da.rows,
      drivers: drivers.rows,
      manpower: manpower.rows,
      vehicles: vehicles.rows,
      supervisorVehicles: vehicles.rows,
      unassignedManpower: unassignedMp.rows,
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

// Assign or move manpower to a vehicle (bulk)
router.patch('/zones/:id/vehicle/:vehicleId/manpower', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const vehicleId = Number(req.params.vehicleId);
    const { manpowerIds } = req.body || {};
    if (!Number.isFinite(zoneId) || !Number.isFinite(vehicleId)) return res.status(400).json({ error: 'Invalid id' });
    if (!Array.isArray(manpowerIds)) return res.status(400).json({ error: 'manpowerIds must be an array' });
    const ids = manpowerIds.map((x) => Number(x)).filter(Number.isFinite);

    // Vehicle must belong to supervisor
    const v = await db.query('SELECT id FROM vehicles WHERE id = $1 AND supervisor_id = $2', [vehicleId, supervisorId]);
    if (!v.rows.length) return res.status(404).json({ error: 'Vehicle not found' });

    if (!ids.length) return res.json({ updated: 0 });

    // Ensure all users are manpower role
    const roleChk = await db.query(
      `SELECT u.id
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ANY($1) AND r.role_name = 'manpower'`,
      [ids]
    );
    const validIds = roleChk.rows.map((r) => r.id);

    let updated = 0;
    for (const mid of validIds) {
      const up = await db.query(
        `INSERT INTO manpower_vehicle_assignments (manpower_id, vehicle_id)
         VALUES ($1, $2)
         ON CONFLICT (manpower_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id
         RETURNING manpower_id`,
        [mid, vehicleId]
      );
      if (up.rows.length) updated++;
    }
    return res.json({ updated });
  } catch (err) {
    console.error('Assign/move manpower to vehicle error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a manpower from a specific vehicle
router.delete('/zones/:id/vehicle/:vehicleId/manpower/:manpowerId', auth, requireRole('supervisor'), async (req, res) => {
  try {
    const supervisorId = req.user.id;
    const zoneId = Number(req.params.id);
    const vehicleId = Number(req.params.vehicleId);
    const manpowerId = Number(req.params.manpowerId);
    if (!Number.isFinite(zoneId) || !Number.isFinite(vehicleId) || !Number.isFinite(manpowerId)) return res.status(400).json({ error: 'Invalid id' });

    // Vehicle must belong to supervisor
    const v = await db.query('SELECT id FROM vehicles WHERE id = $1 AND supervisor_id = $2', [vehicleId, supervisorId]);
    if (!v.rows.length) return res.status(404).json({ error: 'Vehicle not found' });

    const del = await db.query(
      `DELETE FROM manpower_vehicle_assignments
       WHERE manpower_id = $1 AND vehicle_id = $2
       RETURNING manpower_id`,
      [manpowerId, vehicleId]
    );
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Remove manpower from vehicle error:', err);
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
