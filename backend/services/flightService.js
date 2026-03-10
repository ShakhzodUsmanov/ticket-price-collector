const db = require('../db');
const { getMonthDates } = require('../utils/dateUtils');
const { searchFlightOffers, normalizeOffer } = require('./amadeusService');

const inMemoryFetchCache = new Map();

async function getCachedFlightsByDate(origin, destination, date) {
  const result = await db.query(
    `SELECT date, airline, flight_number, departure_time, arrival_time, price
     FROM flights
     WHERE origin = $1 AND destination = $2 AND date = $3
     ORDER BY departure_time ASC`,
    [origin, destination, date]
  );

  return result.rows;
}

async function insertFlights(origin, destination, flights) {
  if (!flights.length) {
    return;
  }

  const values = [];
  const placeholders = flights
    .map((flight, index) => {
      const base = index * 8;
      values.push(
        origin,
        destination,
        flight.date,
        flight.airline,
        flight.flight_number,
        flight.departure,
        flight.arrival,
        flight.price
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`;
    })
    .join(', ');

  await db.query(
    `INSERT INTO flights (origin, destination, date, airline, flight_number, departure_time, arrival_time, price)
     VALUES ${placeholders}
     ON CONFLICT (origin, destination, date, airline, flight_number, departure_time)
     DO UPDATE SET price = EXCLUDED.price, arrival_time = EXCLUDED.arrival_time`,
    values
  );
}

async function fetchAndCacheDate(origin, destination, date) {
  const cacheKey = `${origin}-${destination}-${date}`;

  if (inMemoryFetchCache.has(cacheKey)) {
    return inMemoryFetchCache.get(cacheKey);
  }

  const task = (async () => {
    const existing = await getCachedFlightsByDate(origin, destination, date);
    if (existing.length > 0) {
      return;
    }

    const offers = await searchFlightOffers({ origin, destination, departureDate: date });
    const normalized = offers.map((offer) => normalizeOffer(offer, date)).filter(Boolean);
    await insertFlights(origin, destination, normalized);
  })();

  inMemoryFetchCache.set(cacheKey, task);

  try {
    await task;
  } finally {
    inMemoryFetchCache.delete(cacheKey);
  }
}

async function withConcurrency(items, worker, concurrency = 3) {
  const queue = [...items];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
    }
  });

  await Promise.all(workers);
}

async function collectMonthlyFlights({ origin, destination, month, airline, page, limit }) {
  const dates = getMonthDates(month);

  await withConcurrency(dates, async (date) => {
    await fetchAndCacheDate(origin, destination, date);
  });

  const [startDate, endDate] = [dates[0], dates[dates.length - 1]];
  const params = [origin, destination, startDate, endDate];
  let where = 'origin = $1 AND destination = $2 AND date BETWEEN $3 AND $4';

  if (airline) {
    params.push(airline);
    where += ` AND airline = $${params.length}`;
  }

  const countResult = await db.query(`SELECT COUNT(*)::int AS count FROM flights WHERE ${where}`, params);
  const total = countResult.rows[0].count;

  params.push(limit, (page - 1) * limit);

  const rowsResult = await db.query(
    `SELECT date, airline, flight_number, departure_time, arrival_time, price
     FROM flights
     WHERE ${where}
     ORDER BY date ASC, departure_time ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  const data = rowsResult.rows.map((row) => ({
    date: row.date.toISOString().split('T')[0],
    airline: row.airline,
    flight_number: row.flight_number,
    departure: row.departure_time,
    arrival: row.arrival_time,
    price: Number(row.price),
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

module.exports = {
  collectMonthlyFlights,
};
