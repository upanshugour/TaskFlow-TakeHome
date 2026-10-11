import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError.js';

export function authenticate(req, _res, next) {
  const authorization = req.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return next(new HttpError(401, 'UNAUTHORIZED', 'Authentication is required'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new HttpError(500, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured'));
  }

  try {
    const payload = jwt.verify(match[1], secret);
    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      throw new Error('Invalid token subject');
    }
    req.userId = payload.sub;
    return next();
  } catch {
    return next(new HttpError(401, 'INVALID_TOKEN', 'Authentication token is invalid or expired'));
  }
}
