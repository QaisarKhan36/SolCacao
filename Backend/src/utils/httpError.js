// An error that already knows its HTTP status and the machine-readable code
// the frontend checks (for example 'invalid_credentials' or 'account_exists').
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
