// /api/inquiries - the public Contact form (no sign-in needed).
import { Router } from 'express';
import { withTransaction } from '../db.js';
import { optionalAuth } from '../middleware/auth.js';
import { inquiryLimiter } from '../middleware/rateLimits.js';
import { insertInquiry, insertSamplerSelections } from '../models/inquiryModel.js';
import { findSamplerEligibleSkus } from '../models/productModel.js';
import { notifyTeam } from '../services/mailer.js';
import { HttpError } from '../utils/httpError.js';
import { Validator } from '../utils/validator.js';

const router = Router();

// The four Contact page categories first, then the Phase 1 values.
const CATEGORIES = ['sampler', 'wholesale', 'gifts', 'support', 'general', 'product', 'partnership'];
const MAX_SAMPLER_SLOTS = 4;

// Body: { name, email, category, message, samplerSelections? }
// samplerSelections (only for category "sampler"): 1-4 product IDs of
// products marked samplerEligible. The same product may fill two slots.
router.post('/', inquiryLimiter, optionalAuth, async (req, res) => {
  const body = req.body ?? {};
  const validator = new Validator(body);
  const name = validator.string('name', { max: 100 });
  const email = validator.email('email');
  const category = validator.oneOf('category', CATEGORIES);
  const message = validator.string('message', { min: 10, max: 5000 });

  let samplerSkus = [];
  const selections = body.samplerSelections;
  if (category === 'sampler') {
    const valid = Array.isArray(selections)
      && selections.length >= 1
      && selections.length <= MAX_SAMPLER_SLOTS
      && selections.every(id => typeof id === 'string' && id.trim() && id.trim().length <= 40);
    if (valid) samplerSkus = selections.map(id => id.trim());
    else validator.fail('samplerSelections', `Choose between 1 and ${MAX_SAMPLER_SLOTS} sampler products.`);
  } else if (selections !== undefined && selections !== null) {
    validator.fail('samplerSelections', 'samplerSelections can only be sent with the sampler category.');
  }
  validator.assertValid();

  // Every picked product must exist, be for sale, and be marked samplerEligible.
  if (samplerSkus.length > 0) {
    const eligible = new Set(await findSamplerEligibleSkus([...new Set(samplerSkus)]));
    const unavailable = [...new Set(samplerSkus.filter(sku => !eligible.has(sku)))];
    if (unavailable.length > 0) {
      throw new HttpError(400, 'validation_error', 'Some sampler products are not available.', [
        { field: 'samplerSelections', message: `Not available for sampler flights: ${unavailable.join(', ')}.` },
      ]);
    }
  }

  // The inquiry and its sampler rows are saved together or not at all.
  const inquiryId = await withTransaction(async connection => {
    const id = await insertInquiry(connection, {
      userId: req.user?.user_id ?? null, name, email, category, message,
    });
    if (samplerSkus.length > 0) await insertSamplerSelections(connection, id, samplerSkus);
    return id;
  });

  void notifyTeam({
    subject: `New ${category} inquiry #${inquiryId} from ${name}`,
    replyTo: email,
    text: [
      `From: ${name} <${email}>`,
      `Category: ${category}`,
      ...(samplerSkus.length > 0 ? [`Sampler flight: ${samplerSkus.join(', ')}`] : []),
      '',
      message,
    ].join('\n'),
  });

  res.status(201).json({ inquiryId, status: 'received' });
});

export default router;
