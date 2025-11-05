import express from 'express';
import db from '../db.js';
import auth from '../middlewares/auth.js';

const router = express.Router();

function assertGroup(group) {
  return group === 'general' || group === 'workers';
}

function forbidClientForWorkers(req, res) {
  if (req?.user?.role === 'client') {
    return res.status(403).json({ error: 'Forbidden for clients' });
  }
  return null;
}

async function ensureReplyColumn() {
  await db.query(
    `ALTER TABLE chat_messages
       ADD COLUMN IF NOT EXISTS reply_to_id INTEGER NULL REFERENCES chat_messages(id) ON UPDATE CASCADE ON DELETE SET NULL;`
  );
  await db.query(`CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_id);`);
}

router.get('/messages', auth, async (req, res) => {
  async function run() {
    const group = String(req.query.group || 'general');
    if (!assertGroup(group)) return res.status(400).json({ error: 'Invalid group' });
    if (group === 'workers') {
      const denied = forbidClientForWorkers(req, res);
      if (denied) return;
    }

    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));
    const { rows } = await db.query(
      `SELECT cm.id, cm."group", cm.user_id, cm.message, cm.created_at, cm.reply_to_id,
              c.username AS client_username,
              c.name       AS client_name,
              c.phone_number AS client_phone,
              c.profile_image_url AS client_avatar,
              u.username AS user_username,
              rm.id AS reply_id,
              rm.message AS reply_message,
              rm.user_id AS reply_user_id,
              rc.username AS reply_client_username,
              rc.name     AS reply_client_name,
              rc.phone_number AS reply_client_phone,
              rc.profile_image_url AS reply_client_avatar,
              ru.username AS reply_user_username
       FROM chat_messages cm
       LEFT JOIN clients c ON c.id = cm.user_id
       LEFT JOIN users   u ON u.id = cm.user_id
       LEFT JOIN chat_messages rm ON rm.id = cm.reply_to_id
       LEFT JOIN clients rc ON rc.id = rm.user_id
       LEFT JOIN users   ru ON ru.id = rm.user_id
       WHERE cm."group" = $1
       ORDER BY cm.created_at DESC
       LIMIT $2`,
      [group, limit]
    );

    return res.json({ messages: rows });
  }
  try {
    return await run();
  } catch (err) {
    if (err?.code === '42703') {
      try {
        await ensureReplyColumn();
        return await run();
      } catch (e2) {
        console.error('Chat list error after ensureReplyColumn:', e2);
      }
    }
    console.error('Chat list error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/messages', auth, async (req, res) => {
  async function run() {
    const { message, group, reply_to_id } = req.body || {};
    const g = String(group || 'general');
    if (!assertGroup(g)) return res.status(400).json({ error: 'Invalid group' });
    if (!message || String(message).trim() === '') return res.status(400).json({ error: 'message is required' });
    if (g === 'workers') {
      const denied = forbidClientForWorkers(req, res);
      if (denied) return;
    }

    const userId = req?.user?.id ?? null;
    const ins = await db.query(
      `INSERT INTO chat_messages ("group", user_id, message, reply_to_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, "group", user_id, message, created_at, reply_to_id`,
      [g, userId, String(message).trim(), reply_to_id ?? null]
    );

    return res.status(201).json({ message: ins.rows[0] });
  }
  try {
    return await run();
  } catch (err) {
    if (err?.code === '42703') {
      try {
        await ensureReplyColumn();
        return await run();
      } catch (e2) {
        console.error('Chat create error after ensureReplyColumn:', e2);
      }
    }
    console.error('Chat create error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
