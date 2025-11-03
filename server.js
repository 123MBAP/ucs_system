import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import loginRouter from './backend/routes/login.js';
import auth from './backend/middlewares/auth.js';
import zonesRouter from './backend/routes/zones.js';
import managerRouter from './backend/routes/manager.js';
import clientsRouter from './backend/routes/clients.js';
import paymentsRouter from './backend/routes/payments.js';
import reportRouter from './backend/routes/report.js';
import chiefRouter from './backend/routes/chief.js';
import supervisorRouter from './backend/routes/supervisor.js';
import manageWorkersRouter from './backend/routes/manageworkers.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();

const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';
const corsOptions = allowedOriginsEnv === '*'
  ? {
      // Reflect the request Origin header. This works with credentials and avoids '*'.
      origin: true,
      credentials: true,
    }
  : {
      origin: function (origin, callback) {
        // Allow non-browser requests or missing origin (e.g., curl, server-to-server)
        if (!origin) return callback(null, true);
        const allowed = allowedOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);
        if (allowed.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    };
app.use(cors(corsOptions));

app.use(express.json());

app.use('/api', loginRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/manager', managerRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/report', reportRouter);
app.use('/api/chief', chiefRouter);
app.use('/api/supervisor', supervisorRouter);
app.use('/api/manageworkers', manageWorkersRouter);

app.get('/api/me', auth, (req, res) => {
  return res.json({ user: req.user });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default app;
