// /api/localization - the EN/ES dictionary stored in the LOCALIZATION and
// TRANSLATION tables (same keys the frontend's t('key') function uses).
import { Router } from 'express';
import { findLanguage, getTranslations, listLanguages } from '../models/localizationModel.js';
import { HttpError } from '../utils/httpError.js';

const router = Router();

const cacheFiveMinutes = res => res.set('Cache-Control', 'public, max-age=300');

// GET /api/localization -> { languages: [{ code: 'en', name: 'English' }, ...] }
router.get('/', async (req, res) => {
  const rows = await listLanguages();
  cacheFiveMinutes(res);
  res.json({ languages: rows.map(row => ({ code: row.lang_code, name: row.locale_name })) });
});

// GET /api/localization/es -> { lang: 'es', translations: { navContact: 'Contacto', ... } }
router.get('/:lang', async (req, res) => {
  const lang = req.params.lang.toLowerCase();
  const language = /^[a-z]{2}$/.test(lang) ? await findLanguage(lang) : null;
  if (!language) throw new HttpError(404, 'language_not_found', 'Supported languages are en and es.');

  const rows = await getTranslations(lang);
  cacheFiveMinutes(res);
  res.json({
    lang,
    name: language.locale_name,
    translations: Object.fromEntries(rows.map(row => [row.tkey, row.tvalue])),
  });
});

export default router;
