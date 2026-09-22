const { v2: cloudinary } = require('cloudinary');
const { randomUUID } = require('node:crypto');

function configure() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (![CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET].every(value => typeof value === 'string' && value.trim())) {
    throw new Error('Image storage is not configured.');
  }
  cloudinary.config({ cloud_name: CLOUDINARY_CLOUD_NAME, api_key: CLOUDINARY_API_KEY, api_secret: CLOUDINARY_API_SECRET, secure: true });
}

async function upload(buffer, category) {
  configure();
  const publicId = `autonexa/${category}/${randomUUID()}`;
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      resource_type: 'image', type: 'upload', public_id: publicId, overwrite: false,
      allowed_formats: ['jpg', 'png', 'webp'], timeout: 45000,
    }, (error, result) => {
      if (error || !result?.secure_url?.startsWith('https://') || result.public_id !== publicId || !result.asset_id) {
        // Do not expose provider responses (which may contain configuration details).
        reject(new Error('Unable to upload image.'));
      } else resolve({ url: result.secure_url, publicId: result.public_id, assetId: result.asset_id });
    });
    stream.on('error', () => reject(new Error('Unable to upload image.')));
    stream.end(buffer);
  });
}

async function remove(publicId) {
  // Only delete identifiers written by our signed upload flow, never parsed URLs.
  if (!/^autonexa\/(services|profiles|promotions)\/[a-f0-9-]{36}$/.test(publicId || '')) return;
  try {
    configure();
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', type: 'upload', invalidate: true, timeout: 10000 });
    if (!['ok', 'not found'].includes(result?.result)) throw new Error('Cleanup failed');
  } catch {
    // A cleanup failure must not undo a successfully saved replacement.
    console.warn('Cloudinary cleanup pending; review unreferenced AutoNexa assets.');
  }
}

module.exports = { upload, remove };
