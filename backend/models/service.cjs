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
  maxAppointmentsPerDay: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
}, { timestamps: true, strict: 'throw' });

module.exports = { Service: mongoose.model('Service', serviceSchema), validImageUrl };
