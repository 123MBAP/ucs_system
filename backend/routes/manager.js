import express from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import auth, { requireManager } from '../middlewares/auth.js';

const router = express.Router();

// role guard provided by middlewares/auth.js

function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

async function upsertManpowerSupervisor(client, manpowerId, supervisorId) {
  // Use a SAVEPOINT so a failure doesn't abort the entire transaction
  await client.query('SAVEPOINT sp_upsert_ma');
  try {
    const res = await client.query(
      `INSERT INTO manpower_assignments (manpower_id, supervisor_id)
       VALUES ($1, $2)
       ON CONFLICT (manpower_id) DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id`,
      [manpowerId, supervisorId]
    );
    await client.query('RELEASE SAVEPOINT sp_upsert_ma');
    return res;
  } catch (e) {
    if (e && e.code === '42703') {
      // Rollback to savepoint and retry with legacy schema
      await client.query('ROLLBACK TO SAVEPOINT sp_upsert_ma');
      const res = await client.query(
        `INSERT INTO manpower_assignments (user_id, supervisor_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id`,
        [manpowerId, supervisorId]
      );
      await client.query('RELEASE SAVEPOINT sp_upsert_ma');
      return res;
    }
    // Unknown error: rollback to savepoint and rethrow
    try { await client.query('ROLLBACK TO SAVEPOINT sp_upsert_ma'); } catch {}
    try { await client.query('RELEASE SAVEPOINT sp_upsert_ma'); } catch {}
    throw e;
  }
}

async function ensureSchema() {
  try {
    await db.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await db.query(`
      ALTER TABLE manpower_assignments
      ADD COLUMN IF NOT EXISTS supervisor_id INT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL;
    `);
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'manpower_assignments' AND column_name = 'zone_id'
        ) THEN
          BEGIN
            EXECUTE 'ALTER TABLE manpower_assignments ALTER COLUMN zone_id DROP NOT NULL';
          EXCEPTION WHEN others THEN
            -- ignore if already nullable or constraint missing
            NULL;
          END;
        END IF;
      END $$;
    `);
  } catch (e) {
    console.error('ensureSchema(manager) error', e);
  }
}

router.use(async (req, res, next) => {
  await ensureSchema();
  next();
});

// Manager creates/registers a Chief of the Zone
// Body: { username: string, assigned?: { type: 'existing'|'new', zoneId?: number, zone?: { name, cell, village, description } } }
router.post('/chiefs', auth, requireManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { username, assigned } = req.body || {};

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username is required' });

// Move (reassign) a vehicle to the specified supervisor, even if currently assigned to another (manager only)
router.patch('/supervisors/:id/vehicle/move', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(supervisorId)) return res.status(400).json({ error: 'Invalid supervisor id' });
    if (!Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'Invalid vehicle id' });
    // Validate supervisor role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [supervisorId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'supervisor') {
      return res.status(400).json({ error: 'Provided user is not a supervisor' });
    }
    const v = await db.query('SELECT id FROM vehicles WHERE id = $1', [Number(vehicleId)]);
    if (!v.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    const up = await db.query(
      `UPDATE vehicles SET supervisor_id = $1 WHERE id = $2
       RETURNING id AS vehicle_id, supervisor_id`,
      [supervisorId, Number(vehicleId)]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Move vehicle to supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Move (reassign) a zone to the specified supervisor, even if currently assigned to another (manager only)
router.patch('/supervisors/:id/zones/move', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(supervisorId)) return res.status(400).json({ error: 'Invalid supervisor id' });
    if (!Number.isFinite(Number(zoneId))) return res.status(400).json({ error: 'Invalid zone id' });
    // Validate supervisor role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [supervisorId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'supervisor') {
      return res.status(400).json({ error: 'Provided user is not a supervisor' });
    }
    const zr = await db.query('SELECT id FROM zones WHERE id = $1', [Number(zoneId)]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    const upd = await db.query(
      `UPDATE zones SET supervisor_id = $1 WHERE id = $2
       RETURNING id, zone_name, supervisor_id`,
      [supervisorId, Number(zoneId)]
    );
    return res.json({ zone: upd.rows[0] });
  } catch (err) {
    console.error('Move zone to supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
    }

    // Ensure username not taken
    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Find chief role id
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['chief']);
    if (!roleRes.rows.length) {
      return res.status(500).json({ error: 'chief role not found. Run role seeds.' });
    }
    const chiefRoleId = roleRes.rows[0].id;

    const tempPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);

    await client.query('BEGIN');

    // Create chief user
    const userIns = await client.query(
      `INSERT INTO users (username, password, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, username`,
      [username, hash, chiefRoleId]
    );
    const chief = userIns.rows[0];

    let zone = null;
    if (assigned && typeof assigned === 'object') {
      if (assigned.type === 'existing') {
        if (!assigned.zoneId) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'zoneId is required for assigning existing zone' });
        }
        const zoneRes = await client.query('SELECT id, assigned_chief FROM zones WHERE id = $1', [assigned.zoneId]);
        if (!zoneRes.rows.length) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: 'Zone not found' });
        }
        // Assign chief to zone
        const upd = await client.query(
          `UPDATE zones SET assigned_chief = $1 WHERE id = $2
           RETURNING id, zone_name, cell, village, description, assigned_chief, created_at`,
          [chief.id, assigned.zoneId]
        );
        zone = upd.rows[0];
      } else if (assigned.type === 'new') {
        const z = assigned.zone || {};
        const { name, cell, village, description } = z;
        if (!name || !cell || !village || !description) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'name, cell, village, description are required to create a new zone' });
        }
        const ins = await client.query(
          `INSERT INTO zones (zone_name, cell, village, description, assigned_chief)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, zone_name, cell, village, description, assigned_chief, created_at`,
          [name, cell, village, description, chief.id]
        );
        zone = ins.rows[0];
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      chief: { id: chief.id, username: chief.username, role: 'chief' },
      tempPassword,
      zone,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Create chief error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// List supervisors with assigned vehicles and zones (manager only)
router.get('/supervisors/with-assignments', auth, requireManager, async (req, res) => {
  try {
    try {
      const { rows } = await db.query(
        `SELECT u.id,
                u.username,
                COALESCE(
                  (
                    SELECT json_agg(json_build_object('id', vv.id, 'plate', vv.plate) ORDER BY vv.plate)
                    FROM vehicles vv
                    WHERE vv.supervisor_id = u.id
                  ),
                  '[]'::json
                ) AS vehicles,
                COALESCE(
                  (
                    SELECT json_agg(json_build_object('id', z.id, 'name', z.zone_name) ORDER BY z.zone_name)
                    FROM zones z
                    WHERE z.supervisor_id = u.id
                  ),
                  '[]'::json
                ) AS zones
         FROM users u
         JOIN roles r ON r.id = u.role_id
         WHERE r.role_name = 'supervisor'
         ORDER BY u.username ASC`
      );
      return res.json({ supervisors: rows });
    } catch (e) {
      // Fallback if vehicles.supervisor_id doesn't exist yet
      // code '42703' => undefined column
      if (e && e.code === '42703') {
        const { rows } = await db.query(
          `SELECT u.id,
                  u.username,
                  COALESCE(
                    (
                      SELECT json_agg(json_build_object('id', v.id, 'plate', v.plate) ORDER BY v.plate)
                      FROM supervisor_vehicle_assignments sva
                      JOIN vehicles v ON v.id = sva.vehicle_id
                      WHERE sva.supervisor_id = u.id
                    ),
                    '[]'::json
                  ) AS vehicles,
                  COALESCE(
                    (
                      SELECT json_agg(json_build_object('id', z.id, 'name', z.zone_name) ORDER BY z.zone_name)
                      FROM zones z
                      WHERE z.supervisor_id = u.id
                    ),
                    '[]'::json
                  ) AS zones
           FROM users u
           JOIN roles r ON r.id = u.role_id
           WHERE r.role_name = 'supervisor'
           ORDER BY u.username ASC`
        );
        return res.json({ supervisors: rows, fallback: true });
      }
      throw e;
    }
  } catch (err) {
    console.error('Supervisors with assignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign a vehicle to a supervisor (manager only) — supports multiple vehicles per supervisor
router.patch('/supervisors/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(supervisorId)) return res.status(400).json({ error: 'Invalid supervisor id' });
    if (!Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'vehicleId is required' });
    // Validate supervisor role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [supervisorId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'supervisor') {
      return res.status(400).json({ error: 'Provided user is not a supervisor' });
    }
    const v = await db.query('SELECT id, supervisor_id FROM vehicles WHERE id = $1', [Number(vehicleId)]);
    if (!v.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    const currentSupervisor = v.rows[0].supervisor_id;
    if (currentSupervisor != null && currentSupervisor !== supervisorId) {
      return res.status(409).json({ error: 'Vehicle already assigned to another supervisor', currentSupervisorId: currentSupervisor });
    }
    const up = await db.query(
      `UPDATE vehicles SET supervisor_id = $1 WHERE id = $2
       RETURNING id AS vehicle_id, supervisor_id`,
      [supervisorId, Number(vehicleId)]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Assign vehicle to supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unassign a specific vehicle from a supervisor (manager only)
router.delete('/supervisors/:id/vehicle/:vehicleId', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const vehicleId = Number(req.params.vehicleId);
    if (!Number.isFinite(supervisorId)) return res.status(400).json({ error: 'Invalid supervisor id' });
    if (!Number.isFinite(vehicleId)) return res.status(400).json({ error: 'Invalid vehicle id' });
    const upd = await db.query(
      `UPDATE vehicles SET supervisor_id = NULL WHERE id = $1 AND supervisor_id = $2 RETURNING id`,
      [vehicleId, supervisorId]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Unassign vehicle from supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a zone to supervisor (manager only)
router.patch('/supervisors/:id/zones/add', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(supervisorId)) return res.status(400).json({ error: 'Invalid supervisor id' });
    if (!Number.isFinite(Number(zoneId))) return res.status(400).json({ error: 'Invalid zone id' });
    // Validate supervisor role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [supervisorId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'supervisor') {
      return res.status(400).json({ error: 'Provided user is not a supervisor' });
    }
    // Only allow adding unsupervised zones
    const zr = await db.query('SELECT id, supervisor_id FROM zones WHERE id = $1', [Number(zoneId)]);
    if (!zr.rows.length) return res.status(404).json({ error: 'Zone not found' });
    const currentSupervisor = zr.rows[0].supervisor_id;
    if (currentSupervisor != null) {
      return res.status(409).json({
        error: 'Zone already assigned to a supervisor',
        currentSupervisorId: currentSupervisor
      });
    }
    const upd = await db.query(
      `UPDATE zones SET supervisor_id = $1 WHERE id = $2
       RETURNING id, zone_name, supervisor_id`,
      [supervisorId, Number(zoneId)]
    );
    return res.json({ zone: upd.rows[0] });
  } catch (err) {
    console.error('Add zone to supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove a zone from supervisor (manager only)
router.patch('/supervisors/:id/zones/remove', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(supervisorId)) return res.status(400).json({ error: 'Invalid supervisor id' });
    if (!Number.isFinite(Number(zoneId))) return res.status(400).json({ error: 'Invalid zone id' });
    const upd = await db.query(
      `UPDATE zones SET supervisor_id = NULL WHERE id = $1 AND supervisor_id = $2
       RETURNING id`,
      [Number(zoneId), supervisorId]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found or not assigned to this supervisor' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Remove zone from supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create/register a vehicle (manager only)
// Body: { plate: string, make?: string, model?: string }
router.post('/vehicles', auth, requireManager, async (req, res) => {
  try {
    const { plate, make, model } = req.body || {};
    if (!plate || typeof plate !== 'string') {
      return res.status(400).json({ error: 'plate is required' });
    }
    // ensure unique plate
    const exists = await db.query('SELECT 1 FROM vehicles WHERE plate = $1', [plate]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Vehicle plate already exists' });
    }
    const ins = await db.query(
      `INSERT INTO vehicles (plate, make, model)
       VALUES ($1, $2, $3)
       RETURNING id, plate, make, model, created_at`,
      [plate.trim(), make ?? null, model ?? null]
    );
    return res.status(201).json({ vehicle: ins.rows[0] });
  } catch (err) {
    console.error('Create vehicle error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Manager creates/registers a Manpower
// Body: { firstName: string, lastName: string, username: string, salary?: number, zoneId?: number }
router.post('/manpower', auth, requireManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { firstName, lastName, username, salary, zoneId, vehicleId, supervisorUserId } = req.body || {};

    if (!firstName || !lastName || !username) {
      return res.status(400).json({ error: 'firstName, lastName and username are required' });
    }

    // Check username uniqueness in users
    const existing = await db.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Ensure manpower role id
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['manpower']);
    if (!roleRes.rows.length) {
      return res.status(500).json({ error: 'manpower role not found. Seed roles first.' });
    }
    const manpowerRoleId = roleRes.rows[0].id;

    const tempPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);

    await client.query('BEGIN');
    const insUser = await client.query(
      `INSERT INTO users (username, password, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, username` ,
      [username, hash, manpowerRoleId]
    );
    const mp = insUser.rows[0];

    // Optional: assign to a vehicle on creation
    if (Number.isFinite(Number(vehicleId))) {
      // Validate vehicle exists
      const v = await client.query('SELECT id, supervisor_id FROM vehicles WHERE id = $1', [Number(vehicleId)]);
      if (!v.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Vehicle not found' });
      }
      await client.query(
        `INSERT INTO manpower_vehicle_assignments (manpower_id, vehicle_id)
         VALUES ($1, $2)
         ON CONFLICT (manpower_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id`,
        [mp.id, Number(vehicleId)]
      );
      // If no explicit supervisor provided, derive from vehicle supervisor
      if (!Number.isFinite(Number(supervisorUserId)) && v.rows[0].supervisor_id != null) {
        await upsertManpowerSupervisor(client, mp.id, v.rows[0].supervisor_id);
      }
    }

    // Optional: assign to a supervisor explicitly on creation
    if (Number.isFinite(Number(supervisorUserId))) {
      // Validate supervisor role
      const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [Number(supervisorUserId)]);
      if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'supervisor') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Provided user is not a supervisor' });
      }
      await upsertManpowerSupervisor(client, mp.id, Number(supervisorUserId));
    }

    await client.query('COMMIT');

    return res.status(201).json({
      manpower: { id: mp.id, username: mp.username, role: 'manpower', firstName, lastName },
      tempPassword,
      assigned: {
        vehicleId: Number.isFinite(Number(vehicleId)) ? Number(vehicleId) : null,
        supervisorId: Number.isFinite(Number(supervisorUserId)) ? Number(supervisorUserId) : null
      }
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Create manpower error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Manager creates/registers a Supervisor
// Body: { username: string }
router.post('/supervisors', auth, requireManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { username } = req.body || {};

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'username is required' });
    }

    const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['supervisor']);
    if (!roleRes.rows.length) {
      return res.status(500).json({ error: 'supervisor role not found. Run role seeds.' });
    }
    const supervisorRoleId = roleRes.rows[0].id;

    const tempPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);

    await client.query('BEGIN');
    const userIns = await client.query(
      `INSERT INTO users (username, password, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, username`,
      [username, hash, supervisorRoleId]
    );
    await client.query('COMMIT');

    const supervisor = userIns.rows[0];
    return res.status(201).json({
      supervisor: { id: supervisor.id, username: supervisor.username, role: 'supervisor' },
      tempPassword,
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Create supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Manager creates/registers a Driver
// Body: { firstName: string, lastName: string, car?: { type: 'existing'|'new', carId?: string|number, plate?: string }, zones?: (string|number)[] }
router.post('/drivers', auth, requireManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { firstName, lastName, car, zones, username } = req.body || {};

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'firstName and lastName are required' });
    }

    // Determine username: use provided if given (and unique), else generate based on name+timestamp
    let finalUsername = null;
    if (username && typeof username === 'string') {
      const exists = await db.query('SELECT 1 FROM users WHERE username = $1', [username]);
      if (exists.rows.length) {
        return res.status(409).json({ error: 'Username already exists' });
      }
      finalUsername = username;
    } else {
      const base = `${String(firstName).trim()}.${String(lastName).trim()}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.');
      finalUsername = `${base}.${Date.now()}@ucs.local`;
    }

    // Ensure driver role id
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['driver']);
    if (!roleRes.rows.length) {
      return res.status(500).json({ error: 'driver role not found. Seed roles first.' });
    }
    const driverRoleId = roleRes.rows[0].id;

    const tempPassword = '123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(tempPassword, salt);

    await client.query('BEGIN');

    const insUser = await client.query(
      `INSERT INTO users (username, password, role_id)
       VALUES ($1, $2, $3)
       RETURNING id, username`,
      [finalUsername, hash, driverRoleId]
    );

    await client.query('COMMIT');

    const driver = insUser.rows[0];
    return res.status(201).json({
      driver: { id: driver.id, username: driver.username, role: 'driver', firstName, lastName },
      tempPassword,
      car: car || null,
      zones: Array.isArray(zones) ? zones : [],
      note: 'Car and zone assignments are not persisted yet; schema required.'
    });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Create driver error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Dashboard summary for manager
router.get('/dashboard', auth, requireManager, async (req, res) => {
  try {
    const zonesRes = await db.query('SELECT COUNT(*)::int AS count FROM zones');
    const clientsRes = await db.query('SELECT COUNT(*)::int AS count FROM clients');
    const supervisorsRes = await db.query(
      `SELECT COUNT(u.id)::int AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_name = $1`,
      ['supervisor']
    );
    const chiefsRes = await db.query(
      `SELECT COUNT(u.id)::int AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_name = $1`,
      ['chief']
    );
    const driversRes = await db.query(
      `SELECT COUNT(u.id)::int AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_name = $1`,
      ['driver']
    );
    const manpowerRes = await db.query(
      `SELECT COUNT(u.id)::int AS count
       FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.role_name = $1`,
      ['manpower']
    );
    // vehicles count
    let vehiclesTotal = 0;
    try {
      const vehiclesRes = await db.query('SELECT COUNT(*)::int AS count FROM vehicles');
      vehiclesTotal = vehiclesRes.rows[0]?.count || 0;
    } catch {}

    const zonesTotal = zonesRes.rows[0]?.count || 0;
    const clientsTotal = clientsRes.rows[0]?.count || 0;
    const supervisors = supervisorsRes.rows[0]?.count || 0;
    const chiefs = chiefsRes.rows[0]?.count || 0;
    const drivers = driversRes.rows[0]?.count || 0;
    const manpowerTotal = manpowerRes.rows[0]?.count || 0;

    return res.json({
      zones: { total: zonesTotal, supervisors, chiefs },
      clients: { total: clientsTotal },
      manpower: { total: manpowerTotal },
      vehicles: { total: vehiclesTotal, drivers },
      payments: { currentMonth: null, today: null }
    });
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    return res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// List users by role (manager only)
// GET /api/manager/users?role=chief|supervisor|driver|manpower|client|manager
router.get('/users', auth, requireManager, async (req, res) => {
  try {
    const role = String(req.query.role || '').toLowerCase();
    if (!role) return res.status(400).json({ error: 'role is required' });
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', [role]);
    if (!roleRes.rows.length) return res.json({ users: [] });
    const roleId = roleRes.rows[0].id;
    const { rows } = await db.query(
      'SELECT id, username FROM users WHERE role_id = $1 ORDER BY username ASC',
      [roleId]
    );
    return res.json({ users: rows });
  } catch (err) {
    console.error('List users by role error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reassign an existing chief to a zone (manager only)
// Body: { chiefUserId: number }
router.post('/zones/:id/reassign-chief', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    const { chiefUserId } = req.body || {};
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    if (!chiefUserId) return res.status(400).json({ error: 'chiefUserId is required' });

    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [chiefUserId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'chief') {
      return res.status(400).json({ error: 'Provided user is not a chief' });
    }

    const zoneRes = await db.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
    if (!zoneRes.rows.length) return res.status(404).json({ error: 'Zone not found' });

    const upd = await db.query(
      `UPDATE zones SET assigned_chief = $1 WHERE id = $2
       RETURNING id, zone_name, cell, village, description, assigned_chief, created_at`,
      [chiefUserId, zoneId]
    );
    return res.json({ zone: upd.rows[0] });
  } catch (err) {
    console.error('Reassign chief error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reassign an existing supervisor to a zone (manager only)
// Body: { supervisorUserId: number }
router.post('/zones/:id/reassign-supervisor', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    const { supervisorUserId } = req.body || {};
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    if (!supervisorUserId) return res.status(400).json({ error: 'supervisorUserId is required' });

    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [supervisorUserId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'supervisor') {
      return res.status(400).json({ error: 'Provided user is not a supervisor' });
    }

    const zoneRes = await db.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
    if (!zoneRes.rows.length) return res.status(404).json({ error: 'Zone not found' });

    const upd = await db.query(
      `UPDATE zones SET supervisor_id = $1 WHERE id = $2
       RETURNING id, zone_name, cell, village, description, assigned_chief, supervisor_id, created_at`,
      [supervisorUserId, zoneId]
    );
    return res.json({ zone: upd.rows[0] });
  } catch (err) {
    console.error('Reassign supervisor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List manpower assigned to a zone (manager only)
router.get('/manpower/by-zone/:id', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    const { rows } = await db.query(
      `SELECT u.id, u.username
       FROM manpower_assignments ma
       JOIN users u ON u.id = ma.user_id
       JOIN roles r ON r.id = u.role_id
       WHERE ma.zone_id = $1 AND r.role_name = 'manpower'
       ORDER BY u.username ASC`,
      [zoneId]
    );
    return res.json({ manpower: rows });
  } catch (err) {
    console.error('List manpower by zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Move (assign) a manpower to a zone (manager only)
router.patch('/manpower/:id/zone', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid manpower id' });
    if (!zoneId) return res.status(400).json({ error: 'zoneId is required' });

    // Validate manpower role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [userId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'manpower') {
      return res.status(400).json({ error: 'Provided user is not manpower' });
    }
    // Validate zone
    const zoneRes = await db.query('SELECT id FROM zones WHERE id = $1', [zoneId]);
    if (!zoneRes.rows.length) return res.status(404).json({ error: 'Zone not found' });

    // Upsert assignment (one zone per manpower)
    const up = await db.query(
      `INSERT INTO manpower_assignments (user_id, zone_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET zone_id = EXCLUDED.zone_id
       RETURNING user_id, zone_id`,
      [userId, zoneId]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Assign manpower error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unassign a manpower from any zone (manager only)
router.delete('/manpower/:id/zone', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid manpower id' });
    const del = await db.query('DELETE FROM manpower_assignments WHERE user_id = $1 RETURNING user_id', [userId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Unassign manpower error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List drivers with assigned vehicle, zones, and assigned manpowers (manager only)
router.get('/drivers/with-assignments', auth, requireManager, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id,
              u.username,
              dva.vehicle_id,
              v.plate AS vehicle_plate,
              COALESCE(dva.assigned_manpowers, '{}') AS assigned_manpowers,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('id', uu.id, 'username', uu.username) ORDER BY uu.username)
                  FROM manpower_vehicle_assignments mva
                  JOIN users uu ON uu.id = mva.manpower_id
                  WHERE mva.vehicle_id = dva.vehicle_id
                ),
                '[]'::json
              ) AS assigned_manpower_users,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('id', z.id, 'name', z.zone_name) ORDER BY z.zone_name)
                  FROM driver_zone_assignments dza
                  JOIN zones z ON z.id = dza.zone_id
                  WHERE dza.user_id = u.id
                ),
                '[]'::json
              ) AS zones
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN driver_vehicle_assignments dva ON dva.user_id = u.id
       LEFT JOIN vehicles v ON v.id = dva.vehicle_id
       WHERE r.role_name = 'driver'
       ORDER BY u.username ASC`
    );
    return res.json({ drivers: rows });
  } catch (err) {
    console.error('Drivers with assignments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List all manpower users not assigned to any vehicle (manager only)
router.get('/manpower', auth, requireManager, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.username
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN manpower_vehicle_assignments mva ON mva.manpower_id = u.id
       WHERE r.role_name = 'manpower' AND mva.id IS NULL
       ORDER BY u.username ASC`
    );
    return res.json({ manpower: rows });
  } catch (err) {
    console.error('List manpower error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Set assigned manpowers for a driver's vehicle assignment (manager only)
router.patch('/drivers/:id/vehicle/manpowers', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { manpowerIds } = req.body || {};
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid driver id' });
    if (!Array.isArray(manpowerIds)) return res.status(400).json({ error: 'manpowerIds must be an array' });
    // Validate driver role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [userId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'driver') {
      return res.status(400).json({ error: 'Provided user is not a driver' });
    }
    const ids = manpowerIds.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    // Require an existing assignment with a non-null vehicle
    const drv = await db.query(
      `SELECT user_id, vehicle_id FROM driver_vehicle_assignments WHERE user_id = $1`,
      [userId]
    );
    if (!drv.rows.length || drv.rows[0].vehicle_id == null) {
      return res.status(400).json({ error: 'Assign a vehicle to this driver first' });
    }
    const vehicleId = drv.rows[0].vehicle_id;

    // Transaction: replace current mva rows for this vehicle with the new set (only unassigned will insert due to unique constraint)
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM manpower_vehicle_assignments WHERE vehicle_id = $1', [vehicleId]);
      for (const mpId of ids) {
        if (!Number.isFinite(mpId)) continue;
        await client.query(
          `INSERT INTO manpower_vehicle_assignments (manpower_id, vehicle_id)
           VALUES ($1, $2)
           ON CONFLICT (manpower_id) DO NOTHING`,
          [mpId, vehicleId]
        );
      }
      // Sync the ids that are actually assigned now back to dva.assigned_manpowers
      const after = await client.query(
        `SELECT manpower_id FROM manpower_vehicle_assignments WHERE vehicle_id = $1 ORDER BY manpower_id`,
        [vehicleId]
      );
      const assignedIds = after.rows.map(r => r.manpower_id);
      await client.query(
        `UPDATE driver_vehicle_assignments SET assigned_manpowers = $2 WHERE user_id = $1`,
        [userId, assignedIds]
      );
      await client.query('COMMIT');
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      client.release();
    }

    const up = await db.query(
      `UPDATE driver_vehicle_assignments
       SET assigned_manpowers = assigned_manpowers
       WHERE user_id = $1
       RETURNING user_id, vehicle_id, assigned_manpowers`,
      [userId]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Set driver vehicle manpowers error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List vehicles (manager only)
router.get('/vehicles', auth, requireManager, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, plate, make, model FROM vehicles ORDER BY plate ASC');
    return res.json({ vehicles: rows });
  } catch (err) {
    console.error('List vehicles error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Set driver zones (replace existing set) (manager only)
router.patch('/drivers/:id/zones', auth, requireManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const userId = Number(req.params.id);
    const { zoneIds } = req.body || {};
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid driver id' });
    if (!Array.isArray(zoneIds)) return res.status(400).json({ error: 'zoneIds must be an array' });
    // Validate driver role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [userId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'driver') {
      return res.status(400).json({ error: 'Provided user is not a driver' });
    }
    await client.query('BEGIN');
    await client.query('DELETE FROM driver_zone_assignments WHERE user_id = $1', [userId]);
    for (const zid of zoneIds) {
      if (!Number.isFinite(Number(zid))) continue;
      await client.query('INSERT INTO driver_zone_assignments (user_id, zone_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, Number(zid)]);
    }
    await client.query('COMMIT');
    return res.json({ success: true });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Set driver zones error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Assign a vehicle to a zone (manager only)
router.patch('/zones/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    if (!vehicleId) return res.status(400).json({ error: 'vehicleId is required' });
    const v = await db.query('SELECT id FROM vehicles WHERE id = $1', [vehicleId]);
    if (!v.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    const upd = await db.query(
      `UPDATE zones SET vehicle_id = $1 WHERE id = $2
       RETURNING id, zone_name, vehicle_id`,
      [vehicleId, zoneId]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found' });
    return res.json({ zone: upd.rows[0] });
  } catch (err) {
    console.error('Assign vehicle to zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unassign a vehicle from a zone (manager only)
router.delete('/zones/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    const upd = await db.query(
      `UPDATE zones SET vehicle_id = NULL WHERE id = $1
       RETURNING id`,
      [zoneId]
    );
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Unassign vehicle from zone error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign a vehicle to a driver (manager only)
router.patch('/drivers/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid driver id' });
    if (!vehicleId) return res.status(400).json({ error: 'vehicleId is required' });
    // Validate driver role
    const roleRes = await db.query('SELECT r.role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = $1', [userId]);
    if (!roleRes.rows.length || roleRes.rows[0].role_name !== 'driver') {
      return res.status(400).json({ error: 'Provided user is not a driver' });
    }
    const v = await db.query('SELECT id FROM vehicles WHERE id = $1', [vehicleId]);
    if (!v.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    const up = await db.query(
      `INSERT INTO driver_vehicle_assignments (user_id, vehicle_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id
       RETURNING user_id, vehicle_id`,
      [userId, vehicleId]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (err) {
    console.error('Assign vehicle to driver error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Unassign a vehicle from a driver (manager only)
router.delete('/drivers/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid driver id' });
    const del = await db.query('DELETE FROM driver_vehicle_assignments WHERE user_id = $1 RETURNING user_id', [userId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('Unassign vehicle from driver error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
