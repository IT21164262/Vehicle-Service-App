const express = require('express');
const path = require('node:path');
const app = express();
// Render terminates HTTPS at its reverse proxy. Keep local defaults unchanged.
if (process.env.RENDER === 'true') app.set('trust proxy', 1);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use('/uploads/services', express.static(path.join(__dirname, 'uploads', 'services'), {
  fallthrough: false,
  index: false,
  redirect: false,
}));
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles'), { fallthrough: false, index: false, redirect: false }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
  next(error);
});
app.use('/api/auth', require('./routes/authRoutes.cjs'));
app.use('/api/auth/notifications', require('./routes/notificationRoutes.cjs'));
app.use('/api/services', require('./routes/serviceRoutes.cjs'));
app.use('/api/appointments', require('./routes/appointmentRoutes.cjs'));
app.get('/', (req, res) => res.json({ message: 'Backend is running!' }));
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'Unable to complete the request. Please try again.' });
});

module.exports = app;
