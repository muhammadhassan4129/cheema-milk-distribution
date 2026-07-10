require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./config/db');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');

// ─── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const vehicleRoutes = require('./routes/vehicle.routes');
const routeRoutes = require('./routes/route.routes');
const routeCollectionRoutes = require('./routes/routeCollection.routes');
const milkRecordRoutes = require('./routes/milkRecord.routes');
const dispatchRoutes = require('./routes/dispatch.routes');
const advanceRoutes = require('./routes/advance.routes');
const accountRoutes = require('./routes/account.routes');
const labRoutes = require('./routes/lab.routes');
const ledgerRoutes = require('./routes/ledger.routes');
const settingsRoutes = require('./routes/settings.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const resetRoutes = require('./routes/reset.routes');
const purchaseDraftRoutes = require('./routes/purchaseDraft.routes');
const syncLogRoutes = require('./routes/syncLog.routes');

// ─── DB Connect ───────────────────────────────────────────────────────────────
// Vercel serverless ke liye: module level pe call mat karo
// Instead har request se pehle connect karo (cached connection use hoti hai)

const app = express();

// ETag caching disable — polling ke saath 304 responses nahi aayenge
app.set('etag', false);
app.set('x-powered-by', false);
// no-cache

// ─── Middleware ───────────────────────────────────────────────────────────────

// CORS - development aur production dono ke liye
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Postman / server-to-server calls (no origin) allow karo
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Vercel preview URLs bhi allow karo (*.vercel.app)
      if (origin.endsWith('.vercel.app')) return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enforce charset UTF-8 globally for all responses
app.use((req, res, next) => {
  res.charset = 'utf-8';
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── DB Middleware ────────────────────────────────────────────────────────────
// Serverless mein har request se pehle DB connect karo
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('DB connection failed:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Please try again.',
    });
  }
});

// ─── Root Route ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Cheema Dairy API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Cheema Dairy Backend is running',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/route-collections', routeCollectionRoutes);
app.use('/api/milk-records', milkRecordRoutes);
app.use('/api/dispatches', dispatchRoutes);
app.use('/api/advances', advanceRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/lab-reports', labRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reset', resetRoutes);

app.use('/api/ledger/purchase-drafts', purchaseDraftRoutes);
app.use('/api/sync-logs', syncLogRoutes);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
// Local development mein server start karo
// Vercel pe module.exports = app use hota hai (listen nahi)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Cheema Dairy Backend running on port ${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

module.exports = app;
