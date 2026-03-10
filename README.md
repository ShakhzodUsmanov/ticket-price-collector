# Ticket Price Collector Backend

Production-ready Node.js backend service that aggregates monthly flight prices from the **Amadeus Flight Offers Search API**, caches them in PostgreSQL, and exposes them through a paginated REST endpoint.

## Features

- Collects daily flight offers for a selected month (`YYYY-MM`)
- Caches data in PostgreSQL per route/day to avoid redundant external API calls
- Rate limiting to protect the backend from abuse
- Pagination support (`page`, `limit`)
- Airline filter support (`airline=TK`)
- Structured modular architecture:
  - `backend/controllers`
  - `backend/services`
  - `backend/routes`
  - `backend/db`
  - `backend/utils`

## Tech stack

- Node.js
- Express
- Axios
- PostgreSQL

## Project structure

```text
/backend
  /controllers
  /services
  /routes
  /db
  /utils
server.js
```

## Environment variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Required variables:

- `AMADEUS_API_KEY`
- `AMADEUS_API_SECRET`
- `DATABASE_URL`

Optional:

- `PORT` (default: `3000`)
- `DB_SSL` (`true` or `false`, default `false`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Initialize database schema:

```bash
npm run db:init
```

3. Start server:

```bash
npm run start
```

For development:

```bash
npm run dev
```

## API

### GET `/flights`

Example:

```http
GET /flights?from=TAS&to=IST&month=2026-05
```

Supported query parameters:

- `from` (required): 3-letter IATA airport code
- `to` (required): 3-letter IATA airport code
- `month` (required): `YYYY-MM`
- `airline` (optional): airline code filter (`TK`, `AA`, etc.)
- `page` (optional, default `1`)
- `limit` (optional, default `25`, max `100`)

### Response

```json
{
  "data": [
    {
      "date": "2026-05-02",
      "airline": "TK",
      "flight_number": "TK369",
      "departure": "2026-05-02T08:35:00.000Z",
      "arrival": "2026-05-02T11:50:00.000Z",
      "price": 185
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1,
    "totalPages": 1
  }
}
```

## Caching behavior

- For each day in the requested month:
  - If flights already exist in DB for `origin + destination + date`, cached rows are used.
  - Otherwise, backend fetches from Amadeus, normalizes records, and persists them.

This avoids repeated external API requests for previously fetched dates.

## Notes

- The service uses Amadeus OAuth2 client credentials flow.
- The API endpoint currently requests one-way offers with `adults=1` and `currencyCode=USD`.
- The backend calls Amadeus in controlled concurrency to reduce risk of rate-limit bursts.
