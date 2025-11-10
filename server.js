import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import loginRouter from './backend/routes/login.js';
import bcrypt from 'bcryptjs';
import db from './backend/db.js';
import auth from './backend/middlewares/auth.js';
import zonesRouter from './backend/routes/zones.js';
import managerRouter from './backend/routes/manager.js';
import clientsRouter from './backend/routes/clients.js';
import paymentsRouter from './backend/routes/payments.js';
import reportRouter from './backend/routes/report.js';
import chiefRouter from './backend/routes/chief.js';
import supervisorRouter from './backend/routes/supervisor.js';
import manageWorkersRouter from './backend/routes/manageworkers.js';
import manpowerRouter from './backend/routes/manpower.js';
import profileRouter from './backend/routes/profile.js';
import driverRouter from './backend/routes/driver.js';
import chatRouter from './backend/routes/chat.js';
import passwordRouter from './backend/routes/password.js';
import superuserRouter from './backend/routes/superuser.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';
const baseCors = {
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','Accept'],
  optionsSuccessStatus: 204,
};
const corsOptions = allowedOriginsEnv === '*'
  ? {
      ...baseCors,
      // Reflect the request Origin header. This works with credentials and avoids '*'.
      origin: true,
    }
  : {
      ...baseCors,
      origin: function (origin, callback) {
        // Allow non-browser requests or missing origin (e.g., curl, server-to-server)
        if (!origin) return callback(null, true);
        const allowed = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);
        if (allowed.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
    };
app.use(cors(corsOptions));
// Handle preflight requests for all routes without using wildcard path syntax
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, () => res.sendStatus(204));
  }
  next();
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
// Serve profile images
app.use('/profiles', express.static(path.resolve(process.cwd(), 'profiles')));

app.use('/api', loginRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/manager', managerRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/report', reportRouter);
app.use('/api/chief', chiefRouter);
app.use('/api/supervisor', supervisorRouter);
app.use('/api/manageworkers', manageWorkersRouter);
app.use('/api/manpower', manpowerRouter);
app.use('/api/driver', driverRouter);
app.use('/api/profile', profileRouter);
app.use('/api/chat', chatRouter);
app.use('/api', passwordRouter);
app.use('/api/superuser', superuserRouter);

app.get('/api/me', auth, (req, res) => {
  return res.json({ user: req.user });
});

async function initDb() {
  try {
    // Ensure email columns exist
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
    // Ensure clients.password exists with default '123'
    await db.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '123';`);
    // Ensure password_reset_requests table
    await db.query(`
      CREATE TABLE IF NOT EXISTS password_reset_requests (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('user','client')),
        user_id INT NOT NULL,
        email VARCHAR(255),
        kind VARCHAR(30) NOT NULL DEFAULT 'email' CHECK (kind IN ('email','client_request')),
        code VARCHAR(12),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','cancelled','expired')),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Helpful indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_prr_user ON password_reset_requests(user_type, user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_prr_status ON password_reset_requests(status);`);
    // Ensure superuser role exists
    const suRole = await db.query(`SELECT id FROM roles WHERE role_name = 'superuser'`);
    let suRoleId = suRole.rows[0]?.id || null;
    if (!suRoleId) {
      const ins = await db.query(`INSERT INTO roles (role_name) VALUES ('superuser') RETURNING id`);
      suRoleId = ins.rows[0].id;
    }
    // Ensure default superuser account exists
    const suUser = await db.query(`SELECT id FROM users WHERE username = $1`, ['patricksuperuser']);
    if (!suUser.rows.length) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('superuser', salt);
      await db.query(
        `INSERT INTO users (username, password, role_id) VALUES ($1, $2, $3)
         ON CONFLICT (username) DO NOTHING`,
        ['patricksuperuser', hash, suRoleId]
      );
    } else {
      // Make sure role is superuser
      await db.query(`UPDATE users SET role_id = $2 WHERE username = $1`, ['patricksuperuser', suRoleId]);
    }
    console.log('DB init: ensured required tables/columns exist');
  } catch (err) {
    console.error('DB init error:', err);
  }
}

const PORT = Number(process.env.PORT || 4000);
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}).catch(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
});

export default app;
