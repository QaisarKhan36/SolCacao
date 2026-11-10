// Tech-pack upload for the B2B wizard (field name: brandVector).
// Rules match the frontend: AI, PDF, SVG or EPS, at most 10 MB, optional.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config.js';
import { HttpError } from '../utils/httpError.js';

export const BRAND_VECTOR_DIR = path.join(config.uploadsDir, 'brand-vectors');
export const MAX_BRAND_VECTOR_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.ai', '.pdf', '.svg', '.eps'];

const storage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, BRAND_VECTOR_DIR),
  // Never trust the uploaded name: store under a random name, keep only the extension.
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomUUID()}${extension}`);
  },
});

const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_BRAND_VECTOR_BYTES, files: 1, fields: 20, fieldSize: 10 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      callback(new HttpError(400, 'invalid_file_type', 'The tech pack must be an AI, PDF, SVG or EPS file.'));
      return;
    }
    callback(null, true);
  },
});

// Checks the first bytes of the file, so a renamed .exe or .html is rejected
// even if its name ends in .pdf.
const contentMatchesExtension = (extension, head) => {
  const text = head.toString('latin1');
  switch (extension) {
    case '.pdf':
      return text.startsWith('%PDF-');
    case '.ai': // Illustrator files are PDF- or PostScript-based
      return text.startsWith('%PDF-') || text.startsWith('%!PS');
    case '.eps':
      return text.startsWith('%!PS') || (head.length >= 4 && head.readUInt32BE(0) === 0xC5D0D3C6);
    case '.svg':
      return /<svg[\s>]/i.test(head.toString('utf8'));
    default:
      return false;
  }
};

export const discardUpload = async file => {
  if (file?.path) await fs.rm(file.path, { force: true });
};

const verifyBrandVector = async (req, res, next) => {
  if (!req.file) return next();

  const handle = await fs.open(req.file.path, 'r');
  let head;
  try {
    const { buffer, bytesRead } = await handle.read(Buffer.alloc(4096), 0, 4096, 0);
    head = buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }

  const extension = path.extname(req.file.originalname).toLowerCase();
  if (!contentMatchesExtension(extension, head)) {
    await discardUpload(req.file);
    throw new HttpError(400, 'invalid_file_content', 'The file content does not match its AI, PDF, SVG or EPS extension.');
  }
  next();
};

export const uploadBrandVector = [multerUpload.single('brandVector'), verifyBrandVector];
