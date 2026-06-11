import { Router } from 'express';
import multer from 'multer';
import {
  ALLOWED_UPLOADS,
  MAX_UPLOAD_BYTES,
  UPLOADS_DIR,
  isMimeAllowed,
  newUploadId,
  registerUpload,
} from '../lib/uploads.js';

export const uploadsRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const id = newUploadId();
    const spec = ALLOWED_UPLOADS[file.mimetype];
    const ext = spec ? `.${spec.ext}` : '';
    // Stash the id on the file object so the handler can read it back.
    file.uploadId = id;
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (isMimeAllowed(file.mimetype)) return cb(null, true);
    const err = new Error(
      `Unsupported file type "${file.mimetype}". Allowed: ${Object.keys(ALLOWED_UPLOADS).join(', ')}.`,
    );
    err.code = 'unsupported_type';
    err.status = 415;
    err.expose = true;
    return cb(err, false);
  },
});

// POST /api/v1/ai-consultant/uploads
// multipart/form-data with a single "file" field.
// Returns { id, mimeType, size, filename }.
uploadsRouter.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      // Multer file-size errors land here with code 'LIMIT_FILE_SIZE'.
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: {
            code: 'file_too_large',
            message: `File exceeds the ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB limit.`,
          },
        });
      }
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({
        error: { code: 'no_file', message: 'No file uploaded. Send as multipart field "file".' },
      });
    }

    const meta = registerUpload({
      id: req.file.uploadId,
      mimeType: req.file.mimetype,
      size: req.file.size,
      filename: req.file.originalname,
      path: req.file.path,
    });

    res.status(200).json({
      id: meta.id,
      mimeType: meta.mimeType,
      size: meta.size,
      filename: meta.filename,
    });
  });
});
