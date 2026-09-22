const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
  next(error);
});
app.use('/api/auth', require('./routes/authRoutes.cjs'));
app.use('/api/services', require('./routes/serviceRoutes.cjs'));
app.get('/', (req, res) => res.json({ message: 'Backend is running!' }));
app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'Unable to complete the request. Please try again.' });
});

module.exports = app;
