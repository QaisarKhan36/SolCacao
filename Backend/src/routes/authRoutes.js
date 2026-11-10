// /api/auth - register, log in, read and update the signed-in account.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { requireAuth, signAccessToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimits.js';
import { createUser, findUserByEmail, findUserById, updateUser } from '../models/userModel.js';
import { HttpError } from '../utils/httpError.js';
import { splitName, toAccount } from '../utils/mappers.js';
import { Validator } from '../utils/validator.js';

const router = Router();
const BCRYPT_ROUNDS = 10;

// Compared against when the email does not exist, so a failed login takes the
// same time either way and does not reveal which emails have accounts.
const TIMING_GUARD_HASH = bcrypt.hashSync('solcacao-timing-guard', BCRYPT_ROUNDS);

const sessionResponse = user => ({
  accessToken: signAccessToken(user),
  tokenType: 'Bearer',
  expiresIn: config.jwt.expiresIn,
  user: toAccount(user),
});

// The frontend sends one "name"; the schema stores first_name / last_name.
const readName = validator => {
  const name = validator.string('name', { max: 121 });
  if (!name) return undefined;
  const { firstName, lastName } = splitName(name);
  if (firstName.length > 60 || lastName.length > 60) {
    return validator.fail('name', 'First and last name must each be at most 60 characters.');
  }
  return { firstName, lastName };
};

// Passwords are not trimmed. bcrypt only uses the first 72 bytes.
const readNewPassword = validator => {
  const password = validator.source.password;
  if (typeof password !== 'string' || password.length === 0) return validator.fail('password', 'password is required.');
  if (password.length < 8) return validator.fail('password', 'password must be at least 8 characters.');
  if (Buffer.byteLength(password) > 72) return validator.fail('password', 'password must be at most 72 bytes.');
  return password;
};

const duplicateEmail = error => error.code === 'ER_DUP_ENTRY';

router.post('/register', authLimiter, async (req, res) => {
  const validator = new Validator(req.body);
  const name = readName(validator);
  const email = validator.email('email');
  const password = readNewPassword(validator);
  const accountType = validator.oneOf('accountType', ['retail', 'b2b'], { required: false }) ?? 'retail';
  const isB2B = accountType === 'b2b';
  const companyName = validator.string('companyName', { required: isB2B, max: 120 });
  const taxId = validator.string('taxId', { required: isB2B, max: 30 });
  validator.assertValid();

  let userId;
  try {
    userId = await createUser({
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      ...name,
      role: accountType,
      companyName: isB2B ? companyName : null,
      taxId: isB2B ? taxId : null,
    });
  } catch (error) {
    if (duplicateEmail(error)) throw new HttpError(409, 'account_exists', 'An account with this email already exists.');
    throw error;
  }

  res.status(201).json(sessionResponse(await findUserById(userId)));
});

router.post('/login', authLimiter, async (req, res) => {
  const validator = new Validator(req.body);
  const email = validator.email('email');
  const password = typeof req.body?.password === 'string' && req.body.password
    ? req.body.password
    : validator.fail('password', 'password is required.');
  validator.assertValid();

  const user = await findUserByEmail(email);
  const passwordMatches = await bcrypt.compare(password, user?.password_hash ?? TIMING_GUARD_HASH);
  if (!user || !passwordMatches) {
    throw new HttpError(401, 'invalid_credentials', 'Email or password was not recognized.');
  }

  res.json(sessionResponse(user));
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toAccount(req.user) });
});

// Profile page: name and email for everyone, company name and tax ID for B2B.
router.patch('/me', requireAuth, async (req, res) => {
  const body = req.body ?? {};
  const validator = new Validator(body);
  const changes = {};

  if (body.name !== undefined) {
    const name = readName(validator);
    if (name) Object.assign(changes, { first_name: name.firstName, last_name: name.lastName });
  }
  if (body.email !== undefined) {
    const email = validator.email('email');
    if (email) changes.email = email;
  }
  if (req.user.role === 'b2b') {
    if (body.companyName !== undefined) changes.company_name = validator.string('companyName', { max: 120 });
    if (body.taxId !== undefined) changes.tax_id = validator.string('taxId', { max: 30 });
  }
  validator.assertValid();

  try {
    await updateUser(req.user.user_id, changes);
  } catch (error) {
    if (duplicateEmail(error)) throw new HttpError(409, 'account_exists', 'Another account already uses this email.');
    throw error;
  }

  res.json({ user: toAccount(await findUserById(req.user.user_id)) });
});

export default router;
