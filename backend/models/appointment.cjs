const mongoose = require('mongoose');

const statuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
const appointmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  vehicleNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 24 },
  appointmentDate: { type: Date, required: true, index: true },
  status: { type: String, enum: statuses, default: 'Pending', index: true },
}, { timestamps: true, strict: 'throw' });

appointmentSchema.index({ serviceId: 1, appointmentDate: 1, status: 1 });

module.exports = {
  Appointment: mongoose.model('Appointment', appointmentSchema),
  appointmentStatuses: statuses,
};
