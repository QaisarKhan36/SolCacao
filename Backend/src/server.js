// Entry point: npm start  (or npm run dev to restart on file changes)
import { createApp } from './app.js';
import { assertRuntimeConfig, config } from './config.js';
import { pool } from './db.js';

const startupHint = error => {
  if (error.code === 'ECONNREFUSED') return 'Is MySQL running? Check DB_HOST and DB_PORT in .env.';
  if (error.code === 'ER_ACCESS_DENIED_ERROR') return 'Check DB_USER and DB_PASSWORD in .env.';
  if (error.code === 'ER_BAD_DB_ERROR') return 'The database does not exist yet. Run: npm run db:setup';
  if (error.message.includes('JWT_SECRET')) return 'Run: npm run secret  and paste the value into JWT_SECRET in .env.';
  return '';
};

try {
  assertRuntimeConfig();
  await pool.query('SELECT 1');
} catch (error) {
  console.error(`Cannot start the SolCacao API: ${error.message}`);
  const hint = startupHint(error);
  if (hint) console.error(hint);
  await pool.end().catch(() => {});
  process.exit(1);
}

const server = createApp().listen(config.port, () => {
  console.log(`SolCacao API running at http://localhost:${config.port}  (database: ${config.db.database})`);
});

const shutdown = () => {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
