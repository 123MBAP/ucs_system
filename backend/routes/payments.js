import express from 'express';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';

const router = express.Router();

// Allowed roles for payments actions
const paymentRoles = ['manager', 'supervisor', 'chief', 'client'];

// Initiate a pending MoMo transaction
// Body: { clientId, amount, currency?, provider?, phoneNumber, purpose?, externalRef?, metadata? }
router.post('/transactions', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const { clientId, amount, currency = 'RWF', provider = 'momo', phoneNumber, purpose, externalRef, metadata } = req.body || {};
    if (!clientId || !amount || !phoneNumber) return res.status(400).json({ error: 'clientId, amount, phoneNumber are required' });
    const c = await db.query('SELECT id FROM clients WHERE id = $1', [clientId]);
    if (!c.rows.length) return res.status(404).json({ error: 'Client not found' });
    const ins = await db.query(
      `INSERT INTO payments_transactions (client_id, amount, currency, provider, phone_number, purpose, external_ref, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
       RETURNING *`,
      [clientId, Number(amount), currency, provider, phoneNumber, purpose ?? null, externalRef ?? null, metadata ?? null]
    );
    return res.status(201).json({ transaction: ins.rows[0] });
  } catch (err) {
    console.error('Create pending payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List pending transactions
router.get('/transactions', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pt.*, c.username AS client_username
       FROM payments_transactions pt
       JOIN clients c ON c.id = pt.client_id
       ORDER BY pt.created_at DESC`
    );
    return res.json({ transactions: rows });
  } catch (err) {
    console.error('List pending payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List completed payments
router.get('/completed', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT pc.*, c.username AS client_username
       FROM payments_completed pc
       LEFT JOIN clients c ON c.id = pc.client_id
       ORDER BY pc.completed_at DESC`
    );
    return res.json({ payments: rows });
  } catch (err) {
    console.error('List completed payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a pending transaction (simulate callback success)
// Body: { transactionId?, status? } transactionId refers to provider txn id
router.post('/transactions/:id/complete', auth, requireRole(...paymentRoles), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const id = Number(req.params.id);
    const { transactionId, status = 'success' } = req.body || {};
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid transaction id' });

    await client.query('BEGIN');
    const cur = await client.query('SELECT * FROM payments_transactions WHERE id = $1', [id]);
    if (!cur.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending transaction not found' });
    }
    const t = cur.rows[0];

    const ins = await client.query(
      `INSERT INTO payments_completed (client_id, amount, currency, provider, phone_number, purpose, external_ref, transaction_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [t.client_id, t.amount, t.currency, t.provider, t.phone_number, t.purpose, t.external_ref, transactionId ?? null, status, t.metadata]
    );

    await client.query('DELETE FROM payments_transactions WHERE id = $1', [id]);
    await client.query('COMMIT');
    return res.json({ payment: ins.rows[0] });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('Complete payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// Helper: list clients for selection in UI
router.get('/clients', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, username FROM clients ORDER BY username ASC');
    return res.json({ clients: rows });
  } catch (err) {
    console.error('Payments list clients error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
