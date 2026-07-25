require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const { startCronJobs } = require('./cron');
const { seedAdmin } = require('./seed');

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.options('*', cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/sms-backend/auth', require('./routes/authRoutes'));
app.use('/api/sms-backend/user', require('./routes/userRoutes'));
app.use('/api/sms-backend/admin', require('./routes/adminRoutes'));
app.use('/api/sms-backend/phonebook', require('./routes/phonebookRoutes'));
app.use('/api/sms-backend/schedule', require('./routes/scheduleRoutes'));
app.use('/api/sms-backend/history', require('./routes/historyRoutes'));

app.use('/sms-backend', require('./compat/authCompat'));
app.use('/sms-backend', require('./compat/registerCompat'));
app.use('/sms-backend', require('./compat/userCompat'));
app.use('/sms-backend', require('./compat/adminCompat'));
app.use('/sms-backend', require('./compat/phonebookCompat'));
app.use('/sms-backend', require('./compat/scheduleCompat'));
app.use('/sms-backend', require('./compat/historyCompat'));

app.get('/api/sms-backend/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    console.log('[DB] PostgreSQL connected.');

    await sequelize.sync({ alter: true });
    console.log('[DB] Tables synchronized.');

    await seedAdmin();
    startCronJobs();
    console.log('[Cron] SMS scheduler started.');

    app.listen(PORT, () => {
      console.log(`[Server] KreeSMS Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();