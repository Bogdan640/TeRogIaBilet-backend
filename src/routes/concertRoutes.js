// concertRoutes.js
const express = require('express');
const router = express.Router();
const concertModel = require('../models/concert');

// Validation middleware
const validateConcertData = (req, res, next) => {
    const { name, genre, price, location, date, imageUrl } = req.body;
    const errors = {};

    // Validate name
    if (!name || name.trim() === '') {
        errors.name = 'Event name is required';
    } else if (name.length > 50) {
        errors.name = 'Event name cannot exceed 50 characters';
    }

    // Validate genre
    if (!genre) {
        errors.genre = 'Genre is required';
    }

    // Validate price format
    if (!price || !/^\$\d+(\.\d{1,2})?$/.test(price)) {
        errors.price = 'Price must be in format $XX or $XX.XX';
    }

    // Validate location
    if (!location || location.trim() === '') {
        errors.location = 'Location is required';
    } else if (location.length > 100) {
        errors.location = 'Location cannot exceed 100 characters';
    }

    // Validate date
    if (!date) {
        errors.date = 'Date is required';
    } else {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
            errors.date = 'Event date cannot be in the past';
        }
    }

    // Validate imageUrl
    if (!imageUrl) {
        errors.imageUrl = 'Image URL is required';
    }

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

// Get all concerts with filtering and sorting
router.get('/', (req, res) => {
    try {
        const { genre, search, minPrice, maxPrice, country, city, orderBy } = req.query;

        // Get all concerts
        let concerts = concertModel.getAll();

        // Apply search filter
        if (search) {
            const query = search.toLowerCase();
            concerts = concerts.filter(concert =>
                concert.name.toLowerCase().includes(query) ||
                concert.genre.toLowerCase().includes(query) ||
                concert.location.toLowerCase().includes(query)
            );
        }

        // Filter by genre
        if (genre && genre !== "") {
            const genres = genre.split(',');
            if (genres.length > 0) {
                concerts = concerts.filter(concert => genres.includes(concert.genre));
            }
        }

        // Filter by location (city/country)
        if (city && city !== "") {
            concerts = concerts.filter(concert => concert.location === city);
        } else if (country && country !== "") {
            // This is simplified - in a real app, you'd have a proper city-country relationship
            const countryCities = {
                "USA": ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Seattle", "Boston", "Austin", "Portland", "Detroit"],
                "UK": ["London", "Manchester"],
                "Germany": ["Berlin"],
                "Sweden": ["Stockholm"],
                "Brazil": ["Sao Paulo"],
                "Japan": ["Tokyo"]
            };

            const cities = countryCities[country] || [];
            concerts = concerts.filter(concert => cities.includes(concert.location));
        }

        // Filter by price range
        if (minPrice !== undefined || maxPrice !== undefined) {
            const min = minPrice ? parseFloat(minPrice) : 0;
            const max = maxPrice ? parseFloat(maxPrice) : Infinity;

            concerts = concerts.filter(concert => {
                const price = parseFloat(concert.price.replace('$', ''));
                return price >= min && price <= max;
            });
        }

        // Sort concerts
        if (orderBy) {
            switch(orderBy) {
                case "Price":
                    concerts.sort((a, b) => {
                        const priceA = parseFloat(a.price.replace('$', ''));
                        const priceB = parseFloat(b.price.replace('$', ''));
                        return priceA - priceB;
                    });
                    break;
                case "Date":
                    concerts.sort((a, b) => new Date(a.date) - new Date(b.date));
                    break;
                case "Location":
                    concerts.sort((a, b) => a.location.localeCompare(b.location));
                    break;
                default:
                    // Default to date sorting
                    concerts.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        // Calculate price thresholds for the filtered concerts
        let priceThresholds = { low: 0, medium: 0, high: 0 };
        if (concerts.length > 0) {
            // Extract prices and sort them
            const prices = concerts.map(concert => parseFloat(concert.price.replace('$', '')));
            prices.sort((a, b) => a - b);

            // Calculate thresholds - dividing into three approximately equal groups
            priceThresholds = {
                low: prices[Math.floor(prices.length / 3)] || 0,
                medium: prices[Math.floor(prices.length * 2 / 3)] || 0,
                high: prices[prices.length - 1] || 0
            };
        }

        // Return concerts with pagination info and thresholds
        res.json({
            concerts,
            totalCount: concerts.length,
            priceThresholds,
            lastUpdate: concertModel.getLastUpdateTime()
        });
    } catch (error) {
        console.error('Error in concerts route:', error);
        res.status(500).json({ error: 'Failed to get concerts' });
    }
});

// Get analytics data
router.get('/analytics', (req, res) => {
    try {
        const concerts = concertModel.getAll();

        // Prepare price distribution data
        let priceDistributionData = [];
        if (concerts.length > 0) {
            // Extract prices and sort them
            const prices = concerts.map(concert => parseFloat(concert.price.replace('$', '')));
            prices.sort((a, b) => a - b);

            // Calculate thresholds
            const lowThreshold = prices[Math.floor(prices.length / 3)];
            const mediumThreshold = prices[Math.floor(prices.length * 2 / 3)];

            const lowCount = concerts.filter(concert => parseFloat(concert.price.replace('$', '')) <= lowThreshold).length;
            const mediumCount = concerts.filter(concert => {
                const price = parseFloat(concert.price.replace('$', ''));
                return price > lowThreshold && price <= mediumThreshold;
            }).length;
            const highCount = concerts.filter(concert => parseFloat(concert.price.replace('$', '')) > mediumThreshold).length;

            priceDistributionData = [
                { name: 'Low', value: lowCount },
                { name: 'Medium', value: mediumCount },
                { name: 'High', value: highCount }
            ];
        }

        // Prepare genre distribution data
        const genreCounts = {};
        concerts.forEach(concert => {
            if (genreCounts[concert.genre]) {
                genreCounts[concert.genre]++;
            } else {
                genreCounts[concert.genre] = 1;
            }
        });

        const genreDistributionData = Object.keys(genreCounts).map(genre => ({
            name: genre,
            value: genreCounts[genre]
        }));

        // Prepare price trend data
        const concertsByDate = {};
        concerts.forEach(concert => {
            if (!concertsByDate[concert.date]) {
                concertsByDate[concert.date] = [];
            }
            concertsByDate[concert.date].push(concert);
        });

        const priceTrendData = Object.keys(concertsByDate)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => {
                const concertsOnDate = concertsByDate[date];
                const avgPrice = concertsOnDate.reduce(
                    (sum, concert) => sum + parseFloat(concert.price.replace('$', '')),
                    0
                ) / concertsOnDate.length;

                return {
                    date: date,
                    price: avgPrice
                };
            });

        res.json({
            priceDistributionData,
            genreDistributionData,
            priceTrendData,
            lastUpdate: concertModel.getLastUpdateTime()
        });
    } catch (error) {
        console.error('Error in analytics route:', error);
        res.status(500).json({ error: 'Failed to get analytics data' });
    }
});

// Get concert by ID
router.get('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const concert = concertModel.getById(id);

        if (!concert) {
            return res.status(404).json({ error: 'Concert not found' });
        }

        res.json(concert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get concert' });
    }
});

// Create new concert
router.post('/', validateConcertData, (req, res) => {
    try {
        const newConcert = concertModel.create(req.body);
        res.status(201).json(newConcert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create concert' });
    }
});

// Update concert
router.put('/:id', validateConcertData, (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updatedConcert = concertModel.update(id, req.body);

        if (!updatedConcert) {
            return res.status(404).json({ error: 'Concert not found' });
        }

        res.json(updatedConcert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update concert' });
    }
});

// Delete concert
router.delete('/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const deletedConcert = concertModel.delete(id);

        if (!deletedConcert) {
            return res.status(404).json({ error: 'Concert not found' });
        }

        res.json(deletedConcert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete concert' });
    }
});

// Simulate live data updates
router.post('/simulate-update', (req, res) => {
    try {
        const updateType = Math.floor(Math.random() * 3);
        let result;

        switch (updateType) {
            case 0:
                result = concertModel.addRandom();
                break;
            case 1:
                result = concertModel.removeRandom();
                break;
            case 2:
                result = concertModel.updateRandomPrice();
                break;
            default:
                result = concertModel.addRandom();
        }

        res.json({ result, updateType });
    } catch (error) {
        res.status(500).json({ error: 'Failed to simulate update' });
    }
});

module.exports = router;