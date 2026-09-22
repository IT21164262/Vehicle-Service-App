const images = require('./cloudImages.cjs');

class ImageError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

async function replaceImage(Model, id, urlField, prefix, category, buffer) {
  const publicField = `${prefix}PublicId`, assetField = `${prefix}AssetId`;
  const previous = await Model.findById(id).select(`${urlField} ${publicField} ${assetField}`);
  if (!previous) throw new ImageError(404, 'Record not found.');
  const uploaded = await images.upload(buffer, category);
  // Compare-and-set protects overlapping replacements from deleting the winner's image.
  // Legacy records may lack the metadata fields entirely.
  const match = { _id: id, [urlField]: previous[urlField] || { $in: ['', null] }, [publicField]: previous[publicField] || null };
  // If MongoDB throws, the write outcome can be uncertain. Retain both assets for
  // reconciliation rather than risk deleting an image that was actually committed.
  const saved = await Model.findOneAndUpdate(match, { $set: {
    [urlField]: uploaded.url, [publicField]: uploaded.publicId, [assetField]: uploaded.assetId,
  } }, { returnDocument: 'after', runValidators: true });
  if (!saved) {
    await images.remove(uploaded.publicId);
    throw new ImageError(409, 'This image changed while uploading. Refresh and try again.');
  }
  await images.remove(previous[publicField]);
  return saved;
}

module.exports = { replaceImage, ImageError };
