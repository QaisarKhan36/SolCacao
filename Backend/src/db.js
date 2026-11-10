// MySQL connection pool (mysql2). All queries use ? placeholders, so user
// input is never concatenated into SQL.
import mysql from 'mysql2/promise';
import { config } from './config.js';

export const pool = mysql.createPool({
  ...config.db,
  charset: 'utf8mb4_unicode_ci',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL columns (price, cacao %) as numbers
});

// Runs fn(connection) inside a transaction: commit on success, rollback on error.
export const withTransaction = async fn => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
