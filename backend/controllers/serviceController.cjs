const { Service, validImageUrl } = require('../models/service.cjs');
const { replaceImage, ImageError } = require('../services/replaceImage.cjs');
const cloudImages = require('../services/cloudImages.cjs');
const { Appointment } = require('../models/appointment.cjs');
const fields = ['name', 'description', 'price', 'imageUrl', 'isPromoted', 'promoText', 'promoImageUrl', 'promoOrder'];

function validateService(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide a service object.' };
  if (Object.keys(body).some(key => !fields.includes(key))) return { error: 'Unsupported service fields were provided.' };
  if (partial && !Object.keys(body).length) return { error: 'Provide at least one field to update.' };
  const data = {};
  for (const field of fields) {
    if (!Object.hasOwn(body, field)) {
      if (!partial && !['imageUrl', 'isPromoted', 'promoText', 'promoImageUrl', 'promoOrder'].includes(field)) return { error: `${field} is required.` };
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
    } else if (field === 'isPromoted') {
      if (typeof value !== 'boolean') return { error: 'Promotion status must be true or false.' };
      data[field] = value;
    } else if (field === 'promoOrder') {
      if (!Number.isSafeInteger(value) || value < 0) return { error: 'Promotion order must be a non-negative integer.' };
      data[field] = value;
    } else if (field === 'promoText') {
      if (typeof value !== 'string' || value.trim().length > 240) return { error: 'Promotion text must be 240 characters or fewer.' };
      data[field] = value.trim();
    } else {
      if (typeof value !== 'string' || value.trim().length > 2048 || !validImageUrl(value.trim())) return { error: 'Image URL must be an HTTP or HTTPS URL, or empty.' };
      data[field] = value.trim();
    }
  }
  return { data };
}

function serialize(service) {
  return { id: service._id.toString(), name: service.name, description: service.description, price: service.price, imageUrl: service.imageUrl, isPromoted: service.isPromoted, promoText: service.promoText, promoImageUrl: service.promoImageUrl, promoOrder: service.promoOrder };
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
    const filter = { isDeleted: { $ne: true } };
    if (typeof req.query.search === 'string' && req.query.search.trim()) filter.name = { $regex: req.query.search.trim().slice(0, 80), $options: 'i' };
    if (req.query.promoted === 'true') filter.isPromoted = true;
    const sortField = req.query.sort || 'name';
    if (!['name', 'price'].includes(sortField)) return res.status(400).json({ message: 'Sort must be name or price.' });
    const order = req.query.order || 'asc';
    if (!['asc', 'desc'].includes(order)) return res.status(400).json({ message: 'Order must be asc or desc.' });
    const priceMin = req.query.priceMin === undefined ? null : Number(req.query.priceMin);
    const priceMax = req.query.priceMax === undefined ? null : Number(req.query.priceMax);
    if ((priceMin !== null && (!Number.isFinite(priceMin) || priceMin < 0)) || (priceMax !== null && (!Number.isFinite(priceMax) || priceMax < 0)) || (priceMin !== null && priceMax !== null && priceMin > priceMax)) {
      return res.status(400).json({ message: 'Price filters must be non-negative numbers with priceMin no greater than priceMax.' });
    }
    if (priceMin !== null || priceMax !== null) filter.price = { ...(priceMin !== null ? { $gte: priceMin } : {}), ...(priceMax !== null ? { $lte: priceMax } : {}) };
    const direction = order === 'desc' ? -1 : 1;
    const services = await Service.find(filter).sort({ [sortField]: direction, _id: 1 });
    return res.json({ services: services.map(serialize) });
  } catch (error) { return failure(res, error); }
}

async function promoted(req, res) {
  try {
    const services = await Service.find({ isPromoted: true, isDeleted: { $ne: true } }).sort({ promoOrder: 1, name: 1, _id: 1 });
    return res.json({ services: services.map(serialize) });
  } catch (error) { return failure(res, error); }
}

async function popular(req, res) {
  try {
    const rows = await Appointment.aggregate([
      { $match: { status: { $in: ['Confirmed', 'Completed'] } } },
      { $group: { _id: '$serviceId', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1, _id: 1 } },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $match: { 'service.isDeleted': { $ne: true } } },
      { $limit: 20 },
    ]);
    return res.json({ services: rows.map(row => ({ ...serialize(row.service), bookingCount: row.bookingCount })) });
  } catch (error) { return failure(res, error); }
}

async function recent(req, res) {
  if (req.user.isAdmin) return res.json({ services: [] });
  try {
    const rows = await Appointment.aggregate([
      { $match: { userId: req.user._id, status: 'Completed' } },
      { $sort: { appointmentDate: -1, _id: -1 } },
      { $group: { _id: '$serviceId', appointmentDate: { $first: '$appointmentDate' } } },
      { $sort: { appointmentDate: -1, _id: 1 } },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'service' } },
      { $unwind: '$service' },
      { $match: { 'service.isDeleted': { $ne: true } } },
    ]);
    return res.json({ services: rows.map(row => ({ ...serialize(row.service), appointmentDate: row.appointmentDate.toISOString() })) });
  } catch (error) { return failure(res, error); }
}

async function get(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || service.isDeleted) return res.status(404).json({ message: 'Service not found.' });
    return res.json({ service: serialize(service) });
  } catch (error) { return failure(res, error); }
}

async function update(req, res) {
  const result = validateService(req.body, true);
  if (result.error) return res.status(400).json({ message: result.error });
  try {
    const previous = await Service.findById(req.params.id);
    if (!previous || previous.isDeleted) return res.status(404).json({ message: 'Service not found.' });
    const match = { _id: req.params.id, isDeleted: { $ne: true } };
    for (const prefix of ['image', 'promoImage']) {
      const field = `${prefix}Url`;
      if (Object.hasOwn(result.data, field)) {
        match[field] = previous[field] || { $in: ['', null] };
        if (result.data[field] !== previous[field]) {
          // Manually entered URLs do not prove Cloudinary asset ownership.
          // Retain old assets for reconciliation; never delete by parsing a URL.
          result.data[`${prefix}PublicId`] = null;
          result.data[`${prefix}AssetId`] = null;
        }
      }
    }
    const service = await Service.findOneAndUpdate(match, { $set: result.data }, { returnDocument: 'after', runValidators: true });
    if (!service) return res.status(409).json({ message: 'The service changed. Refresh and try again.' });
    return res.json({ service: serialize(service) });
  } catch (error) { return failure(res, error); }
}

async function remove(req, res) {
  try {
    const service = await Service.findById(req.params.id);
    if (!service || service.isDeleted) return res.status(404).json({ message: 'Service not found.' });
    if (await Appointment.exists({ serviceId: service._id, status: { $in: ['Pending', 'Confirmed'] } })) {
      return res.status(409).json({ message: 'Cannot delete a service with Pending or Confirmed appointments. Complete or cancel those bookings first.' });
    }
    if (await Appointment.exists({ serviceId: service._id })) {
      // Retain the service record and its images for appointment history.
      await Service.updateOne({ _id: service._id }, { $set: { isDeleted: true, isPromoted: false } });
      return res.status(204).end();
    }
    await Service.deleteOne({ _id: service._id });
    await cloudImages.remove(service.imagePublicId);
    await cloudImages.remove(service.promoImagePublicId);
    return res.status(204).end();
  } catch (error) { return failure(res, error); }
}

async function upload(req, res, urlField, prefix, category) {
  if (!req.file?.buffer) return res.status(400).json({ message: 'Select a JPEG, PNG or WebP image.' });
  try {
    const service = await replaceImage(Service, req.params.id, urlField, prefix, category, req.file.buffer);
    return res.json({ service: serialize(service) });
  } catch (error) {
    return res.status(error instanceof ImageError ? error.status : 503).json({ message: error instanceof ImageError ? error.message : 'Unable to save image. Please try again.' });
  }
}
function uploadImage(req, res) { return upload(req, res, 'imageUrl', 'image', 'services'); }
function uploadPromoImage(req, res) { return upload(req, res, 'promoImageUrl', 'promoImage', 'promotions'); }

module.exports = { create, list, promoted, popular, recent, get, update, remove, uploadImage, uploadPromoImage, validateId, validateService };
