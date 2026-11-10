// Limits repeated requests from one network on the public endpoints that
// attackers target most: sign-in (password guessing) and the contact form (spam).
import { rateLimit } from 'express-rate-limit';
import { config } from '../config.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

const createLimiter = (limit, message) => rateLimit({
  windowMs: FIFTEEN_MINUTES,
  limit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => config.env === 'test',
  handler: (req, res) => res.status(429).json({ code: 'too_many_requests', message }),
});

export const authLimiter = createLimiter(20, 'Too many sign-in attempts. Try again in a few minutes.');
export const inquiryLimiter = createLimiter(10, 'Too many inquiries were sent from this network. Try again later.');
