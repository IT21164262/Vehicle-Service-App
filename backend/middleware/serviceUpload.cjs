const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const uploadDirectory = path.join(__dirname, '..', 'uploads', 'services');
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => callback(null, `${crypto.randomUUID()}${allowedTypes.get(file.mimetype) || ''}`),
});

const uploadServiceImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) return callback(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
    callback(null, true);
  },
}).single('image');

function handleServiceUpload(req, res, next) {
  uploadServiceImage(req, res, error => {
    if (!error) return next();
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'Image must be 5 MB or smaller.' });
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ message: 'Upload one JPEG, PNG or WebP image in the image field.' });
    }
    return res.status(400).json({ message: 'The image upload could not be processed.' });
  });
}

function imagePathFromUrl(imageUrl) {
  if (typeof imageUrl !== 'string') return null;
  let pathname = imageUrl;
  try { pathname = new URL(imageUrl).pathname; } catch { /* Relative upload paths are also supported. */ }
  if (!pathname.startsWith('/uploads/services/')) return null;
  const filename = path.basename(pathname);
  const resolved = path.resolve(uploadDirectory, filename);
  return resolved.startsWith(path.resolve(uploadDirectory) + path.sep) ? resolved : null;
}

module.exports = { uploadDirectory, handleServiceUpload, imagePathFromUrl };
