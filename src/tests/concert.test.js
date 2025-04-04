// tests/models/concert.test.js
const concertModel = require('../../src/models/concert');

// Save original Date.now implementation to restore later
const originalNow = Date.now;

// Mock data for testing
const testConcert = {
    name: "Test Concert",
    genre: "Rock",
    price: "$35",
    location: "Boston",
    date: "2025-10-15",
    imageUrl: "/images/test.jpg"
};

describe('Concert Model', () => {
    // Reset the module before each test to ensure clean state
    let originalConcerts;

    beforeEach(() => {
        // Store the original concerts and restore after each test
        originalConcerts = [...concertModel.getAll()];

        // Mock Date.now for consistent timestamps
        Date.now = jest.fn().mockReturnValue(1234567890);
    });

    afterEach(() => {
        // Restore original concerts and Date.now
        jest.resetModules();
        Date.now = originalNow;

        // Restore the original concerts array
        while (concertModel.getAll().length > 0) {
            concertModel.getAll().pop();
        }
        originalConcerts.forEach(concert => {
            concertModel.getAll().push(concert);
        });
    });

    // Basic CRUD operations
    describe('CRUD Operations', () => {
        test('getAll should return all concerts', () => {
            const concerts = concertModel.getAll();
            expect(Array.isArray(concerts)).toBe(true);
            expect(concerts.length).toBeGreaterThan(0);
        });

        test('getById should return a specific concert by ID', () => {
            const concert = concertModel.getById(1);
            expect(concert).toBeDefined();
            expect(concert.id).toBe(1);
            expect(concert.name).toBe("Rock Night");
        });

        test('getById should return undefined for non-existent ID', () => {
            const concert = concertModel.getById(99999);
            expect(concert).toBeUndefined();
        });

        test('create should add a new concert with auto-incremented ID', () => {
            const initialCount = concertModel.getAll().length;
            const maxId = Math.max(...concertModel.getAll().map(c => c.id));

            const newConcert = concertModel.create(testConcert);

            expect(concertModel.getAll().length).toBe(initialCount + 1);
            expect(newConcert.id).toBe(maxId + 1);
            expect(newConcert.name).toBe(testConcert.name);
        });

        test('update should modify an existing concert', () => {
            const id = 1;
            const updateData = { name: "Updated Concert", price: "$100" };

            const updatedConcert = concertModel.update(id, updateData);

            expect(updatedConcert).toBeDefined();
            expect(updatedConcert.id).toBe(id);
            expect(updatedConcert.name).toBe(updateData.name);
            expect(updatedConcert.price).toBe(updateData.price);
            // Verify other fields remain unchanged
            expect(updatedConcert.genre).toBe("Rock");
        });

        test('update should return null for non-existent ID', () => {
            const updatedConcert = concertModel.update(99999, { name: "Not Found" });
            expect(updatedConcert).toBeNull();
        });

        test('delete should remove a concert and return it', () => {
            const id = 1;
            const initialCount = concertModel.getAll().length;

            const deletedConcert = concertModel.delete(id);

            expect(deletedConcert).toBeDefined();
            expect(deletedConcert.id).toBe(id);
            expect(concertModel.getAll().length).toBe(initialCount - 1);
            expect(concertModel.getById(id)).toBeUndefined();
        });

        test('delete should return null for non-existent ID', () => {
            const deletedConcert = concertModel.delete(99999);
            expect(deletedConcert).toBeNull();
        });
    });

    // Filter and search functionality
    describe('Filter Functionality', () => {
        test('filter should work with genre criteria', () => {
            const filtered = concertModel.filter({ genre: "Rock" });

            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(concert => {
                expect(concert.genre.toLowerCase()).toBe("rock");
            });
        });

        test('filter should work with search criteria', () => {
            const filtered = concertModel.filter({ search: "rock" });

            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(concert => {
                expect(
                    concert.name.toLowerCase().includes("rock") ||
                    concert.location.toLowerCase().includes("rock")
                ).toBe(true);
            });
        });

        test('filter should work with combined criteria', () => {
            const filtered = concertModel.filter({
                genre: "Rock",
                search: "night"
            });

            expect(filtered.length).toBeGreaterThan(0);
            filtered.forEach(concert => {
                expect(concert.genre.toLowerCase()).toBe("rock");
                expect(
                    concert.name.toLowerCase().includes("night") ||
                    concert.location.toLowerCase().includes("night")
                ).toBe(true);
            });
        });

        test('filter should return empty array for no matches', () => {
            const filtered = concertModel.filter({
                genre: "NonExistentGenre",
                search: "xyz123"
            });

            expect(filtered).toEqual([]);
        });
    });

    // Live update simulation
    describe('Live Update Simulation', () => {
        test('addRandom should add a new concert with valid data', () => {
            const initialCount = concertModel.getAll().length;

            const newConcert = concertModel.addRandom();

            expect(concertModel.getAll().length).toBe(initialCount + 1);
            expect(newConcert.id).toBeGreaterThan(0);
            expect(newConcert.name).toBeDefined();
            expect(newConcert.genre).toBeDefined();
            expect(newConcert.price).toMatch(/^\$\d+$/);
            expect(newConcert.location).toBeDefined();
            expect(newConcert.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(newConcert.imageUrl).toBeDefined();
        });

        test('removeRandom should remove a random concert', () => {
            const initialCount = concertModel.getAll().length;
            const initialIds = new Set(concertModel.getAll().map(c => c.id));

            const removedConcert = concertModel.removeRandom();

            expect(concertModel.getAll().length).toBe(initialCount - 1);
            expect(initialIds.has(removedConcert.id)).toBe(true);
            expect(concertModel.getById(removedConcert.id)).toBeUndefined();
        });

        test('removeRandom should return null if no concerts remain', () => {
            // Empty the concerts array
            while (concertModel.getAll().length > 0) {
                concertModel.getAll().pop();
            }

            const result = concertModel.removeRandom();

            expect(result).toBeNull();
        });



        test('updateRandomPrice should return null if no concerts exist', () => {
            // Empty the concerts array
            while (concertModel.getAll().length > 0) {
                concertModel.getAll().pop();
            }

            const result = concertModel.updateRandomPrice();

            expect(result).toBeNull();
        });
    });

    // Timestamp tracking
    describe('Timestamp Tracking', () => {
        test('getLastUpdateTime should return the current timestamp', () => {
            const timestamp = concertModel.getLastUpdateTime();
            expect(timestamp).toBe(1234567890);
        });

        test('create should update the timestamp', () => {
            Date.now = jest.fn().mockReturnValue(9876543210);

            concertModel.create(testConcert);

            expect(concertModel.getLastUpdateTime()).toBe(9876543210);
        });

        test('update should update the timestamp', () => {
            Date.now = jest.fn().mockReturnValue(8765432109);

            concertModel.update(1, { name: "Updated Concert" });

            expect(concertModel.getLastUpdateTime()).toBe(8765432109);
        });

        test('delete should update the timestamp', () => {
            Date.now = jest.fn().mockReturnValue(7654321098);

            concertModel.delete(1);

            expect(concertModel.getLastUpdateTime()).toBe(7654321098);
        });
    });

    // Edge cases
    describe('Edge Cases', () => {
        test('create should handle minimal valid data', () => {
            const minimalConcert = {
                name: "Minimal",
                genre: "Test",
                price: "$1",
                location: "Test",
                date: "2025-01-01",
                imageUrl: "/test.jpg"
            };

            const newConcert = concertModel.create(minimalConcert);

            expect(newConcert).toBeDefined();
            expect(newConcert.id).toBeGreaterThan(0);
            expect(newConcert.name).toBe(minimalConcert.name);
        });

        test('create should work with empty array', () => {
            // Empty the concerts array
            while (concertModel.getAll().length > 0) {
                concertModel.getAll().pop();
            }

            const newConcert = concertModel.create(testConcert);

            expect(newConcert).toBeDefined();
            expect(newConcert.id).toBe(1);
            expect(concertModel.getAll().length).toBe(1);
        });

        test('addRandom should work with empty array', () => {
            // Empty the concerts array
            while (concertModel.getAll().length > 0) {
                concertModel.getAll().pop();
            }

            const newConcert = concertModel.addRandom();

            expect(newConcert).toBeDefined();
            expect(newConcert.id).toBe(1);
            expect(concertModel.getAll().length).toBe(1);
        });
    });
});