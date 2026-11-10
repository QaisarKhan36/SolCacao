// /api/b2b - manufacturing quote requests from the B2B wizard (B2B accounts only).
import { Router } from 'express';
import { requireAuth, requireB2B } from '../middleware/auth.js';
import { discardUpload, uploadBrandVector } from '../middleware/upload.js';
import { createQuote, listQuotesForUser } from '../models/quoteModel.js';
import { notifyTeam } from '../services/mailer.js';
import { toQuote } from '../utils/mappers.js';
import { Validator } from '../utils/validator.js';

const router = Router();

// Estates offered in wizard step 1.
const ESTATES = ['Esmeraldas, Ecuador', 'Piura Blanco, Peru', 'Sambirano, Madagascar'];
const ROASTS = ['light', 'medium', 'dark'];

// Wizard labels -> packaging_tier ENUM values from the Phase 1 schema.
const PACKAGING_TIERS = {
  'Standard Kraft': 'standard',
  'Luxury Rigid Box': 'premium',
  'Custom Foil Stamped': 'custom',
  standard: 'standard',
  premium: 'premium',
  custom: 'custom',
};

// POST /api/b2b/quote  (multipart/form-data)
// Fields: origin, targetPercentage, roast, moldRequired, packagingTier, estimatedUnits
// File:   brandVector (optional; AI, PDF, SVG or EPS up to 10 MB)
// Sign-in and the B2B role are checked BEFORE the upload, so a rejected
// request never writes a file to disk.
router.post('/quote', requireAuth, requireB2B, uploadBrandVector, async (req, res) => {
  try {
    const validator = new Validator(req.body);
    const origin = validator.oneOf('origin', ESTATES);
    const targetPercentage = validator.number('targetPercentage', { min: 0, max: 100 });
    const roast = validator.oneOf('roast', ROASTS);
    const moldRequired = validator.boolean('moldRequired', { required: false }) ?? false;
    const packagingInput = validator.oneOf('packagingTier', Object.keys(PACKAGING_TIERS));
    const estimatedUnits = validator.number('estimatedUnits', { min: 1, max: 10_000_000, integer: true });
    validator.assertValid();

    const user = req.user;
    const percentage = Math.round(targetPercentage * 10) / 10; // DECIMAL(5,1)
    const companyName = user.company_name || `${user.first_name} ${user.last_name}`.trim();
    const quoteId = await createQuote({
      userId: user.user_id,
      companyName,
      origin,
      targetPercentage: percentage,
      roast,
      moldRequired,
      // Readable summary in the Phase 1 free-text column.
      cacaoProfile: `${percentage}% ${origin}, ${roast} roast${moldRequired ? ', custom 3D mold' : ''}`,
      packagingTier: PACKAGING_TIERS[packagingInput],
      estimatedUnits,
      vectorLogoUrl: req.file ? `/uploads/brand-vectors/${req.file.filename}` : null,
      vectorOriginalName: req.file ? req.file.originalname.slice(0, 255) : null,
    });

    void notifyTeam({
      subject: `New B2B quote request #${quoteId} - ${companyName}`,
      replyTo: user.email,
      text: [
        `Company: ${companyName} (${user.email})`,
        `Origin: ${origin}`,
        `Target cacao: ${percentage}%`,
        `Roast: ${roast}`,
        `Custom mold: ${moldRequired ? 'yes' : 'no'}`,
        `Packaging: ${packagingInput}`,
        `Estimated units: ${estimatedUnits}`,
        `Tech pack: ${req.file ? req.file.originalname : 'none'}`,
      ].join('\n'),
    });

    res.status(201).json({ quoteId, status: 'pending' });
  } catch (error) {
    await discardUpload(req.file); // do not keep files from failed requests
    throw error;
  }
});

// GET /api/b2b/quotes - the signed-in company's own quote requests and their status.
router.get('/quotes', requireAuth, requireB2B, async (req, res) => {
  const rows = await listQuotesForUser(req.user.user_id);
  res.json({ quotes: rows.map(toQuote) });
});

export default router;
