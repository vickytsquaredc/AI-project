require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');

const errorHandler = require('./middleware/errorHandler');
const { sendDueReminders, sendOverdueNotices, expireHolds } = require('./services/notificationService');

// Routes
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const membersRoutes = require('./routes/members');
const circulationRoutes = require('./routes/circulation');
const reservationsRoutes = require('./routes/reservations');
const finesRoutes = require('./routes/fines');
const reportsRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 5000;

// ---- Security & Utility Middleware ----
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting - general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Stricter rate limit for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts, please try again later.' }
});
app.use('/api/auth/login', authLimiter);

// ---- Health Check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- API Routes ----
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/circulation', circulationRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/fines', finesRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use(errorHandler);

// ---- Scheduled Jobs ----
// Run at 8:00 AM every day
cron.schedule('0 8 * * *', async () => {
  console.log('[Cron] Running daily tasks...');
  await sendDueReminders();
  await sendOverdueNotices();
  await expireHolds();
});

// ---- Start Server ----
app.listen(PORT, () => {
  console.log(`\nSchool Library API running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
