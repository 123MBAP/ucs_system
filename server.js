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
import manpowerRouter from './backend/routes/manpower.js';
import profileRouter from './backend/routes/profile.js';
import driverRouter from './backend/routes/driver.js';
import chatRouter from './backend/routes/chat.js';

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

app.get('/api/me', auth, (req, res) => {
  return res.json({ user: req.user });
});

const PORT = Number(process.env.PORT || 4000);
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

export default app;
