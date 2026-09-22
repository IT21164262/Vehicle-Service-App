const { Service, validImageUrl } = require('../models/service.cjs');
const fs = require('node:fs/promises');
const { imagePathFromUrl } = require('../middleware/serviceUpload.cjs');
const fields = ['name', 'description', 'price', 'imageUrl', 'maxAppointmentsPerDay'];

function validateService(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a service object.' };
  if (Object.keys(body).some(key => !fields.includes(key))) return { error: 'Only name, description, price, imageUrl and maxAppointmentsPerDay are allowed.' };
  if (partial && !Object.keys(body).length) return { error: 'Provide at least one field to update.' };
  const data = {};
  for (const field of fields) {
    if (!Object.hasOwn(body, field)) {
      if (!partial && field !== 'imageUrl') return { error: `${field} is required.` };
      continue;
    }
    const value = body[field];
    if (field === 'name' || field === 'description') {
      const max = field === 'name' ? 120 : 2000;
      if (typeof value !== 'string' || !value.trim() || value.trim().length > max) return { error: `${field} must contain 1–${max} characters.` };
      data[field] = value.trim();
    } else if (field === 'price') {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return { error: 'Price must be a non-negative number.' };
      data[field] = value;
    } else if (field === 'maxAppointmentsPerDay') {
      if (!Number.isSafeInteger(value) || value < 1) return { error: 'Daily capacity must be a positive integer.' };
      data[field] = value;
    } else {
      if (typeof value !== 'string' || value.trim().length > 2048 || !validImageUrl(value.trim())) return { error: 'Image URL must be an HTTP or HTTPS URL, or empty.' };
      data[field] = value.trim();
    }
  }
  return { data };
}

function serialize(service) {
  return { id: service._id.toString(), name: service.name, description: service.description, price: service.price, imageUrl: service.imageUrl, maxAppointmentsPerDay: service.maxAppointmentsPerDay };
}

function failure(res, error) {
  if (error.name === 'ValidationError' || error.name === 'CastError' || error.name === 'StrictModeError') {
    return res.status(400).json({ message: 'Service data is invalid. Check the fields and try again.' });
  }
  return res.status(503).json({ message: 'Unable to access services. Please try again.' });
}

function validateId(req, res, next) {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.status(400).json({ message: 'Invalid service ID.' });
  next();
}

async function create(req, res) {
  const result = validateService(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    const service = await Service.create(result.data);
    return res.status(201).location(`/api/services/${service._id}`).json({ service: serialize(service) });
  } catch (error) { return failure(res, error); }
}

async function list(req, res) {
  try {
    const services = await Service.find().sort({ name: 1, _id: 1 });
    return res.json({ services: services.map(serialize) });
  } catch (error) { return failure(res, error); }
}

async function get(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    return res.json({ service: serialize(service) });
  } catch (error) { return failure(res, error); }
}

async function update(req, res) {
  const result = validateService(req.body, true);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, { $set: result.data }, { returnDocument: 'after', runValidators: true });
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    return res.json({ service: serialize(service) });
  } catch (error) { return failure(res, error); }
}

async function remove(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    // Required appointment milestone integration: reject referenced services with
    // 409 and coordinate booking creation/deletion to avoid a reference race.
    // There is no Appointment model in this project yet.
    await Service.deleteOne({ _id: service._id });
    const imagePath = imagePathFromUrl(service.imageUrl);
    if (imagePath) await fs.unlink(imagePath).catch(() => undefined);
    return res.status(204).end();
  } catch (error) { return failure(res, error); }
}

async function uploadImage(req, res) {
  if (!req.file) return res.status(400).json({ message: 'Select a JPEG, PNG or WebP image.' });
  try {
    const header = await fs.readFile(req.file.path);
    const jpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    const png = header.length >= 8 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = header.length >= 12 && header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!jpeg && !png && !webp) {
      await fs.unlink(req.file.path).catch(() => undefined);
      return res.status(400).json({ message: 'The selected file is not a valid JPEG, PNG or WebP image.' });
    }
    const service = await Service.findById(req.params.id);
    if (!service) {
      await fs.unlink(req.file.path).catch(() => undefined);
      return res.status(404).json({ message: 'Service not found.' });
    }
    const previousPath = imagePathFromUrl(service.imageUrl);
    const origin = (process.env.PUBLIC_API_ORIGIN || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const imageUrl = `${origin}/uploads/services/${req.file.filename}`;
    service.imageUrl = imageUrl;
    await service.save();
    if (previousPath && previousPath !== req.file.path) await fs.unlink(previousPath).catch(() => undefined);
    return res.json({ service: serialize(service) });
  } catch (error) {
    await fs.unlink(req.file.path).catch(() => undefined);
    return failure(res, error);
  }
}

module.exports = { create, list, get, update, remove, uploadImage, validateId, validateService };
