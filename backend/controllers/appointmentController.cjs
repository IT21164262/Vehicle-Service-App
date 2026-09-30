const mongoose = require('mongoose');
const { Appointment, appointmentStatuses } = require('../models/appointment.cjs');
const User = require('../models/user.cjs');
const { Service } = require('../models/service.cjs');

const fields = ['userId', 'serviceId', 'vehicleNumber', 'appointmentDate', 'status'];
const transitions = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Completed', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

function validId(value) { return typeof value === 'string' && mongoose.isValidObjectId(value); }
function dayStart(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}
function validateInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Provide an appointment object.' };
  if (Object.keys(body).some(key => !fields.includes(key))) return { error: 'Only userId, serviceId, vehicleNumber, appointmentDate and status are allowed.' };
  if (partial && !Object.keys(body).length) return { error: 'Provide at least one field to update.' };
  const data = {};
  if (Object.hasOwn(body, 'userId')) {
    if (!validId(body.userId)) return { error: 'Invalid user ID.' };
    data.userId = body.userId;
  } else if (!partial) data.userId = null;
  if (Object.hasOwn(body, 'serviceId')) {
    if (!validId(body.serviceId)) return { error: 'Invalid service ID.' };
    data.serviceId = body.serviceId;
  } else if (!partial) data.serviceId = null;
  if (Object.hasOwn(body, 'vehicleNumber')) {
    if (typeof body.vehicleNumber !== 'string' || !/^[A-Z0-9 -]{2,24}$/i.test(body.vehicleNumber.trim())) return { error: 'Vehicle number must contain 2–24 letters, numbers, spaces or hyphens.' };
    data.vehicleNumber = body.vehicleNumber.trim().toUpperCase();
  } else if (!partial) data.vehicleNumber = null;
  if (Object.hasOwn(body, 'appointmentDate')) {
    const date = new Date(body.appointmentDate);
    if (!Number.isFinite(date.getTime())) return { error: 'Appointment date must be valid.' };
    if (dayStart(date) < dayStart(new Date())) return { error: 'Appointment date cannot be in the past.' };
    data.appointmentDate = dayStart(date);
  } else if (!partial) data.appointmentDate = null;
  if (Object.hasOwn(body, 'status')) {
    if (!appointmentStatuses.includes(body.status)) return { error: 'Invalid appointment status.' };
    data.status = body.status;
  }
  return { data };
}
function serialize(appointment) {
  const serviceId = appointment.serviceId?._id || appointment.serviceId;
  return {
    id: appointment._id.toString(),
    userId: appointment.userId.toString(),
    serviceId: serviceId.toString(),
    serviceName: appointment.serviceId?.name || 'Service unavailable',
    vehicleNumber: appointment.vehicleNumber,
    appointmentDate: appointment.appointmentDate.toISOString(),
    status: appointment.status,
  };
}
function safeFailure(res, error) {
  if (error?.name === 'ValidationError' || error?.name === 'CastError' || error?.name === 'StrictModeError') return res.status(400).json({ message: 'Appointment data is invalid.' });
  return res.status(503).json({ message: 'Unable to access appointments. Please try again.' });
}
function validateId(req, res, next) {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid appointment ID.' });
  next();
}
async function create(req, res) {
  const result = validateInput(req.body);
  if (result.error) return res.status(400).json({ message: result.error });
  if (result.data.userId !== req.user._id.toString()) return res.status(403).json({ message: 'You can only create your own appointments.' });
  try {
    const [user, service] = await Promise.all([User.findById(req.user._id).select('_id name'), Service.findOne({ _id: result.data.serviceId, isDeleted: { $ne: true } }).select('_id name')]);
    if (!user) return res.status(401).json({ message: 'Authentication required.' });
    if (!service) return res.status(404).json({ message: 'Service not found.' });
    const appointment = await Appointment.create(result.data);
    try {
      const administrators = await User.find({ isAdmin: true }).select('_id notifications');
      const notification = {
        type: 'appointment.created',
        title: 'New appointment request',
        message: `${user.name} requested ${service.name} for ${appointment.appointmentDate.toLocaleDateString()}.`,
        appointmentId: appointment._id,
        read: false,
        createdAt: new Date(),
      };
      for (const administrator of administrators) {
        if (administrator.notifications.some(item => item.appointmentId?.toString() === appointment._id.toString() && item.type === notification.type)) continue;
        administrator.notifications.push(notification);
        if (administrator.notifications.length > 100) administrator.notifications = administrator.notifications.slice(-100);
        await administrator.save();
      }
      console.log(`Created appointment notification for ${administrators.length} administrator account(s).`);
    } catch (notificationError) {
      console.error('Appointment created but administrator notification failed:', notificationError.name);
    }
    return res.status(201).json({ appointment: serialize(appointment) });
  } catch (error) { return safeFailure(res, error); }
}
async function list(req, res) {
  try {
    const filter = req.user.isAdmin ? {} : { userId: req.user._id };
    const appointments = await Appointment.find(filter).populate('serviceId', 'name').sort({ appointmentDate: 1, _id: 1 });
    return res.json({ appointments: appointments.map(item => serialize(item)) });
  } catch (error) { return safeFailure(res, error); }
}
async function get(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('serviceId', 'name');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
    if (!req.user.isAdmin && appointment.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You cannot access this appointment.' });
    return res.json({ appointment: serialize(appointment) });
  } catch (error) { return safeFailure(res, error); }
}
async function update(req, res) {
  const result = validateInput(req.body, true);
  if (result.error) return res.status(400).json({ message: result.error });
  if (Object.hasOwn(result.data, 'status')) return res.status(403).json({ message: 'Customers cannot change appointment status.' });
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
    if (appointment.userId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'You cannot modify this appointment.' });
    if (appointment.status !== 'Pending') return res.status(409).json({ message: 'Only Pending appointments can be edited.' });
    if (Object.hasOwn(result.data, 'userId') && result.data.userId !== req.user._id.toString()) return res.status(403).json({ message: 'You cannot change appointment ownership.' });
    if (result.data.serviceId) {
      const service = await Service.exists({ _id: result.data.serviceId, isDeleted: { $ne: true } });
      if (!service) return res.status(404).json({ message: 'Service not found.' });
    }
    Object.assign(appointment, result.data);
    await appointment.save();
    return res.json({ appointment: serialize(appointment) });
  } catch (error) { return safeFailure(res, error); }
}
async function remove(req, res) {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
    const ownsAppointment = appointment.userId.toString() === req.user._id.toString();
    if (!ownsAppointment) return res.status(403).json({ message: 'You cannot delete this appointment.' });
    if (appointment.status !== 'Pending') return res.status(409).json({ message: 'Only Pending appointments can be deleted.' });
    const result = await Appointment.deleteOne({ _id: appointment._id, status: 'Pending' });
    if (!result.deletedCount) return res.status(409).json({ message: 'The appointment changed. Refresh and try again.' });
    return res.status(204).end();
  } catch (error) { return safeFailure(res, error); }
}
async function changeStatus(req, res) {
  const nextStatus = req.body?.status;
  if (!appointmentStatuses.includes(nextStatus)) return res.status(400).json({ message: 'Invalid appointment status.' });
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
    const previousStatus = appointment.status;
    if (!transitions[previousStatus].includes(nextStatus)) return res.status(409).json({ message: `Cannot change ${previousStatus} appointment to ${nextStatus}.` });
    appointment.status = nextStatus;
    await appointment.save();
    const notificationText = {
      Confirmed: ['Appointment confirmed', 'Your appointment has been confirmed.'],
      Cancelled: ['Appointment cancelled', 'Your appointment has been cancelled.'],
      Completed: ['Appointment completed', 'Your appointment has been marked completed.'],
    }[nextStatus];
    if (notificationText) {
      await User.updateOne(
        { _id: appointment.userId, notifications: { $not: { $elemMatch: { appointmentId: appointment._id, type: `appointment.${nextStatus.toLowerCase()}` } } } },
        { $push: { notifications: { $each: [{ type: `appointment.${nextStatus.toLowerCase()}`, title: notificationText[0], message: notificationText[1], appointmentId: appointment._id, read: false, createdAt: new Date() }], $slice: -100 } } },
      );
    }
    return res.json({ appointment: serialize(appointment) });
  } catch (error) { return safeFailure(res, error); }
}
async function hasReferences(serviceId) { return Appointment.exists({ serviceId }); }
module.exports = { create, list, get, update, remove, changeStatus, validateId, validateInput, hasReferences };
