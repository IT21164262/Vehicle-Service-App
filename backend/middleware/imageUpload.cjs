const multer = require('multer');

const types = new Set(['image/jpeg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, callback) => callback(types.has(file.mimetype) ? null : new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'), types.has(file.mimetype)),
}).single('image');

function handleImageUpload(req, res, next) {
  upload(req, res, error => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : 'Upload one JPEG, PNG or WebP image in the image field.' });
    const b = req.file?.buffer;
    if (!b) return res.status(400).json({ message: 'Select a JPEG, PNG or WebP image.' });
    const type = b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255 ? 'image/jpeg'
      : b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png'
      : b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : null;
    if (!type || type !== req.file.mimetype) return res.status(400).json({ message: 'The selected file is not a valid JPEG, PNG or WebP image.' });
    next();
  });
}
module.exports = { handleImageUpload };
