import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Multer errors (file size, wrong type, etc.)
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: `File too large. Maximum allowed size is ${process.env.MAX_FILE_SIZE_MB || 10} MB.`,
      });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  // Custom file-type error from multer fileFilter
  if (err.message?.includes('Only CSV')) {
    res.status(415).json({ error: err.message });
    return;
  }

  // Validation errors we throw explicitly
  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  // Log unexpected errors but don't leak internals
  console.error('[Error]', err);
  res.status(500).json({ error: 'An unexpected server error occurred' });
}

/** Throw this to produce a 400 validation error */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
