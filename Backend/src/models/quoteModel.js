// SQL for B2B_QUOTE_REQUEST (entity 8).
import { pool } from '../db.js';

export const createQuote = async quote => {
  const [result] = await pool.query(
    `INSERT INTO b2b_quote_request
       (user_id, company_name, origin, target_percentage, roast, mold_required,
        cacao_profile, packaging_tier, estimated_units, vector_logo_url, vector_original_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quote.userId, quote.companyName, quote.origin, quote.targetPercentage, quote.roast,
      quote.moldRequired, quote.cacaoProfile, quote.packagingTier, quote.estimatedUnits,
      quote.vectorLogoUrl, quote.vectorOriginalName,
    ],
  );
  return result.insertId;
};

export const listQuotesForUser = async userId => {
  const [rows] = await pool.query(
    `SELECT quote_id, company_name, origin, target_percentage, roast, mold_required,
            cacao_profile, packaging_tier, estimated_units, vector_original_name,
            status, created_at, updated_at
     FROM b2b_quote_request
     WHERE user_id = ?
     ORDER BY created_at DESC, quote_id DESC`,
    [userId],
  );
  return rows;
};
