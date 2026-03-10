require('dotenv').config();

const express = require('express');
const rateLimit = require('express-rate-limit');

const flightRoutes = require('./backend/routes/flightRoutes');
const db = require('./backend/db');

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please try again later.',
  },
});

app.use(express.json());
app.use(limiter);
app.use('/', flightRoutes);

app.get('/health', async (req, res) => {
  await db.query('SELECT 1');
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  if (err.response?.data) {
    return res.status(err.response.status || 502).json({
      error: 'Amadeus API error',
      details: err.response.data,
    });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

const port = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
