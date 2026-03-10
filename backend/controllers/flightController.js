const { collectMonthlyFlights } = require('../services/flightService');
const { validateMonth } = require('../utils/dateUtils');
const { getPagination } = require('../utils/pagination');

function validateIata(code) {
  return /^[A-Z]{3}$/.test(code || '');
}

async function getFlights(req, res, next) {
  try {
    const origin = (req.query.from || '').toUpperCase();
    const destination = (req.query.to || '').toUpperCase();
    const month = req.query.month;
    const airline = req.query.airline ? req.query.airline.toUpperCase() : undefined;

    if (!validateIata(origin) || !validateIata(destination)) {
      return res.status(400).json({
        error: 'Invalid IATA code. Expected 3-letter airport codes in uppercase.',
      });
    }

    if (!validateMonth(month)) {
      return res.status(400).json({
        error: 'Invalid month format. Expected YYYY-MM.',
      });
    }

    if (airline && !/^[A-Z0-9]{2,3}$/.test(airline)) {
      return res.status(400).json({
        error: 'Invalid airline code.',
      });
    }

    const { page, limit } = getPagination(req.query);

    const result = await collectMonthlyFlights({
      origin,
      destination,
      month,
      airline,
      page,
      limit,
    });

    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getFlights,
};
