// JWT sign-in tokens. The frontend stores the token as `solcacao_access_token`
// and sends it as `Authorization: Bearer <token>`.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { findUserById } from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';

const ISSUER = 'solcacao-api';

export const signAccessToken = user => jwt.sign(
  { role: user.role },
  config.jwt.secret,
  { subject: String(user.user_id), expiresIn: config.jwt.expiresIn, issuer: ISSUER, algorithm: 'HS256' },
);

const readBearerToken = req => {
  const [scheme, token] = (req.get('authorization') ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token.trim() : null;
};

// Returns the user row for a valid token, or null for an invalid/expired one.
// The user is re-read from the database so deleted accounts lose access.
const userFromToken = async token => {
  try {
    const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'], issuer: ISSUER });
    return await findUserById(Number(payload.sub));
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null; // includes TokenExpiredError
    throw error;
  }
};

export const requireAuth = async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) throw new HttpError(401, 'missing_access_token', 'Sign in to continue.');

  const user = await userFromToken(token);
  if (!user) throw new HttpError(401, 'invalid_token', 'Your session has expired. Sign in again.');

  req.user = user;
  next();
};

// For public endpoints (Contact form): link the request to the account when a
// valid token is sent, otherwise continue as a guest.
export const optionalAuth = async (req, res, next) => {
  const token = readBearerToken(req);
  if (token) req.user = (await userFromToken(token)) ?? undefined;
  next();
};

export const requireB2B = (req, res, next) => {
  if (req.user?.role !== 'b2b') {
    throw new HttpError(403, 'b2b_account_required', 'Only B2B accounts can request manufacturing quotes.');
  }
  next();
};

// Reports are for the SolCacao team: they need the X-Admin-Key header.
export const requireAdminKey = (req, res, next) => {
  if (!config.adminApiKey) {
    throw new HttpError(503, 'reports_disabled', 'Reports are disabled. Set ADMIN_API_KEY in .env to enable them.');
  }
  const provided = Buffer.from(req.get('x-admin-key') ?? '');
  const expected = Buffer.from(config.adminApiKey);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new HttpError(401, 'invalid_admin_key', 'A valid X-Admin-Key header is required.');
  }
  next();
};
