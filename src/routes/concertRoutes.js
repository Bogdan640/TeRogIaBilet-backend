// // concertRoutes.js
// const express = require('express');
// const router = express.Router();
// const concertModel = require('../models/concert');
//
// // Validation middleware
// const validateConcertData = (req, res, next) => {
//     const { name, genre, price, location, date, imageUrl } = req.body;
//     const errors = {};
//
//     // Validate name
//     if (!name || name.trim() === '') {
//         errors.name = 'Event name is required';
//     } else if (name.length > 50) {
//         errors.name = 'Event name cannot exceed 50 characters';
//     }
//
//     // Validate genre
//     if (!genre) {
//         errors.genre = 'Genre is required';
//     }
//
//     // Validate price format
//     if (!price || !/^\$\d+(\.\d{1,2})?$/.test(price)) {
//         errors.price = 'Price must be in format $XX or $XX.XX';
//     }
//
//     // Validate location
//     if (!location || location.trim() === '') {
//         errors.location = 'Location is required';
//     } else if (location.length > 100) {
//         errors.location = 'Location cannot exceed 100 characters';
//     }
//
//     // Validate date
//     if (!date) {
//         errors.date = 'Date is required';
//     } else {
//         const selectedDate = new Date(date);
//         const today = new Date();
//         today.setHours(0, 0, 0, 0);
//         if (selectedDate < today) {
//             errors.date = 'Event date cannot be in the past';
//         }
//     }
//
//     // Validate imageUrl
//     if (!imageUrl) {
//         errors.imageUrl = 'Image URL is required';
//     }
//
//     if (Object.keys(errors).length > 0) {
//         return res.status(400).json({ errors });
//     }
//
//     next();
// };
//
// // Add server health check endpoint
// router.get('/health', (req, res) => {
//     res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
// });
//
// // Get all concerts with filtering, sorting, and pagination
// router.get('/', (req, res) => {
//     try {
//         const {
//             genre, search, minPrice, maxPrice, country, city, orderBy,
//             page = 1, limit = 10 // Pagination parameters
//         } = req.query;
//
//         // Get all concerts
//         let concerts = concertModel.getAll();
//
//         // Apply search filter
//         if (search) {
//             const query = search.toLowerCase();
//             concerts = concerts.filter(concert =>
//                 concert.name.toLowerCase().includes(query) ||
//                 concert.genre.toLowerCase().includes(query) ||
//                 concert.location.toLowerCase().includes(query)
//             );
//         }
//
//         // Filter by genre
//         if (genre && genre !== "") {
//             const genres = genre.split(',');
//             if (genres.length > 0) {
//                 concerts = concerts.filter(concert => genres.includes(concert.genre));
//             }
//         }
//
//         // Filter by location (city/country)
//         if (city && city !== "") {
//             concerts = concerts.filter(concert => concert.location === city);
//         } else if (country && country !== "") {
//             // This is simplified - in a real app, you'd have a proper city-country relationship
//             const countryCities = {
//                 "USA": ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Seattle", "Boston", "Austin", "Portland", "Detroit"],
//                 "UK": ["London", "Manchester"],
//                 "Germany": ["Berlin"],
//                 "Sweden": ["Stockholm"],
//                 "Brazil": ["Sao Paulo"],
//                 "Japan": ["Tokyo"]
//             };
//
//             const cities = countryCities[country] || [];
//             concerts = concerts.filter(concert => cities.includes(concert.location));
//         }
//
//         // Filter by price range
//         if (minPrice !== undefined || maxPrice !== undefined) {
//             const min = minPrice ? parseFloat(minPrice) : 0;
//             const max = maxPrice ? parseFloat(maxPrice) : Infinity;
//
//             concerts = concerts.filter(concert => {
//                 const price = parseFloat(concert.price.replace('$', ''));
//                 return price >= min && price <= max;
//             });
//         }
//
//         // Sort concerts
//         if (orderBy) {
//             switch(orderBy) {
//                 case "Price":
//                     concerts.sort((a, b) => {
//                         const priceA = parseFloat(a.price.replace('$', ''));
//                         const priceB = parseFloat(b.price.replace('$', ''));
//                         return priceA - priceB;
//                     });
//                     break;
//                 case "Date":
//                     concerts.sort((a, b) => new Date(a.date) - new Date(b.date));
//                     break;
//                 case "Location":
//                     concerts.sort((a, b) => a.location.localeCompare(b.location));
//                     break;
//                 default:
//                     // Default to date sorting
//                     concerts.sort((a, b) => new Date(a.date) - new Date(b.date));
//             }
//         }
//
//         // Calculate price thresholds for the filtered concerts
//         let priceThresholds = { low: 0, medium: 0, high: 0 };
//         if (concerts.length > 0) {
//             // Extract prices and sort them
//             const prices = concerts.map(concert => parseFloat(concert.price.replace('$', '')));
//             prices.sort((a, b) => a - b);
//
//             // Calculate thresholds - dividing into three approximately equal groups
//             priceThresholds = {
//                 low: prices[Math.floor(prices.length / 3)] || 0,
//                 medium: prices[Math.floor(prices.length * 2 / 3)] || 0,
//                 high: prices[prices.length - 1] || 0
//             };
//         }
//
//         // Apply pagination
//         const startIndex = (page - 1) * limit;
//         const endIndex = startIndex + parseInt(limit);
//         const paginatedConcerts = concerts.slice(startIndex, endIndex);
//
//         // Return concerts with pagination info and thresholds
//         res.json({
//             concerts: paginatedConcerts,
//             totalCount: concerts.length,
//             currentPage: parseInt(page),
//             totalPages: Math.ceil(concerts.length / limit),
//             priceThresholds,
//             lastUpdate: concertModel.getLastUpdateTime()
//         });
//     } catch (error) {
//         console.error('Error in concerts route:', error);
//         res.status(500).json({ error: 'Failed to get concerts' });
//     }
// });
//
// // Get analytics data
// router.get('/analytics', (req, res) => {
//     try {
//         const concerts = concertModel.getAll();
//
//         // Prepare price distribution data
//         let priceDistributionData = [];
//         if (concerts.length > 0) {
//             // Extract prices and sort them
//             const prices = concerts.map(concert => parseFloat(concert.price.replace('$', '')));
//             prices.sort((a, b) => a - b);
//
//             // Calculate thresholds
//             const lowThreshold = prices[Math.floor(prices.length / 3)];
//             const mediumThreshold = prices[Math.floor(prices.length * 2 / 3)];
//
//             const lowCount = concerts.filter(concert => parseFloat(concert.price.replace('$', '')) <= lowThreshold).length;
//             const mediumCount = concerts.filter(concert => {
//                 const price = parseFloat(concert.price.replace('$', ''));
//                 return price > lowThreshold && price <= mediumThreshold;
//             }).length;
//             const highCount = concerts.filter(concert => parseFloat(concert.price.replace('$', '')) > mediumThreshold).length;
//
//             priceDistributionData = [
//                 { name: 'Low', value: lowCount },
//                 { name: 'Medium', value: mediumCount },
//                 { name: 'High', value: highCount }
//             ];
//         }
//
//         // Prepare genre distribution data
//         const genreCounts = {};
//         concerts.forEach(concert => {
//             if (genreCounts[concert.genre]) {
//                 genreCounts[concert.genre]++;
//             } else {
//                 genreCounts[concert.genre] = 1;
//             }
//         });
//
//         const genreDistributionData = Object.keys(genreCounts).map(genre => ({
//             name: genre,
//             value: genreCounts[genre]
//         }));
//
//         // Prepare price trend data
//         const concertsByDate = {};
//         concerts.forEach(concert => {
//             if (!concertsByDate[concert.date]) {
//                 concertsByDate[concert.date] = [];
//             }
//             concertsByDate[concert.date].push(concert);
//         });
//
//         const priceTrendData = Object.keys(concertsByDate)
//             .sort((a, b) => new Date(a) - new Date(b))
//             .map(date => {
//                 const concertsOnDate = concertsByDate[date];
//                 const avgPrice = concertsOnDate.reduce(
//                     (sum, concert) => sum + parseFloat(concert.price.replace('$', '')),
//                     0
//                 ) / concertsOnDate.length;
//
//                 return {
//                     date: date,
//                     price: avgPrice
//                 };
//             });
//
//         res.json({
//             priceDistributionData,
//             genreDistributionData,
//             priceTrendData,
//             lastUpdate: concertModel.getLastUpdateTime()
//         });
//     } catch (error) {
//         console.error('Error in analytics route:', error);
//         res.status(500).json({ error: 'Failed to get analytics data' });
//     }
// });
//
// // Get concert by ID
// router.get('/:id', (req, res) => {
//     try {
//         const id = parseInt(req.params.id);
//         const concert = concertModel.getById(id);
//
//         if (!concert) {
//             return res.status(404).json({ error: 'Concert not found' });
//         }
//
//         res.json(concert);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to get concert' });
//     }
// });
//
// // Create new concert
// router.post('/', validateConcertData, (req, res) => {
//     try {
//         const newConcert = concertModel.create(req.body);
//         res.status(201).json(newConcert);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to create concert' });
//     }
// });
//
// // Bulk create concerts - for syncing offline data
// router.post('/bulk', (req, res) => {
//     try {
//         const { operations } = req.body;
//         const results = [];
//
//         if (!operations || !Array.isArray(operations)) {
//             return res.status(400).json({ error: 'Invalid operations format' });
//         }
//
//         // Process each operation in the array
//         for (const op of operations) {
//             try {
//                 let result;
//                 switch (op.type) {
//                     case 'create':
//                         // Validate data before creating
//                         const createErrors = {};
//                         if (Object.keys(createErrors).length > 0) {
//                             results.push({
//                                 success: false,
//                                 operation: op,
//                                 errors: createErrors,
//                                 message: 'Validation failed'
//                             });
//                         } else {
//                             result = concertModel.create(op.data);
//                             results.push({
//                                 success: true,
//                                 operation: op,
//                                 result
//                             });
//                         }
//                         break;
//                     case 'update':
//                         const updateErrors = {};
//                         if (Object.keys(updateErrors).length > 0) {
//                             results.push({
//                                 success: false,
//                                 operation: op,
//                                 errors: updateErrors,
//                                 message: 'Validation failed'
//                             });
//                         } else {
//                             result = concertModel.update(op.id, op.data);
//                             results.push({
//                                 success: true,
//                                 operation: op,
//                                 result
//                             });
//                         }
//                         break;
//                     case 'delete':
//                         result = concertModel.delete(op.id);
//                         results.push({
//                             success: true,
//                             operation: op,
//                             result
//                         });
//                         break;
//                     default:
//                         results.push({
//                             success: false,
//                             operation: op,
//                             message: 'Unknown operation type'
//                         });
//                 }
//             } catch (opError) {
//                 results.push({
//                     success: false,
//                     operation: op,
//                     message: opError.message || 'Operation failed'
//                 });
//             }
//         }
//
//         res.status(200).json({ results });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to process bulk operations', message: error.message });
//     }
// });
//
// // Update concert
// router.put('/:id', validateConcertData, (req, res) => {
//     try {
//         const id = parseInt(req.params.id);
//         const updatedConcert = concertModel.update(id, req.body);
//
//         if (!updatedConcert) {
//             return res.status(404).json({ error: 'Concert not found' });
//         }
//
//         res.json(updatedConcert);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to update concert' });
//     }
// });
//
// // Delete concert
// router.delete('/:id', (req, res) => {
//     try {
//         const id = parseInt(req.params.id);
//         const deletedConcert = concertModel.delete(id);
//
//         if (!deletedConcert) {
//             return res.status(404).json({ error: 'Concert not found' });
//         }
//
//         res.json(deletedConcert);
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to delete concert' });
//     }
// });
//
// // Simulate live data updates
// router.post('/simulate-update', (req, res) => {
//     try {
//         const updateType = Math.floor(Math.random() * 3);
//         let result;
//
//         switch (updateType) {
//             case 0:
//                 result = concertModel.addRandom();
//                 break;
//             case 1:
//                 result = concertModel.removeRandom();
//                 break;
//             case 2:
//                 result = concertModel.updateRandomPrice();
//                 break;
//             default:
//                 result = concertModel.addRandom();
//         }
//
//         res.json({ result, updateType });
//     } catch (error) {
//         res.status(500).json({ error: 'Failed to simulate update' });
//     }
// });
//
// module.exports = router;




// concertRoutes.js
const express = require('express');
const router = express.Router();
const concertModel = require('../models/concertModel');

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

// Add server health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'online', timestamp: new Date().toISOString() });
});

// Get all concerts with filtering, sorting, and pagination
router.get('/', async (req, res) => {
    try {
        const {
            genre, search, minPrice, maxPrice, country, city, orderBy,
            page = 1, limit = 10 // Pagination parameters
        } = req.query;

        // Create filters object for database query
        const filters = {
            search,
            genre,
            city,
            country
        };

        // Get concerts from database
        const concerts = await concertModel.getAll(filters);

        // Filter by price range
        let filteredConcerts = concerts;
        if (minPrice !== undefined || maxPrice !== undefined) {
            const min = minPrice ? parseFloat(minPrice) : 0;
            const max = maxPrice ? parseFloat(maxPrice) : Infinity;

            filteredConcerts = concerts.filter(concert => {
                const price = parseFloat(concert.price.replace('$', ''));
                return price >= min && price <= max;
            });
        }

        // Sort concerts
        if (orderBy) {
            switch(orderBy) {
                case "Price":
                    filteredConcerts.sort((a, b) =>
                        parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', '')));
                    break;
                case "Date":
                    filteredConcerts.sort((a, b) => new Date(a.date) - new Date(b.date));
                    break;
                case "Location":
                    filteredConcerts.sort((a, b) => a.location.localeCompare(b.location));
                    break;
                default:
                    // Default to date sorting
                    filteredConcerts.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        }

        // Calculate price thresholds for the filtered concerts
        let priceThresholds = { low: 0, medium: 0, high: 0 };
        if (filteredConcerts.length > 0) {
            // Extract prices and sort them
            const prices = filteredConcerts.map(concert => parseFloat(concert.price.replace('$', '')));
            prices.sort((a, b) => a - b);

            // Calculate thresholds - dividing into three approximately equal groups
            priceThresholds = {
                low: prices[Math.floor(prices.length / 3)] || 0,
                medium: prices[Math.floor(prices.length * 2 / 3)] || 0,
                high: prices[prices.length - 1] || 0
            };
        }

        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedConcerts = filteredConcerts.slice(startIndex, endIndex);

        // Return concerts with pagination info and thresholds
        res.json({
            concerts: paginatedConcerts,
            totalCount: filteredConcerts.length,
            currentPage: parseInt(page),
            totalPages: Math.ceil(filteredConcerts.length / limit),
            priceThresholds,
            lastUpdate: concertModel.getLastUpdateTime()
        });
    } catch (error) {
        console.error('Error in concerts route:', error);
        res.status(500).json({ error: 'Failed to get concerts' });
    }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
    try {
        const concerts = await concertModel.getAll();

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
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const concert = await concertModel.getById(id);

        if (!concert) {
            return res.status(404).json({ error: 'Concert not found' });
        }

        res.json(concert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get concert' });
    }
});

// Create new concert
router.post('/', validateConcertData, async (req, res) => {
    try {
        const newConcert = await concertModel.create(req.body);
        res.status(201).json(newConcert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create concert' });
    }
});

// Bulk create concerts - for syncing offline data
router.post('/bulk', async (req, res) => {
    try {
        const { operations } = req.body;
        const results = [];

        if (!operations || !Array.isArray(operations)) {
            return res.status(400).json({ error: 'Invalid operations format' });
        }

        // Process each operation in the array
        for (const op of operations) {
            try {
                let result;
                switch (op.type) {
                    case 'create':
                        result = await concertModel.create(op.data);
                        results.push({
                            success: true,
                            operation: 'create',
                            id: result.id
                        });
                        break;
                    case 'update':
                        result = await concertModel.update(op.id, op.data);
                        results.push({
                            success: !!result,
                            operation: 'update',
                            id: op.id
                        });
                        break;
                    case 'delete':
                        result = await concertModel.delete(op.id);
                        results.push({
                            success: !!result,
                            operation: 'delete',
                            id: op.id
                        });
                        break;
                    default:
                        results.push({
                            success: false,
                            operation: op.type,
                            error: 'Unknown operation type'
                        });
                }
            } catch (opError) {
                results.push({
                    success: false,
                    operation: op.type,
                    error: opError.message
                });
            }
        }

        res.status(200).json({ results });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process bulk operations', message: error.message });
    }
});

// Update concert
router.put('/:id', validateConcertData, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const updatedConcert = await concertModel.update(id, req.body);

        if (!updatedConcert) {
            return res.status(404).json({ error: 'Concert not found' });
        }

        res.json(updatedConcert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update concert' });
    }
});

// Delete concert
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const deletedConcert = await concertModel.delete(id);

        if (!deletedConcert) {
            return res.status(404).json({ error: 'Concert not found' });
        }

        res.json(deletedConcert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete concert' });
    }
});

// Simulate live data updates
router.post('/simulate-update', async (req, res) => {
    try {
        const updateType = Math.floor(Math.random() * 3);
        let result;

        switch (updateType) {
            case 0:
                result = await concertModel.addRandom();
                break;
            case 1:
                result = await concertModel.removeRandom();
                break;
            case 2:
                result = await concertModel.updateRandomPrice();
                break;
            default:
                result = await concertModel.addRandom();
        }

        res.json({ result, updateType });
    } catch (error) {
        res.status(500).json({ error: 'Failed to simulate update' });
    }
});


// Statistics routes
router.get('/statistics/unoptimized', async (req, res) => {
    try {
        const stats = await concertModel.getStatisticsUnoptimized();
        res.json(stats);
    } catch (error) {
        console.error('Error in unoptimized statistics route:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/statistics/optimized', async (req, res) => {
    try {
        const stats = await concertModel.getStatisticsOptimized();
        res.json(stats);
    } catch (error) {
        console.error('Error in optimized statistics route:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/statistics/compare', async (req, res) => {
    try {
        const comparison = await concertModel.getStatisticsComparison();
        res.json(comparison);
    } catch (error) {
        console.error('Error in statistics comparison route:', error);
        res.status(500).json({ error: 'Failed to compare statistics' });
    }
});

module.exports = router;