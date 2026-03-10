const axios = require('axios');

const AMADEUS_BASE_URL = 'https://test.api.amadeus.com';

let tokenCache = {
  token: null,
  expiresAt: 0,
};

async function getAccessToken() {
  const now = Date.now();

  if (tokenCache.token && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.token;
  }

  if (!process.env.AMADEUS_API_KEY || !process.env.AMADEUS_API_SECRET) {
    throw new Error('AMADEUS_API_KEY and AMADEUS_API_SECRET must be set');
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.AMADEUS_API_KEY,
    client_secret: process.env.AMADEUS_API_SECRET,
  });

  const response = await axios.post(`${AMADEUS_BASE_URL}/v1/security/oauth2/token`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    timeout: 15_000,
  });

  tokenCache = {
    token: response.data.access_token,
    expiresAt: now + response.data.expires_in * 1000,
  };

  return tokenCache.token;
}

async function searchFlightOffers({ origin, destination, departureDate }) {
  const token = await getAccessToken();

  const response = await axios.get(`${AMADEUS_BASE_URL}/v2/shopping/flight-offers`, {
    params: {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: 1,
      currencyCode: 'USD',
      max: 50,
    },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    timeout: 20_000,
  });

  return response.data?.data || [];
}

function normalizeOffer(offer, fallbackDate) {
  const segment = offer?.itineraries?.[0]?.segments?.[0];

  if (!segment || !offer.price?.total) {
    return null;
  }

  return {
    date: fallbackDate,
    airline: segment.carrierCode,
    flight_number: `${segment.carrierCode}${segment.number}`,
    departure: segment.departure.at,
    arrival: segment.arrival.at,
    price: Number(offer.price.total),
  };
}

module.exports = {
  searchFlightOffers,
  normalizeOffer,
};
