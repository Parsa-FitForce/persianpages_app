import { Router, Request, Response } from 'express';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const S3_BUCKET = process.env.S3_UPLOADS_BUCKET;
const S3_REGION = process.env.S3_UPLOADS_REGION || 'us-east-1';
const useS3 = Boolean(S3_BUCKET);

// Local disk fallback directory
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('فقط فایل‌های تصویری مجاز هستند'));
  }
};

let upload: multer.Multer;

if (useS3) {
  // --- Production: S3 storage ---
  const s3 = new S3Client({ region: S3_REGION });

  upload = multer({
    storage: multerS3({
      s3,
      bucket: S3_BUCKET!,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `uploads/${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
  });

  console.log(`Upload storage: S3 (bucket: ${S3_BUCKET})`);
} else {
  // --- Development: local disk storage ---
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
      filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
  });

  console.log('Upload storage: local disk');
}

// Upload multiple images (max 6)
router.post(
  '/',
  authenticate,
  upload.array('photos', 6),
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'فایلی انتخاب نشده است' });
    }

    let urls: string[];
    if (useS3) {
      // multer-s3 adds `location` (full public URL) to each file
      urls = (files as (Express.Multer.File & { location: string })[]).map((f) => f.location);
    } else {
      urls = files.map((f) => `/uploads/${f.filename}`);
    }

    res.json({ urls });
  }
);

export { UPLOADS_DIR };
export default router;
