const mongoose = require('mongoose');
const User = require('../models/user.cjs');

function serialize(item) {
  return { id: item._id.toString(), type: item.type, title: item.title, message: item.message, appointmentId: item.appointmentId.toString(), read: item.read, createdAt: item.createdAt.toISOString() };
}
async function list(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const all = [...(req.user.notifications || [])].sort((a, b) => b.createdAt - a.createdAt);
  const start = (page - 1) * limit;
  return res.json({ notifications: all.slice(start, start + limit).map(serialize), unreadCount: all.filter(item => !item.read).length, page, limit, total: all.length });
}
async function markRead(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid notification ID.' });
  const user = await User.findById(req.user._id);
  const notification = user?.notifications.id(req.params.id);
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  notification.read = true;
  await user.save();
  return res.json({ notification: serialize(notification) });
}
async function markAllRead(req, res) {
  await User.updateOne({ _id: req.user._id }, { $set: { 'notifications.$[].read': true } });
  return res.json({ message: 'Notifications marked as read.' });
}
module.exports = { list, markRead, markAllRead };
