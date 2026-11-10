// Builds the Express application: security middleware, routes, error handling.
// server.js starts it; the tests start it on a random port.
import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { pool } from './db.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { BRAND_VECTOR_DIR } from './middleware/upload.js';
import authRoutes from './routes/authRoutes.js';
import b2bRoutes from './routes/b2bRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';
import localizationRoutes from './routes/localizationRoutes.js';
import productRoutes from './routes/productRoutes.js';
import reportRoutes from './routes/reportRoutes.js';

export const createApp = () => {
  fs.mkdirSync(BRAND_VECTOR_DIR, { recursive: true });

  const app = express();
  app.disable('x-powered-by');

  app.use(helmet()); // standard security headers
  app.use(cors({
    origin: config.corsOrigins, // only the frontend may call the API from a browser
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key'],
    maxAge: 600,
  }));
  app.use(express.json({ limit: '100kb' }));

  // Product images. The frontend runs on another origin, so images must be
  // allowed cross-origin. Uploaded tech packs are NOT served publicly.
  app.use('/images', (req, res, next) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(path.join(config.publicDir, 'images'), { maxAge: '1d', index: false }));

  app.get('/', (req, res) => {
    res.json({ name: 'SolCacao API', health: '/api/health', docs: 'See README.md' });
  });

  app.get('/api/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/b2b', b2bRoutes);
  app.use('/api/inquiries', inquiryRoutes);
  app.use('/api/localization', localizationRoutes);
  app.use('/api/reports', reportRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
