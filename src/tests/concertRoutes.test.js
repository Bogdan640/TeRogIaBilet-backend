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
}
);


