//filterRoutes.js
const express = require('express');
const router = express.Router();

// Define filter options
const genresList = [
    "Rock",  "Metal", "Alternative Rock", "Punk"
];

const orderByOptions = ["Date", "Price", "Location"];

const countries = ["USA", "UK", "Germany", "Sweden", "Brazil", "Japan"];

const cities = {
    "USA": ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Seattle", "Boston", "Austin", "Portland", "Detroit"],
    "UK": ["London", "Manchester"],
    "Germany": ["Berlin"],
    "Sweden": ["Stockholm"],
    "Brazil": ["Sao Paulo"],
    "Japan": ["Tokyo"]
};

// Get all filter options
router.get('/', (req, res) => {
    try {
        res.json({
            genres: genresList,
            orderBy: orderByOptions,
            countries,
            cities
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get filter options' });
    }
});

// Get genres
router.get('/genres', (req, res) => {
    res.json(genresList);
});

// Get order options
router.get('/orderBy', (req, res) => {
    res.json(orderByOptions);
});

// Get countries
router.get('/countries', (req, res) => {
    res.json(countries);
});

// Get cities by country
router.get('/cities/:country', (req, res) => {
    const country = req.params.country;
    if (cities[country]) {
        res.json(cities[country]);
    } else {
        res.status(404).json({ error: 'Country not found' });
    }
});

// Get all cities
router.get('/cities', (req, res) => {
    res.json(cities);
});

module.exports = router;
module.exports.genresList = genresList;
module.exports.orderByOptions = orderByOptions;
module.exports.countries = countries;
module.exports.cities = cities;