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

    const clients = rows.map(r => ({
      client_id: r.client_id,
      client_username: r.client_username,
      amount_to_pay: Number(r.amount_to_pay || 0),
      amount_paid: Number(r.amount_paid || 0),
      amount_remaining: Math.max(0, Number(r.amount_to_pay || 0) - Number(r.amount_paid || 0)),
    }));

    return res.json({ year, month, clients });
  } catch (err) {
    console.error('Chief clients summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
