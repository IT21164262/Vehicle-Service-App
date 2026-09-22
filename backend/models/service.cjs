const mongoose = require('mongoose');

function validImageUrl(value) {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  price: { type: Number, required: true, min: 0, validate: Number.isFinite },
  imageUrl: { type: String, default: '', trim: true, maxlength: 2048, validate: validImageUrl },
    imagePublicId: { type: String, default: null },
    imageAssetId: { type: String, default: null },
  isPromoted: { type: Boolean, default: false },
  promoText: { type: String, default: '', trim: true, maxlength: 240 },
  promoImageUrl: { type: String, default: '', trim: true, maxlength: 2048, validate: validImageUrl },
    promoImagePublicId: { type: String, default: null },
    promoImageAssetId: { type: String, default: null },
  promoOrder: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
}, { timestamps: true, strict: 'throw' });

module.exports = { Service: mongoose.model('Service', serviceSchema), validImageUrl };
