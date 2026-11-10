// SQL for LOCALIZATION and TRANSLATION (entity 3).
import { pool } from '../db.js';

export const listLanguages = async () => {
  const [rows] = await pool.query('SELECT lang_code, locale_name FROM localization ORDER BY lang_code');
  return rows;
};

export const findLanguage = async langCode => {
  const [rows] = await pool.query('SELECT lang_code, locale_name FROM localization WHERE lang_code = ?', [langCode]);
  return rows[0] ?? null;
};

export const getTranslations = async langCode => {
  const [rows] = await pool.query(
    'SELECT tkey, tvalue FROM translation WHERE lang_code = ? ORDER BY tkey',
    [langCode],
  );
  return rows;
};
