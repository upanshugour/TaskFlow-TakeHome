import mongoose from 'mongoose';
import { ZodError } from 'zod';

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.issues.map(({ path, message }) => ({ path, message })),
      },
    });
  }

  if (err instanceof mongoose.Error.ValidationError || err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
    });
  }

  if (err?.code === 11000) {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with that value already exists' },
    });
  }

  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: { code: err.code || 'REQUEST_ERROR', message: err.message },
    });
  }

  if (err?.status === 500 && err.code === 'AUTH_NOT_CONFIGURED') {
    return res.status(500).json({
      error: { code: err.code, message: err.message },
    });
  }

  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
