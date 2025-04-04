// tests/routes/concertRoutes.test.js
const request = require('supertest');
const express = require('express');
const concertRoutes = require('../../src/routes/concertRoutes');
const concertModel = require('../../src/models/concert');

// Mock concertModel
jest.mock('../../src/models/concert');

// Create express app for testing
const app = express();
app.use(express.json());
app.use('/api/concerts', concertRoutes);

describe('Concert Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Validation Middleware Tests
    describe('validateConcertData middleware', () => {
        test('should return 400 when name is missing', async () => {
            const response = await request(app)
                .post('/api/concerts')
                .send({
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: '2023-12-31',
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveProperty('name');
        });

        test('should return 400 when name exceeds 50 characters', async () => {
            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'A'.repeat(51),
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: '2023-12-31',
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors.name).toContain('cannot exceed 50 characters');
        });

        test('should return 400 when genre is missing', async () => {
            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'Rock Concert',
                    price: '$25.99',
                    location: 'New York',
                    date: '2023-12-31',
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveProperty('genre');
        });

        test('should return 400 when price format is invalid', async () => {
            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'Rock Concert',
                    genre: 'Rock',
                    price: '25.99',
                    location: 'New York',
                    date: '2023-12-31',
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors.price).toContain('format $XX');
        });

        test('should return 400 when location is missing', async () => {
            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'Rock Concert',
                    genre: 'Rock',
                    price: '$25.99',
                    date: '2023-12-31',
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveProperty('location');
        });

        test('should return 400 when date is in the past', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const pastDate = yesterday.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'Rock Concert',
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: pastDate,
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);
            expect(response.body.errors.date).toContain('cannot be in the past');
        });

        test('should call next() when all validations pass', async () => {
            // Mock the model's create method to test successful validation
            concertModel.create.mockReturnValue({ id: 1, name: 'Test Concert' });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const futureDate = tomorrow.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'Rock Concert',
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: futureDate,
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(201);
            expect(concertModel.create).toHaveBeenCalled();
        });
    });

    // GET / Route Tests
    describe('GET / route', () => {
        test('should return all concerts when no filters are applied', async () => {
            const mockConcerts = [
                { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99' },
                { id: 2, name: 'Metal Concert', genre: 'Metal', price: '$30.99' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);
            concertModel.getLastUpdateTime.mockReturnValue('2023-01-01T12:00:00Z');

            const response = await request(app).get('/api/concerts');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toHaveLength(2);
            expect(response.body.lastUpdate).toBe('2023-01-01T12:00:00Z');
        });


        test('should filter concerts by genre', async () => {
            const mockConcerts = [
                { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99' },
                { id: 2, name: 'Metal Concert', genre: 'Metal', price: '$30.99' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?genre=Metal');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toHaveLength(1);
            expect(response.body.concerts[0].genre).toBe('Metal');
        });

        test('should filter concerts by price range', async () => {
            const mockConcerts = [
                { id: 1, name: 'Budget Concert', genre: 'Rock', price: '$15.99' },
                { id: 2, name: 'Standard Concert', genre: 'Rock', price: '$25.99' },
                { id: 3, name: 'Premium Concert', genre: 'Rock', price: '$45.99' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?minPrice=20&maxPrice=30');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toHaveLength(1);
            expect(response.body.concerts[0].name).toBe('Standard Concert');
        });

        test('should sort concerts by price', async () => {
            const mockConcerts = [
                { id: 1, name: 'Premium Concert', genre: 'Rock', price: '$45.99' },
                { id: 2, name: 'Standard Concert', genre: 'Rock', price: '$25.99' },
                { id: 3, name: 'Budget Concert', genre: 'Rock', price: '$15.99' }
            ];
            concertModel.getAll.mockReturnValue(mockConcerts);
            const response = await request(app).get('/api/concerts?orderBy=Price');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toEqual([
                { id: 3, name: 'Budget Concert', genre: 'Rock', price: '$15.99' },
                { id: 2, name: 'Standard Concert', genre: 'Rock', price: '$25.99' },
                { id: 1, name: 'Premium Concert', genre: 'Rock', price: '$45.99' }
            ]);
        }
        );
        test('should return 500 if an error occurs', async () => {
            concertModel.getAll.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app).get('/api/concerts');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to get concerts');
        });
    }
    );
    // POST / Route Tests
    describe('POST / route', () => {
        test('should create a new concert', async () => {
            const newConcert = {
                name: 'New Concert',
                genre: 'Rock',
                price: '$25.99',
                location: 'New York',
                date: '2028-12-31',
                imageUrl: '/images/concert.jpg'
            };

            concertModel.create.mockReturnValue({ id: 1, ...newConcert });

            const response = await request(app)
                .post('/api/concerts')
                .send(newConcert);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ id: 1, ...newConcert });
        });

        test('should return 400 if validation fails', async () => {
            const invalidConcert = {
                name: '',
                genre: 'Rock',
                price: '$25.99',
                location: 'New York',
                date: '2023-12-31',
                imageUrl: '/images/concert.jpg'
            };

            const response = await request(app)
                .post('/api/concerts')
                .send(invalidConcert);

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveProperty('name');
        });
    }
    );
    // PUT /:id Route Tests
    describe('PUT /:id route', () => {
        test('should update an existing concert', async () => {
            const updatedConcert = {
                name: 'Updated Concert',
                genre: 'Rock',
                price: '$30.99',
                location: 'Los Angeles',
                date: '2026-01-01',
                imageUrl: '/images/updated_concert.jpg'
            };

            concertModel.update.mockReturnValue({ id: 1, ...updatedConcert });

            const response = await request(app)
                .put('/api/concerts/1')
                .send(updatedConcert);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ id: 1, ...updatedConcert });
        });

        test('should return 400 if request is bad', async () => {
            concertModel.update.mockReturnValue(null);

            const response = await request(app)
                .put('/api/concerts/999')
                .send({
                    name: 'Non-existent Concert',
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: '2023-12-31',
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(400);

        });
    }
    );
    // DELETE /:id Route Tests
    describe('DELETE /:id route', () => {
        test('should delete an existing concert', async () => {
            concertModel.delete.mockReturnValue({ id: 1 });

            const response = await request(app).delete('/api/concerts/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ id: 1 });
        });

        test('should return 404 if concert not found', async () => {
            concertModel.delete.mockReturnValue(null);

            const response = await request(app).delete('/api/concerts/999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Concert not found');
        });
    }
    );
    // GET /:id Route Tests
    describe('GET /:id route', () => {
        test('should return a concert by ID', async () => {
            const mockConcert = { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99' };

            concertModel.getById.mockReturnValue(mockConcert);

            const response = await request(app).get('/api/concerts/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockConcert);
        });

        test('should return 404 if concert not found', async () => {
            concertModel.getById.mockReturnValue(null);

            const response = await request(app).get('/api/concerts/999');

            expect(response.status).toBe(404);
            expect(response.body.error).toBe('Concert not found');
        });
    }
    );



    // Error Handling Tests
    describe('Error Handling', () => {
        test('should return 500 if an unexpected error occurs', async () => {
            concertModel.getAll.mockImplementation(() => {
                throw new Error('Unexpected error');
            });

            const response = await request(app).get('/api/concerts');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to get concerts');
        });
    }
    );

        // Additional tests to improve coverage

// 1. Search filter tests
        test('should filter concerts by search term', async () => {
            const mockConcerts = [
                { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99', location: 'New York' },
                { id: 2, name: 'Jazz Festival', genre: 'Jazz', price: '$30.99', location: 'Chicago' },
                { id: 3, name: 'EDM Party', genre: 'Electronic', price: '$45.99', location: 'Miami' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?search=jazz');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toHaveLength(1);
            expect(response.body.concerts[0].name).toBe('Jazz Festival');
        });

// 2. Location filtering tests
        test('should filter concerts by city', async () => {
            const mockConcerts = [
                { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99', location: 'New York' },
                { id: 2, name: 'Jazz Festival', genre: 'Jazz', price: '$30.99', location: 'Chicago' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?city=Chicago');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toHaveLength(1);
            expect(response.body.concerts[0].location).toBe('Chicago');
        });

        test('should filter concerts by country', async () => {
            const mockConcerts = [
                { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99', location: 'New York' },
                { id: 2, name: 'London Calling', genre: 'Rock', price: '$35.99', location: 'London' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?country=UK');

            expect(response.status).toBe(200);
            expect(response.body.concerts).toHaveLength(1);
            expect(response.body.concerts[0].location).toBe('London');
        });

// 3. Sort tests for other options
        test('should sort concerts by date', async () => {
            const mockConcerts = [
                { id: 1, name: 'Later Concert', genre: 'Rock', price: '$25.99', date: '2025-12-31' },
                { id: 2, name: 'Earlier Concert', genre: 'Rock', price: '$30.99', date: '2025-06-15' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?orderBy=Date');

            expect(response.status).toBe(200);
            expect(response.body.concerts[0].name).toBe('Earlier Concert');
            expect(response.body.concerts[1].name).toBe('Later Concert');
        });

        test('should sort concerts by location', async () => {
            const mockConcerts = [
                { id: 1, name: 'New York Concert', genre: 'Rock', price: '$25.99', location: 'New York' },
                { id: 2, name: 'Austin Concert', genre: 'Rock', price: '$30.99', location: 'Austin' }
            ];

            concertModel.getAll.mockReturnValue(mockConcerts);

            const response = await request(app).get('/api/concerts?orderBy=Location');

            expect(response.status).toBe(200);
            expect(response.body.concerts[0].location).toBe('Austin');
            expect(response.body.concerts[1].location).toBe('New York');
        });

// 4. Analytics route tests
        describe('GET /analytics route', () => {
            test('should return analytics data', async () => {
                const mockConcerts = [
                    { id: 1, name: 'Rock Concert', genre: 'Rock', price: '$25.99', date: '2025-06-01' },
                    { id: 2, name: 'Jazz Festival', genre: 'Jazz', price: '$45.99', date: '2025-06-01' },
                    { id: 3, name: 'Classical Night', genre: 'Classical', price: '$65.99', date: '2025-07-01' }
                ];

                concertModel.getAll.mockReturnValue(mockConcerts);
                concertModel.getLastUpdateTime.mockReturnValue('2023-01-01T12:00:00Z');

                const response = await request(app).get('/api/concerts/analytics');

                expect(response.status).toBe(200);
                expect(response.body).toHaveProperty('priceDistributionData');
                expect(response.body).toHaveProperty('genreDistributionData');
                expect(response.body).toHaveProperty('priceTrendData');

                // Verify genre distribution
                expect(response.body.genreDistributionData).toHaveLength(3);
                const genres = response.body.genreDistributionData.map(item => item.name);
                expect(genres).toContain('Rock');
                expect(genres).toContain('Jazz');
                expect(genres).toContain('Classical');
            });

            test('should handle empty concert list for analytics', async () => {
                concertModel.getAll.mockReturnValue([]);

                const response = await request(app).get('/api/concerts/analytics');

                expect(response.status).toBe(200);
                expect(response.body.priceDistributionData).toHaveLength(0);
                expect(response.body.genreDistributionData).toHaveLength(0);
                expect(response.body.priceTrendData).toHaveLength(0);
            });

            test('should return 500 if analytics error occurs', async () => {
                concertModel.getAll.mockImplementation(() => {
                    throw new Error('Analytics error');
                });

                const response = await request(app).get('/api/concerts/analytics');

                expect(response.status).toBe(500);
                expect(response.body.error).toBe('Failed to get analytics data');
            });
        });

// 5. Simulate update route tests
        describe('POST /simulate-update route', () => {
            test('should add a random concert', async () => {
                concertModel.addRandom.mockReturnValue({ id: 999, name: 'Random Concert' });
                Math.random = jest.fn().mockReturnValue(0); // Will result in case 0

                const response = await request(app).post('/api/concerts/simulate-update');

                expect(response.status).toBe(200);
                expect(response.body.updateType).toBe(0);
                expect(concertModel.addRandom).toHaveBeenCalled();
            });

            test('should remove a random concert', async () => {
                concertModel.removeRandom.mockReturnValue({ id: 1, name: 'Removed Concert' });
                Math.random = jest.fn().mockReturnValue(0.4); // Will result in case 1

                const response = await request(app).post('/api/concerts/simulate-update');

                expect(response.status).toBe(200);
                expect(response.body.updateType).toBe(1);
                expect(concertModel.removeRandom).toHaveBeenCalled();
            });

            test('should update a random price', async () => {
                concertModel.updateRandomPrice.mockReturnValue({ id: 1, name: 'Updated Concert', price: '$99.99' });
                Math.random = jest.fn().mockReturnValue(0.7); // Will result in case 2

                const response = await request(app).post('/api/concerts/simulate-update');

                expect(response.status).toBe(200);
                expect(response.body.updateType).toBe(2);
                expect(concertModel.updateRandomPrice).toHaveBeenCalled();
            });

            test('should handle errors in simulate-update', async () => {
                Math.random = jest.fn().mockReturnValue(0);
                concertModel.addRandom.mockImplementation(() => {
                    throw new Error('Simulation error');
                });

                const response = await request(app).post('/api/concerts/simulate-update');

                expect(response.status).toBe(500);
                expect(response.body.error).toBe('Failed to simulate update');
            });
        });

// 6. PUT route with invalid data test
        test('should return 400 if update validation fails', async () => {
            const invalidUpdate = {
                name: '', // Empty name should fail validation
                genre: 'Rock',
                price: '$30.99',
                location: 'Los Angeles',
                date: '2025-01-01',
                imageUrl: '/images/concert.jpg'
            };

            const response = await request(app)
                .put('/api/concerts/1')
                .send(invalidUpdate);

            expect(response.status).toBe(400);
            expect(response.body.errors).toHaveProperty('name');
        });

// 7. Error handling in other routes
        test('should return 500 if get by ID fails', async () => {
            concertModel.getById.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app).get('/api/concerts/1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to get concert');
        });

        test('should return 500 if create fails', async () => {
            concertModel.create.mockImplementation(() => {
                throw new Error('Database error');
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const futureDate = tomorrow.toISOString().split('T')[0];

            const response = await request(app)
                .post('/api/concerts')
                .send({
                    name: 'New Concert',
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: futureDate,
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to create concert');
        });

        test('should return 500 if update fails', async () => {
            concertModel.update.mockImplementation(() => {
                throw new Error('Database error');
            });

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const futureDate = tomorrow.toISOString().split('T')[0];

            const response = await request(app)
                .put('/api/concerts/1')
                .send({
                    name: 'Updated Concert',
                    genre: 'Rock',
                    price: '$25.99',
                    location: 'New York',
                    date: futureDate,
                    imageUrl: '/images/concert.jpg'
                });

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to update concert');
        });

        test('should return 500 if delete fails', async () => {
            concertModel.delete.mockImplementation(() => {
                throw new Error('Database error');
            });

            const response = await request(app).delete('/api/concerts/1');

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to delete concert');
        });
}
);


