import bcrypt from 'bcryptjs';
import db from '../db.js';

async function upsertSuperuser() {
  try {
    const username = 'patricksuperuser';
    const plainPassword = 'superuser';

    // Ensure superuser role exists
    const roleRes = await db.query('SELECT id FROM roles WHERE role_name = $1', ['superuser']);
    let roleId;
    if (roleRes.rows.length === 0) {
      const inserted = await db.query('INSERT INTO roles (role_name) VALUES ($1) RETURNING id', ['superuser']);
      roleId = inserted.rows[0].id;
    } else {
      roleId = roleRes.rows[0].id;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);

    // Upsert user with role
    await db.query(
      `INSERT INTO users (username, password, role_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (username)
       DO UPDATE SET password = EXCLUDED.password, role_id = EXCLUDED.role_id`,
      [username, hash, roleId]
    );

    console.log('Superuser ensured:', username);
    process.exit(0);
  } catch (err) {
    console.error('Seed superuser failed:', err);
    process.exit(1);
  }
}

upsertSuperuser();
