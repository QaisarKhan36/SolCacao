// SQL for the `user` table (entity 1).
import { pool } from '../db.js';

const USER_COLUMNS = `user_id, email, password_hash, first_name, last_name, role,
  company_name, tax_id, created_at`;

// Only these columns can be changed through PATCH /api/auth/me.
const UPDATABLE_COLUMNS = ['email', 'first_name', 'last_name', 'company_name', 'tax_id'];

export const findUserById = async userId => {
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM \`user\` WHERE user_id = ?`, [userId]);
  return rows[0] ?? null;
};

export const findUserByEmail = async email => {
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM \`user\` WHERE email = ?`, [email]);
  return rows[0] ?? null;
};

export const createUser = async ({ email, passwordHash, firstName, lastName, role, companyName, taxId }) => {
  const [result] = await pool.query(
    `INSERT INTO \`user\` (email, password_hash, first_name, last_name, role, company_name, tax_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [email, passwordHash, firstName, lastName, role, companyName, taxId],
  );
  return result.insertId;
};

export const updateUser = async (userId, changes) => {
  const entries = Object.entries(changes).filter(([column]) => UPDATABLE_COLUMNS.includes(column));
  if (entries.length === 0) return;

  const assignments = entries.map(([column]) => `${column} = ?`).join(', ');
  await pool.query(
    `UPDATE \`user\` SET ${assignments} WHERE user_id = ?`,
    [...entries.map(([, value]) => value), userId],
  );
};
