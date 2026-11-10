// Central configuration. Every setting comes from environment variables
// (loaded from solcacao-backend/.env) so no secrets live in the code.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

dotenv.config({ path: path.join(PROJECT_ROOT, '.env'), quiet: true });

const env = process.env;
const list = value => (value ?? '').split(',').map(item => item.trim()).filter(Boolean);
const resolveFromRoot = value => path.resolve(PROJECT_ROOT, value);

export const config = {
  env: env.NODE_ENV ?? 'development',
  port: Number(env.PORT ?? 3000),
  // Base URL used to build absolute image links. Empty = derive from the request.
  publicBaseUrl: (env.PUBLIC_BASE_URL ?? '').replace(/\/$/, ''),
  corsOrigins: list(env.CORS_ORIGIN ?? 'http://localhost:5173,http://127.0.0.1:5173'),

  db: {
    host: env.DB_HOST ?? '127.0.0.1',
    port: Number(env.DB_PORT ?? 3306),
    user: env.DB_USER ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database: env.DB_NAME ?? 'solcacao',
  },

  jwt: {
    secret: env.JWT_SECRET ?? '',
    expiresIn: env.JWT_EXPIRES_IN ?? '1d',
  },

  uploadsDir: resolveFromRoot(env.UPLOADS_DIR ?? 'uploads'),
  publicDir: resolveFromRoot('public'),

  // Reports are enabled only when an admin key is configured.
  adminApiKey: env.ADMIN_API_KEY ?? '',

  mail: {
    host: env.SMTP_HOST ?? '',
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === 'true',
    user: env.SMTP_USER ?? '',
    password: env.SMTP_PASSWORD ?? '',
    from: env.MAIL_FROM ?? 'SolCacao <no-reply@solcacao.local>',
    notifyTo: env.MAIL_NOTIFY_TO ?? 'sales@solcacao.local',
  },
};

// Called by server.js before listening, so a missing secret stops the server
// with a clear message instead of failing on the first sign-in.
export const assertRuntimeConfig = () => {
  if (!config.jwt.secret || config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be set in .env and be at least 32 characters long.');
  }
  if (!/^[A-Za-z0-9_]+$/.test(config.db.database)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores.');
  }
};
