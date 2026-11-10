// Every error leaves the API in the same JSON shape: { code, message, details? }.
// The frontend reads `code` (for example 'invalid_credentials').
import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

export const notFound = (req, res) => {
  res.status(404).json({ code: 'not_found', message: `No route for ${req.method} ${req.path}.` });
};

// Express recognizes error handlers by their four parameters.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json({
      code: tooLarge ? 'file_too_large' : 'invalid_upload',
      message: tooLarge ? 'The file must be 10 MB or smaller.' : `Upload rejected: ${error.message}.`,
    });
    return;
  }

  // Errors from express.json(): bad JSON, body too large, and so on.
  if (error.expose && error.status >= 400 && error.status < 500) {
    const badJson = error.type === 'entity.parse.failed';
    res.status(error.status).json({
      code: badJson ? 'invalid_json' : error.type?.replace(/\./g, '_') ?? 'bad_request',
      message: badJson ? 'The request body is not valid JSON.' : error.message,
    });
    return;
  }

  console.error(error);
  res.status(500).json({ code: 'internal_error', message: 'Something went wrong on the server.' });
};
