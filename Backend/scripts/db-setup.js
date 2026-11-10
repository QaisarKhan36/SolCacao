// npm run db:setup
// Deletes and rebuilds the database from the four SQL files, in order:
//   Phase 1 schema -> Phase 1 seed -> Phase 3 migration -> Phase 3 seed
// WARNING: everything in the database named by DB_NAME is erased.
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import mysql from 'mysql2/promise';
import { config, PROJECT_ROOT } from '../src/config.js';

export const SQL_FILES = [
  'solcacao_schema.sql',
  'solcacao_seed_data.sql',
  'phase3_migration.sql',
  'phase3_seed_data.sql',
];

export const setupDatabase = async ({ log = console.log } = {}) => {
  const { database, ...connectionSettings } = config.db;
  if (!/^[A-Za-z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME may only contain letters, numbers and underscores.');
  }

  const connection = await mysql.createConnection({
    ...connectionSettings,
    charset: 'utf8mb4_unicode_ci',
    multipleStatements: true, // each file contains many statements
  });

  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${database}\``);
    for (const file of SQL_FILES) {
      // The SQL files say "solcacao"; point them at DB_NAME instead.
      const sql = (await fs.readFile(path.join(PROJECT_ROOT, 'database', file), 'utf8'))
        .replace(/CREATE DATABASE IF NOT EXISTS solcacao\b/g, `CREATE DATABASE IF NOT EXISTS \`${database}\``)
        .replace(/^USE solcacao;/gm, `USE \`${database}\`;`);
      await connection.query(sql);
      log(`  done: ${file}`);
    }
  } finally {
    await connection.end();
  }
};

// Run directly (not imported by the tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Rebuilding database "${config.db.database}" on ${config.db.host}:${config.db.port} ...`);
  try {
    await setupDatabase();
    console.log('Database ready. Demo logins (password Cacao2026!): maria.garcia@example.com, ramon.torres@chocolatier.com');
  } catch (error) {
    console.error(`Database setup failed: ${error.message}`);
    process.exit(1);
  }
}
