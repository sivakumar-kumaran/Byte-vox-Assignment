import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { AuthRequest } from '../middleware/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body ?? {};

    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !EMAIL_RE.test(email))
      return res.status(400).json({ error: 'Valid email is required' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length)
      return res.status(409).json({ error: 'An account with that email already exists' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query<{ id: string; name: string; email: string; created_at: Date }>(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [email.toLowerCase(), hash, name.trim()]
    );

    const user = result.rows[0];
    const token = signToken(user.id);

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const result = await pool.query<{
      id: string; name: string; email: string; password_hash: string;
    }>(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    // Use constant-time comparison to avoid timing attacks even when user doesn't exist
    const hash = user?.password_hash ?? '$2a$12$invalidhashforconstanttimex';
    const match = await bcrypt.compare(password, hash);

    if (!user || !match)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
}

function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign({ userId }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']) || '7d',
  });
}
