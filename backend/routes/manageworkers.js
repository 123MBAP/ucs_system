import express from 'express';
import db from '../db.js';
import auth, { requireManager } from '../middlewares/auth.js';

const router = express.Router();

// Helpers
async function listVehicles() {
  try {
    const { rows } = await db.query(
      `SELECT v.id, v.plate, v.make, v.model, v.supervisor_id,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('user_id', dva.user_id))
                  FROM driver_vehicle_assignments dva
                  WHERE dva.vehicle_id = v.id
                ),
                '[]'::json
              ) AS drivers,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('manpower_id', mva.manpower_id, 'username', u.username))
                  FROM manpower_vehicle_assignments mva
                  JOIN users u ON u.id = mva.manpower_id
                  WHERE mva.vehicle_id = v.id
                ),
                '[]'::json
              ) AS manpower
       FROM vehicles v
       ORDER BY v.plate ASC`
    );
    return rows;
  } catch (e) {
    return [];
  }
}

async function listZones() {
  const { rows } = await db.query(
    `SELECT id, zone_name, assigned_chief, supervisor_id FROM zones ORDER BY zone_name ASC`
  );
  return rows;
}

// GET /api/manageworkers/init
// Returns supervisors with assignments, zones, vehicles, chiefs, drivers, manpower
router.get('/init', auth, requireManager, async (req, res) => {
  try {
    const [supv, zones, vehicles, chiefs, drivers, manpower] = await Promise.all([
      db.query(
        `SELECT u.id, u.username,
                COALESCE((SELECT json_agg(json_build_object('id', z.id, 'name', z.zone_name) ORDER BY z.zone_name)
                           FROM zones z WHERE z.supervisor_id = u.id), '[]'::json) AS zones,
                COALESCE((SELECT json_agg(json_build_object('id', v.id, 'plate', v.plate) ORDER BY v.plate)
                           FROM vehicles v WHERE v.supervisor_id = u.id), '[]'::json) AS vehicles
         FROM users u JOIN roles r ON r.id = u.role_id
         WHERE r.role_name = 'supervisor'
         ORDER BY u.username ASC`
      ).then(r => r.rows),
      listZones(),
      listVehicles(),
      db.query(`SELECT u.id, u.username FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'chief' ORDER BY u.username ASC`).then(r => r.rows),
      db.query(`SELECT u.id, u.username FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'driver' ORDER BY u.username ASC`).then(r => r.rows),
      db.query(`SELECT u.id, u.username FROM users u JOIN roles r ON r.id = u.role_id WHERE r.role_name = 'manpower' ORDER BY u.username ASC`).then(r => r.rows),
    ]);
    return res.json({ supervisors: supv, zones, vehicles, chiefs, drivers, manpower });
  } catch (err) {
    console.error('manageworkers init error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/zones/:id/chief', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    if (!Number.isFinite(zoneId)) return res.status(400).json({ error: 'Invalid zone id' });
    const upd = await db.query(`UPDATE zones SET assigned_chief = NULL WHERE id = $1 RETURNING id`, [zoneId]);
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('remove chief', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Supervisor-zone operations (reuse manager rules)
router.patch('/supervisors/:id/zones/add', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(supervisorId) || !Number.isFinite(Number(zoneId))) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE zones SET supervisor_id = $1 WHERE id = $2 AND (supervisor_id IS NULL OR supervisor_id = $1) RETURNING id, supervisor_id`, [supervisorId, Number(zoneId)]);
    if (!upd.rows.length) return res.status(409).json({ error: 'Zone already assigned to another supervisor or not found' });
    return res.json({ zone: upd.rows[0] });
  } catch (e) {
    console.error('add zone to supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/supervisors/:id/zones/move', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(supervisorId) || !Number.isFinite(Number(zoneId))) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE zones SET supervisor_id = $1 WHERE id = $2 RETURNING id, supervisor_id`, [supervisorId, Number(zoneId)]);
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found' });
    return res.json({ zone: upd.rows[0] });
  } catch (e) {
    console.error('move zone to supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/supervisors/:id/zones/remove', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { zoneId } = req.body || {};
    if (!Number.isFinite(supervisorId) || !Number.isFinite(Number(zoneId))) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE zones SET supervisor_id = NULL WHERE id = $1 AND supervisor_id = $2 RETURNING id`, [Number(zoneId), supervisorId]);
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found or not assigned to this supervisor' });
    return res.json({ success: true });
  } catch (e) {
    console.error('remove zone from supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Supervisor-vehicle operations
router.patch('/supervisors/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(supervisorId) || !Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE vehicles SET supervisor_id = $1 WHERE id = $2 RETURNING id AS vehicle_id, supervisor_id`, [supervisorId, Number(vehicleId)]);
    return res.json({ assignment: upd.rows[0] });
  } catch (e) {
    console.error('assign vehicle to supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/supervisors/:id/vehicle/move', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(supervisorId) || !Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE vehicles SET supervisor_id = $1 WHERE id = $2 RETURNING id AS vehicle_id, supervisor_id`, [supervisorId, Number(vehicleId)]);
    return res.json({ assignment: upd.rows[0] });
  } catch (e) {
    console.error('move vehicle to supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/supervisors/:id/vehicle/:vehicleId', auth, requireManager, async (req, res) => {
  try {
    const supervisorId = Number(req.params.id);
    const vehicleId = Number(req.params.vehicleId);
    if (!Number.isFinite(supervisorId) || !Number.isFinite(vehicleId)) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE vehicles SET supervisor_id = NULL WHERE id = $1 AND supervisor_id = $2 RETURNING id`, [vehicleId, supervisorId]);
    if (!upd.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('unassign vehicle from supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Chiefs and zones
router.post('/zones/:id/reassign-chief', auth, requireManager, async (req, res) => {
  try {
    const zoneId = Number(req.params.id);
    const { chiefUserId } = req.body || {};
    if (!Number.isFinite(zoneId) || !Number.isFinite(Number(chiefUserId))) return res.status(400).json({ error: 'Invalid ids' });
    const upd = await db.query(`UPDATE zones SET assigned_chief = $1 WHERE id = $2 RETURNING id, assigned_chief`, [Number(chiefUserId), zoneId]);
    if (!upd.rows.length) return res.status(404).json({ error: 'Zone not found' });
    return res.json({ zone: upd.rows[0] });
  } catch (e) {
    console.error('reassign chief', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Driver <-> Vehicle assignment (manager)
router.patch('/drivers/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const driverUserId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(driverUserId) || !Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'Invalid ids' });
    const up = await db.query(
      `INSERT INTO driver_vehicle_assignments (user_id, vehicle_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id
       RETURNING user_id, vehicle_id`,
      [driverUserId, Number(vehicleId)]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (e) {
    console.error('assign driver vehicle', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/drivers/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const driverUserId = Number(req.params.id);
    if (!Number.isFinite(driverUserId)) return res.status(400).json({ error: 'Invalid id' });
    const del = await db.query(`DELETE FROM driver_vehicle_assignments WHERE user_id = $1 RETURNING user_id`, [driverUserId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('unassign driver vehicle', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Manpower <-> Vehicle assignment (manager)
router.patch('/manpower/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const manpowerId = Number(req.params.id);
    const { vehicleId } = req.body || {};
    if (!Number.isFinite(manpowerId) || !Number.isFinite(Number(vehicleId))) return res.status(400).json({ error: 'Invalid ids' });
    const up = await db.query(
      `INSERT INTO manpower_vehicle_assignments (manpower_id, vehicle_id)
       VALUES ($1, $2)
       ON CONFLICT (manpower_id) DO UPDATE SET vehicle_id = EXCLUDED.vehicle_id
       RETURNING manpower_id, vehicle_id`,
      [manpowerId, Number(vehicleId)]
    );
    return res.json({ assignment: up.rows[0] });
  } catch (e) {
    console.error('assign manpower vehicle', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/manpower/:id/vehicle', auth, requireManager, async (req, res) => {
  try {
    const manpowerId = Number(req.params.id);
    if (!Number.isFinite(manpowerId)) return res.status(400).json({ error: 'Invalid id' });
    const del = await db.query(`DELETE FROM manpower_vehicle_assignments WHERE manpower_id = $1 RETURNING manpower_id`, [manpowerId]);
    if (!del.rows.length) return res.status(404).json({ error: 'Assignment not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('unassign manpower vehicle', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete manpower user
router.delete('/manpower/:id', auth, requireManager, async (req, res) => {
  try {
    const manpowerId = Number(req.params.id);
    if (!Number.isFinite(manpowerId)) return res.status(400).json({ error: 'Invalid id' });
    // Remove assignment first to avoid FK issues
    await db.query(`DELETE FROM manpower_vehicle_assignments WHERE manpower_id = $1`, [manpowerId]);
    const del = await db.query(
      `DELETE FROM users
       WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE role_name = 'manpower')
       RETURNING id`,
      [manpowerId]
    );
    if (!del.rows.length) return res.status(404).json({ error: 'Manpower not found' });
    return res.json({ success: true });
  } catch (e) {
    console.error('delete manpower', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete supervisor user (unassign zones and vehicles first)
router.delete('/supervisors/:id', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid id' });
    await db.query('BEGIN');
    await db.query(`UPDATE zones SET supervisor_id = NULL WHERE supervisor_id = $1`, [userId]);
    await db.query(`UPDATE vehicles SET supervisor_id = NULL WHERE supervisor_id = $1`, [userId]);
    const del = await db.query(
      `DELETE FROM users
       WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE role_name = 'supervisor')
       RETURNING id`,
      [userId]
    );
    await db.query('COMMIT');
    if (!del.rows.length) return res.status(404).json({ error: 'Supervisor not found' });
    return res.json({ success: true });
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('delete supervisor', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete driver user (remove driver_vehicle_assignments first)
router.delete('/drivers/:id', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid id' });
    await db.query('BEGIN');
    await db.query(`DELETE FROM driver_vehicle_assignments WHERE user_id = $1`, [userId]);
    const del = await db.query(
      `DELETE FROM users
       WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE role_name = 'driver')
       RETURNING id`,
      [userId]
    );
    await db.query('COMMIT');
    if (!del.rows.length) return res.status(404).json({ error: 'Driver not found' });
    return res.json({ success: true });
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('delete driver', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete chief user (unassign from zones)
router.delete('/chiefs/:id', auth, requireManager, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) return res.status(400).json({ error: 'Invalid id' });
    await db.query('BEGIN');
    await db.query(`UPDATE zones SET assigned_chief = NULL WHERE assigned_chief = $1`, [userId]);
    const del = await db.query(
      `DELETE FROM users
       WHERE id = $1 AND role_id = (SELECT id FROM roles WHERE role_name = 'chief')
       RETURNING id`,
      [userId]
    );
    await db.query('COMMIT');
    if (!del.rows.length) return res.status(404).json({ error: 'Chief not found' });
    return res.json({ success: true });
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('delete chief', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vehicle (remove assignments then delete vehicle)
router.delete('/vehicles/:id', auth, requireManager, async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    if (!Number.isFinite(vehicleId)) return res.status(400).json({ error: 'Invalid id' });
    await db.query('BEGIN');
    await db.query(`DELETE FROM driver_vehicle_assignments WHERE vehicle_id = $1`, [vehicleId]);
    await db.query(`DELETE FROM manpower_vehicle_assignments WHERE vehicle_id = $1`, [vehicleId]);
    const del = await db.query(`DELETE FROM vehicles WHERE id = $1 RETURNING id`, [vehicleId]);
    await db.query('COMMIT');
    if (!del.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    return res.json({ success: true });
  } catch (e) {
    try { await db.query('ROLLBACK'); } catch {}
    console.error('delete vehicle', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
