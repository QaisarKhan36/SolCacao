// Small request validator. It collects every problem in one pass and then
// throws a single 400 response that lists each field and what is wrong.
import { HttpError } from './httpError.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;

const isMissing = value => value === undefined || value === null || value === '';

export class Validator {
  constructor(source) {
    this.source = source && typeof source === 'object' ? source : {};
    this.errors = [];
  }

  fail(field, message) {
    this.errors.push({ field, message });
    return undefined;
  }

  // Returns the trimmed string, undefined if absent, or null if an optional
  // field was sent empty (used by PATCH to clear a value).
  string(field, { required = true, min = 0, max = Infinity } = {}) {
    const raw = this.source[field];
    if (isMissing(raw)) return required ? this.fail(field, `${field} is required.`) : (raw === undefined ? undefined : null);
    if (typeof raw !== 'string') return this.fail(field, `${field} must be text.`);

    const value = raw.trim();
    if (!value) return required ? this.fail(field, `${field} is required.`) : null;
    if (value.length < min) return this.fail(field, `${field} must be at least ${min} characters.`);
    if (value.length > max) return this.fail(field, `${field} must be at most ${max} characters.`);
    return value;
  }

  email(field, { required = true } = {}) {
    const value = this.string(field, { required, max: 190 });
    if (typeof value !== 'string') return value;
    if (!EMAIL_PATTERN.test(value)) return this.fail(field, `${field} must be a valid email address.`);
    return value.toLowerCase();
  }

  oneOf(field, allowed, { required = true } = {}) {
    const raw = this.source[field];
    if (isMissing(raw)) return required ? this.fail(field, `${field} is required.`) : undefined;
    if (!allowed.includes(raw)) return this.fail(field, `${field} must be one of: ${allowed.join(', ')}.`);
    return raw;
  }

  // Accepts numbers or numeric strings (multipart form fields are strings).
  number(field, { required = true, min = -Infinity, max = Infinity, integer = false } = {}) {
    const raw = this.source[field];
    if (isMissing(raw)) return required ? this.fail(field, `${field} is required.`) : undefined;

    const text = String(raw).trim();
    const value = Number(text);
    if (!NUMBER_PATTERN.test(text) || !Number.isFinite(value)) return this.fail(field, `${field} must be a number.`);
    if (integer && !Number.isInteger(value)) return this.fail(field, `${field} must be a whole number.`);
    if (value < min || value > max) return this.fail(field, `${field} must be between ${min} and ${max}.`);
    return value;
  }

  boolean(field, { required = true } = {}) {
    const raw = this.source[field];
    if (isMissing(raw)) return required ? this.fail(field, `${field} is required.`) : undefined;
    if (raw === true || raw === 'true') return true;
    if (raw === false || raw === 'false') return false;
    return this.fail(field, `${field} must be true or false.`);
  }

  assertValid() {
    if (this.errors.length > 0) {
      throw new HttpError(400, 'validation_error', 'Some fields are missing or invalid.', this.errors);
    }
  }
}
