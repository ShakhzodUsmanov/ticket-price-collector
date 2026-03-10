const express = require('express');
const { getFlights } = require('../controllers/flightController');

const router = express.Router();

router.get('/flights', getFlights);

module.exports = router;
