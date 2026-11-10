// SQL for INQUIRY (entity 9) and INQUIRY_SAMPLER_SELECTION (Phase 3, entity 10).

export const insertInquiry = async (connection, inquiry) => {
  const [result] = await connection.query(
    `INSERT INTO inquiry (user_id, sender_name, sender_email, category, message)
     VALUES (?, ?, ?, ?, ?)`,
    [inquiry.userId, inquiry.name, inquiry.email, inquiry.category, inquiry.message],
  );
  return result.insertId;
};

// One row per picked chocolate; slot_number keeps the order the visitor chose.
export const insertSamplerSelections = async (connection, inquiryId, skus) => {
  const rows = skus.map((sku, index) => [inquiryId, index + 1, sku]);
  await connection.query(
    'INSERT INTO inquiry_sampler_selection (inquiry_id, slot_number, sku) VALUES ?',
    [rows],
  );
};
