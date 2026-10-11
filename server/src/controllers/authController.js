import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import { HttpError } from '../utils/httpError.js';

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, 'AUTH_NOT_CONFIGURED', 'Authentication is not configured');
  }
  return secret;
}

function createToken(userId) {
  return jwt.sign({}, getJwtSecret(), { subject: userId.toString(), expiresIn: '1h' });
}

function serializeUser(user) {
  return { id: user._id.toString(), email: user.email };
}

export async function register(req, res) {
  const { email, password } = registerSchema.parse(req.body);
  getJwtSecret();
  const existingUser = await User.exists({ email });

  if (existingUser) {
    throw new HttpError(409, 'EMAIL_IN_USE', 'An account with that email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash });

  return res.status(201).json({
    data: { user: serializeUser(user), token: createToken(user._id) },
  });
}

export async function login(req, res) {
  const { email, password } = loginSchema.parse(req.body);
  getJwtSecret();
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  return res.status(200).json({
    data: { user: serializeUser(user), token: createToken(user._id) },
  });
}

export async function me(req, res) {
  const user = await User.findById(req.userId);
  if (!user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentication is required');
  }

  return res.status(200).json({ data: { user: serializeUser(user) } });
}
