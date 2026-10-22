import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import fs from 'fs';

import authRoutes from './routes/auth';
import datasetRoutes from './routes/datasets';
import reportRoutes from './routes/reports';
import shareRoutes from './routes/share';
import { errorHandler } from './middleware/errorHandler';
import { pool } from './config/database';

const app = express();

// ── Ensure upload directory exists ────────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server, curl, mobile, or requests without Origin header
    if (!origin) return callback(null, true);
    // Dynamically allow requesting origin (e.g. Vercel deployment, localhost)
    return callback(null, true);
  },
  credentials: true,
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/share', shareRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Graceful shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully…');
  await pool.end();
  process.exit(0);
});

const PORT = Number(process.env.PORT) || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 ByteVox API → http://localhost:${PORT}`);
    console.log(`   DB: ${process.env.DATABASE_URL ? '✅ configured' : '⚠️  DATABASE_URL not set'}`);
    console.log(`   ENV: ${process.env.NODE_ENV || 'development'}\n`);
  });
}

export default app;
