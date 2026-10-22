import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import fs from 'fs';

const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure directory exists at startup
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Prevent path traversal; use timestamp + original extension only
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback) {
  const allowed = ['.csv', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    cb(new Error('Only CSV files are accepted'));
    return;
  }
  if (file.mimetype !== 'text/csv' && file.mimetype !== 'text/plain' && file.mimetype !== 'application/vnd.ms-excel') {
    cb(new Error('Only CSV files are accepted'));
    return;
  }
  cb(null, true);
}

const maxSizeMB = Number(process.env.MAX_FILE_SIZE_MB) || 10;

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeMB * 1024 * 1024,
    files: 1,
  },
});
