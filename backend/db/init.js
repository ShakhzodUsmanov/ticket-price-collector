require('dotenv').config();
const db = require('./index');

const createTableSQL = `
CREATE TABLE IF NOT EXISTS flights (
  id BIGSERIAL PRIMARY KEY,
  origin VARCHAR(3) NOT NULL,
  destination VARCHAR(3) NOT NULL,
  date DATE NOT NULL,
  airline VARCHAR(4) NOT NULL,
  flight_number VARCHAR(16) NOT NULL,
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(origin, destination, date, airline, flight_number, departure_time)
);

CREATE INDEX IF NOT EXISTS idx_flights_route_date
ON flights(origin, destination, date);

CREATE INDEX IF NOT EXISTS idx_flights_airline
ON flights(airline);
`;

async function init() {
  try {
    await db.query(createTableSQL);
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  } finally {
    await db.pool.end();
  }
}

init();
