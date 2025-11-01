import express from 'express';
import db from '../db.js';
import auth, { requireRole } from '../middlewares/auth.js';
import { normalizePhone, requestToPay, getRequestToPayStatus } from '../momo/momo.js';
import crypto from 'crypto';
import momoConfig from '../momo/momoConfig.js';

const router = express.Router();

// Allowed roles for payments actions
const paymentRoles = ['manager', 'supervisor', 'chief', 'client'];

// Initiate a pending MoMo transaction
// Body: { amount, currency?, provider?, phoneNumber, purpose?, externalRef?, metadata?, clientId? }
router.post('/transactions', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const { clientId, amount, currency = momoConfig.defaultCurrency, provider = 'momo', phoneNumber, externalRef, metadata, purpose: purposeFromBody } = req.body || {};
    const role = req?.user?.role;
    const clientIdToUse = role === 'client' ? req.user.id : clientId;
    if (!clientIdToUse || !amount) return res.status(400).json({ error: 'clientId and amount are required' });
    const c = await db.query('SELECT id, phone_number FROM clients WHERE id = $1', [clientIdToUse]);
    if (!c.rows.length) return res.status(404).json({ error: 'Client not found' });

    // Align chief flow with client flow: chief uses their entered phone; client can provide or fallback to stored
    const phoneBase = role === 'chief' ? (phoneNumber || '') : ((phoneNumber || c.rows[0]?.phone_number) || '');
    if (!phoneBase) return res.status(400).json({ error: 'Phone number is required for payment' });

    const phone = normalizePhone(phoneBase);
    if (process.env.MOMO_DEBUG === 'true') {
      try { console.log('[payments:init]', { role, normalizedPhone: phone, currency }); } catch {}
    }
    const now = new Date();
    const purposeMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const defaultPurpose = `Payment for ${purposeMonth}`;
    const purpose = (typeof purposeFromBody === 'string' && purposeFromBody.trim().length)
      ? purposeFromBody.trim()
      : defaultPurpose;
    // Always have a reference id saved even if MoMo call fails
    const referenceId = externalRef ?? crypto.randomUUID();

    const isChief = role === 'chief';
    const ins = await db.query(
      `INSERT INTO payments_transactions (
         client_id, amount, currency, provider, phone_number, purpose, external_ref, status, metadata,
         is_paid_by_chief, paid_by_chief_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10)
       RETURNING *`,
      [clientIdToUse, Number(amount), currency, provider, phone, purpose, referenceId, metadata ?? null, isChief, isChief ? req.user.id : null]
    );
    let txn = ins.rows[0];

    // Attempt to initiate MoMo RequestToPay
    try {
      const { referenceId: momoRef } = await requestToPay({
        amount: txn.amount,
        currency: txn.currency,
        phoneNumber: txn.phone_number,
        externalId: String(txn.id),
        payerMessage: purpose,
        payeeNote: purpose,
        referenceId,
      });
      const up = await db.query(
        `UPDATE payments_transactions
         SET status = 'initiated'
         WHERE id = $1
         RETURNING *`,
        [txn.id]
      );
      txn = up.rows[0];
    } catch (momoErr) {
      // Keep as pending if MoMo call fails; return warning info for UI if needed
      console.error('MoMo initiate RTP error:', momoErr);
    }

    return res.status(201).json({ transaction: txn });
  } catch (err) {
    console.error('Create pending payment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List pending transactions
router.get('/transactions', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const scopeChief = String(req.query.scope || '').toLowerCase() === 'chief' && (req?.user?.role === 'chief');
    const filter = String(req.query.filter || '').toLowerCase();
    const mine = String(req.query.mine || '').toLowerCase() === 'true';

    // Build WHERE parts and params
    const whereParts = [];
    const params = [];
    if (mine) {
      if (req?.user?.role !== 'client') {
        return res.json({ transactions: [] });
      }
      params.push(req.user.id);
      whereParts.push(`pt.client_id = $${params.length}`);
    }
    if (scopeChief) {
      // Only show payments initiated by this chief
      whereParts.push(`pt.is_paid_by_chief = true`);
      params.push(req.user.id);
      whereParts.push(`pt.paid_by_chief_id = $${params.length}`);
    }
    if (filter === 'today') {
      whereParts.push(`DATE(pt.created_at) = CURRENT_DATE`);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT pt.*, c.username AS client_username
       FROM payments_transactions pt
       JOIN clients c ON c.id = pt.client_id
       ${whereSql}
       ORDER BY pt.created_at DESC`,
      params
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
    const scopeChief = String(req.query.scope || '').toLowerCase() === 'chief' && (req?.user?.role === 'chief');
    const filter = String(req.query.filter || '').toLowerCase();
    const mine = String(req.query.mine || '').toLowerCase() === 'true';

    const whereParts = [];
    const params = [];
    if (mine) {
      if (req?.user?.role !== 'client') {
        return res.json({ payments: [] });
      }
      params.push(req.user.id);
      whereParts.push(`pc.client_id = $${params.length}`);
    }
    if (scopeChief) {
      // Only show payments initiated by this chief
      whereParts.push(`pc.is_paid_by_chief = true`);
      params.push(req.user.id);
      whereParts.push(`pc.paid_by_chief_id = $${params.length}`);
    }
    if (filter === 'today') {
      whereParts.push(`DATE(pc.completed_at) = CURRENT_DATE`);
    }
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    const { rows } = await db.query(
      `SELECT pc.*, c.username AS client_username
       FROM payments_completed pc
       LEFT JOIN clients c ON c.id = pc.client_id
       ${whereSql}
       ORDER BY pc.completed_at DESC`,
      params
    );
    return res.json({ payments: rows });
  } catch (err) {
    console.error('List completed payments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Payment statements scoped to current user role
router.get('/statements', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const role = req?.user?.role;
    if (role === 'client') {
      const clientId = req.user.id;
      const { rows } = await db.query(
        `SELECT pc.*, c.username AS client_username
         FROM payments_completed pc
         LEFT JOIN clients c ON c.id = pc.client_id
         WHERE pc.client_id = $1
         ORDER BY pc.completed_at DESC`,
        [clientId]
      );
      return res.json({ scope: 'client', payments: rows });
    }

    if (role === 'chief') {
      // Zones assigned to this chief
      const zonesRes = await db.query(
        `SELECT id FROM zones WHERE assigned_chief = $1`,
        [req.user.id]
      );
      const zoneIds = zonesRes.rows.map(r => r.id);
      if (!zoneIds.length) return res.json({ scope: 'zone', payments: [] });

      const { rows } = await db.query(
        `SELECT pc.*, c.username AS client_username, c.zone_id
         FROM payments_completed pc
         JOIN clients c ON c.id = pc.client_id
         WHERE c.zone_id = ANY($1)
         ORDER BY pc.completed_at DESC`,
        [zoneIds]
      );
      return res.json({ scope: 'zone', payments: rows, zoneIds });
    }

    // Default: managers/supervisors can see all
    const { rows } = await db.query(
      `SELECT pc.*, c.username AS client_username, c.zone_id
       FROM payments_completed pc
       LEFT JOIN clients c ON c.id = pc.client_id
       ORDER BY pc.completed_at DESC`
    );
    return res.json({ scope: 'all', payments: rows });
  } catch (err) {
    console.error('Get payment statements error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get MoMo status for a pending transaction by id (uses stored external_ref as referenceId)
router.get('/transactions/:id/status', auth, requireRole(...paymentRoles), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid transaction id' });
    const cur = await db.query('SELECT * FROM payments_transactions WHERE id = $1', [id]);
    if (!cur.rows.length) return res.status(404).json({ error: 'Pending transaction not found' });
    const t = cur.rows[0];
    if (!t.external_ref) return res.status(400).json({ error: 'No reference id on transaction' });
    const status = await getRequestToPayStatus(t.external_ref);
    return res.json({ status });
  } catch (err) {
    console.error('Get MoMo status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Complete a pending transaction (simulate callback success)
// Body: { transactionId?, status? } transactionId refers to provider txn id
router.post('/transactions/:id/complete', auth, requireRole(...paymentRoles), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const id = Number(req.params.id);
    let { transactionId, status = 'success', referenceId } = req.body || {};
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid transaction id' });

    await client.query('BEGIN');
    const cur = await client.query('SELECT * FROM payments_transactions WHERE id = $1', [id]);
    if (!cur.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending transaction not found' });
    }
    const t = cur.rows[0];

    // If a referenceId is provided by caller, ensure it matches the stored external_ref WHEN it already exists.
    // If external_ref is null (older rows), allow setting it from provided referenceId.
    if (t.external_ref && referenceId && String(referenceId) !== String(t.external_ref)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ReferenceId mismatch' });
    }

    const effectiveRef = t.external_ref || referenceId || null;

    // If transactionId is not provided, try to fetch it from MoMo status
    if (!transactionId && effectiveRef) {
      try {
        const s = await getRequestToPayStatus(effectiveRef);
        if (s?.financialTransactionId) {
          transactionId = s.financialTransactionId;
        }
        // If client didn't specify status explicitly, infer from MoMo status
        if (req.body?.status === undefined && s?.status) {
          status = s.status === 'SUCCESSFUL' ? 'success' : (s.status === 'FAILED' ? 'failed' : status);
        }
      } catch (e) {
        // swallow fetch errors; allow manual completion path
      }
    }

    const ins = await client.query(
      `INSERT INTO payments_completed (
         client_id, amount, currency, provider, phone_number, purpose, external_ref, transaction_id, status, metadata,
         is_paid_by_chief, paid_by_chief_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [t.client_id, t.amount, t.currency, t.provider, t.phone_number, t.purpose, effectiveRef, transactionId ?? null, status, t.metadata, t.is_paid_by_chief || false, t.paid_by_chief_id || null]
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
