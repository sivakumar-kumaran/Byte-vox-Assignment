import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { User } from '../types';

export interface AuthRequest extends Request {
  user?: User;
}

/** JWT authentication middleware — attaches req.user or returns 401 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
    return;
  }

  let payload: { userId: string };
  try {
    payload = jwt.verify(token, secret) as { userId: string };
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const { rows } = await pool.query<User>(
      'SELECT id, email, name, created_at FROM users WHERE id = $1',
      [payload.userId]
    );
    if (!rows[0]) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}
