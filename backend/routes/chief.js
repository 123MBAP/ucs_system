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

export default router;
