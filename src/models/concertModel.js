const { getPool } = require('../db/database');

// Track last update time for polling
let lastUpdateTime = new Date().toISOString();

const concertModel = {
    getAll: async (filters = {}) => {
        try {
            const pool = getPool();
            let query = `
                SELECT c.id, c.title AS name, g.name AS genre,
                       '$' || CAST(ROUND(c.price::numeric, 2) AS TEXT) AS price,
                       c.venue AS location,
                       TO_CHAR(c.date, 'YYYY-MM-DD') AS date, 
                       c.image_url AS imageUrl
                FROM concerts c
                    JOIN genres g ON c.genre_id = g.id
            `;

            const conditions = [];
            const parameters = [];
            let paramIndex = 1;

            // Apply filters
            if (filters.search) {
                conditions.push(`(c.title ILIKE $${paramIndex} OR g.name ILIKE $${paramIndex} OR c.venue ILIKE $${paramIndex})`);
                parameters.push(`%${filters.search}%`);
                paramIndex++;
            }

            if (filters.genre) {
                const genres = filters.genre.split(',');
                const genreConditions = [];

                genres.forEach(genre => {
                    genreConditions.push(`g.name = $${paramIndex}`);
                    parameters.push(genre.trim());
                    paramIndex++;
                });

                conditions.push(`(${genreConditions.join(' OR ')})`);
            }

            if (filters.city) {
                conditions.push(`c.venue ILIKE $${paramIndex}`);
                parameters.push(`%${filters.city}%`);
                paramIndex++;
            }

            if (filters.country) {
                conditions.push(`c.venue ILIKE $${paramIndex}`);
                parameters.push(`%${filters.country}%`);
                paramIndex++;
            }

            // Add WHERE clause if any conditions exist
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }

            // Add ordering
            query += ' ORDER BY c.date DESC';

            const result = await pool.query(query, parameters);
            return result.rows;
        } catch (error) {
            console.error('Error in getAll:', error);
            throw error;
        }
    },

    getById: async (id) => {
        try {
            const pool = getPool();
            const result = await pool.query(`
                SELECT c.id, c.title AS name, g.name AS genre,
                       '$' || CAST(ROUND(c.price::numeric, 2) AS TEXT) AS price,
                       c.venue AS location,
                       TO_CHAR(c.date, 'YYYY-MM-DD') AS date, 
                       c.image_url AS imageUrl
                FROM concerts c
                    JOIN genres g ON c.genre_id = g.id
                WHERE c.id = $1
            `, [id]);

            return result.rows[0];
        } catch (error) {
            console.error('Error in getById:', error);
            throw error;
        }
    },

    create: async (concertData) => {
        try {
            const pool = getPool();
            const { name, genre, price, location, date, imageUrl } = concertData;

            // Start a transaction
            const client = await pool.connect();
            await client.query('BEGIN');

            try {
                // First get or create the genre
                let genreId;
                const genreResult = await client.query(
                    'SELECT id FROM genres WHERE name = $1',
                    [genre]
                );

                if (genreResult.rows.length > 0) {
                    genreId = genreResult.rows[0].id;
                } else {
                    // Create new genre
                    const newGenreResult = await client.query(
                        'INSERT INTO genres (name) VALUES ($1) RETURNING id',
                        [genre]
                    );
                    genreId = newGenreResult.rows[0].id;
                }

                // Clean price value (remove $ sign)
                const cleanPrice = price.replace(/[$,]/g, '');

                // Insert concert
                const result = await client.query(`
                    INSERT INTO concerts (title, genre_id, price, venue, date, image_url, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                        RETURNING id
                `, [name, genreId, parseFloat(cleanPrice), location, date, imageUrl]);

                await client.query('COMMIT');
                client.release();

                const newId = result.rows[0].id;
                lastUpdateTime = new Date().toISOString();

                // Return the concert with the format expected by the frontend
                return {
                    id: newId,
                    name,
                    genre,
                    price: `$${parseFloat(cleanPrice).toFixed(2)}`,
                    location,
                    date,
                    imageUrl
                };
            } catch (err) {
                await client.query('ROLLBACK');
                client.release();
                throw err;
            }
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    },

    update: async (id, concertData) => {
        try {
            const pool = getPool();
            const { name, genre, price, location, date, imageUrl } = concertData;

            // Start a transaction
            const client = await pool.connect();
            await client.query('BEGIN');

            try {
                // First get or create the genre
                let genreId;
                const genreResult = await client.query(
                    'SELECT id FROM genres WHERE name = $1',
                    [genre]
                );

                if (genreResult.rows.length > 0) {
                    genreId = genreResult.rows[0].id;
                } else {
                    // Create new genre
                    const newGenreResult = await client.query(
                        'INSERT INTO genres (name) VALUES ($1) RETURNING id',
                        [genre]
                    );
                    genreId = newGenreResult.rows[0].id;
                }

                // Clean price value (remove $ sign)
                const cleanPrice = price.replace(/[$,]/g, '');

                // Update concert
                await client.query(`
                    UPDATE concerts
                    SET title = $1,
                        genre_id = $2,
                        price = $3,
                        venue = $4,
                        date = $5,
                        image_url = $6,
                        updated_at = NOW()
                    WHERE id = $7
                `, [name, genreId, parseFloat(cleanPrice), location, date, imageUrl, id]);

                // Check if record was updated
                const checkResult = await client.query(
                    'SELECT COUNT(*) AS count FROM concerts WHERE id = $1',
                    [id]
                );

                await client.query('COMMIT');
                client.release();

                if (parseInt(checkResult.rows[0].count) === 0) {
                    return null;
                }

                lastUpdateTime = new Date().toISOString();

                // Return the updated concert with the format expected by the frontend
                return {
                    id,
                    name,
                    genre,
                    price: `$${parseFloat(cleanPrice).toFixed(2)}`,
                    location,
                    date,
                    imageUrl
                };
            } catch (err) {
                await client.query('ROLLBACK');
                client.release();
                throw err;
            }
        } catch (error) {
            console.error('Error in update:', error);
            throw error;
        }
    },

    delete: async (id) => {
        try {
            const pool = getPool();

            // Get concert before deletion
            const concert = await concertModel.getById(id);
            if (!concert) return null;

            await pool.query('DELETE FROM concerts WHERE id = $1', [id]);

            lastUpdateTime = new Date().toISOString();
            return concert;
        } catch (error) {
            console.error('Error in delete:', error);
            throw error;
        }
    },

    addRandom: async () => {
        const genres = ['Rock', 'Jazz', 'Pop', 'Hip Hop', 'Classical'];
        const locations = ['New York', 'Los Angeles', 'Chicago', 'London', 'Paris'];

        const randomConcert = {
            name: `Concert ${Math.floor(Math.random() * 1000)}`,
            genre: genres[Math.floor(Math.random() * genres.length)],
            price: `$${(Math.random() * 100).toFixed(2)}`,
            location: locations[Math.floor(Math.random() * locations.length)],
            date: new Date(Date.now() + Math.floor(Math.random() * 30) * 86400000).toISOString().split('T')[0],
            imageUrl: `/images/concert${Math.floor(Math.random() * 5) + 1}.jpg`
        };

        return await concertModel.create(randomConcert);
    },

    removeRandom: async () => {
        try {
            const pool = getPool();
            const result = await pool.query('SELECT id FROM concerts ORDER BY RANDOM() LIMIT 1');

            if (result.rows.length === 0) return null;

            const idToRemove = result.rows[0].id;
            return await concertModel.delete(idToRemove);
        } catch (error) {
            console.error('Error in removeRandom:', error);
            throw error;
        }
    },

    updateRandomPrice: async () => {
        try {
            const pool = getPool();
            const result = await pool.query('SELECT id FROM concerts ORDER BY RANDOM() LIMIT 1');

            if (result.rows.length === 0) return null;

            const idToUpdate = result.rows[0].id;

            const concert = await concertModel.getById(idToUpdate);
            const newPrice = `$${(Math.random() * 100).toFixed(2)}`;

            return await concertModel.update(idToUpdate, {
                ...concert,
                price: newPrice
            });
        } catch (error) {
            console.error('Error in updateRandomPrice:', error);
            throw error;
        }
    },

    getLastUpdateTime: () => {
        return lastUpdateTime;
    },


    getStatisticsUnoptimized: async () => {
        try {
            const startTime = process.hrtime();

            const pool = getPool();
            const genreStatsResult = await pool.query(`
      SELECT 
        g.name AS genre_name,
        COUNT(c.id) AS concert_count,
        MIN(c.price) AS min_price,
        MAX(c.price) AS max_price,
        AVG(c.price) AS avg_price,
        COUNT(CASE WHEN c.date >= CURRENT_DATE THEN 1 END) AS upcoming_concerts,
        COUNT(CASE WHEN c.date < CURRENT_DATE THEN 1 END) AS past_concerts
      FROM concerts c
      JOIN genres g ON c.genre_id = g.id
      GROUP BY g.name
    `);

            const venuesResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT venue) AS unique_venues,
        MIN(date) AS earliest_date,
        MAX(date) AS latest_date,
        COUNT(*) AS total_concerts
      FROM concerts
    `);

            const elapsed = process.hrtime(startTime);
            const executionTime = (elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2);

            return {
                genreStats: genreStatsResult.rows,
                venueStats: venuesResult.rows[0],
                executionTime: `${executionTime}ms`
            };
        } catch (error) {
            console.error('Error getting unoptimized statistics:', error);
            throw error;
        }
    },

// Optimized statistics method using materialized view
    getStatisticsOptimized: async () => {
        try {
            const startTime = process.hrtime();

            const pool = getPool();

            // Refresh the materialized view (in production, this would be on a schedule)
            await pool.query('REFRESH MATERIALIZED VIEW concert_statistics');

            // Query from materialized view
            const genreStatsResult = await pool.query(`
      SELECT * FROM concert_statistics ORDER BY concert_count DESC
    `);

            // For overall stats, use indexed queries
            const venuesResult = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT venue) FROM concerts) AS unique_venues,
        (SELECT MIN(date) FROM concerts) AS earliest_date,
        (SELECT MAX(date) FROM concerts) AS latest_date,
        (SELECT COUNT(*) FROM concerts) AS total_concerts
    `);

            const elapsed = process.hrtime(startTime);
            const executionTime = (elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2);

            return {
                genreStats: genreStatsResult.rows,
                venueStats: venuesResult.rows[0],
                executionTime: `${executionTime}ms`
            };
        } catch (error) {
            console.error('Error getting optimized statistics:', error);
            throw error;
        }
    },

// Statistics comparison method
    getStatisticsComparison: async () => {
        try {
            const unoptimizedStats = await concertModel.getStatisticsUnoptimized();
            const optimizedStats = await concertModel.getStatisticsOptimized();

            // Calculate improvement
            const unoptimizedTime = parseFloat(unoptimizedStats.executionTime);
            const optimizedTime = parseFloat(optimizedStats.executionTime);
            const improvement = ((unoptimizedTime - optimizedTime) / unoptimizedTime * 100).toFixed(2);

            return {
                unoptimized: {
                    executionTime: unoptimizedStats.executionTime,
                    totalRecords: unoptimizedStats.venueStats.total_concerts
                },
                optimized: {
                    executionTime: optimizedStats.executionTime,
                    totalRecords: optimizedStats.venueStats.total_concerts
                },
                improvement: {
                    percent: `${improvement}%`,
                    timeSaved: `${(unoptimizedTime - optimizedTime).toFixed(2)}ms`
                },
                sampleData: {
                    unoptimized: unoptimizedStats.genreStats[0],
                    optimized: optimizedStats.genreStats[0]
                }
            };
        } catch (error) {
            console.error('Error comparing statistics:', error);
            throw error;
        }
    }
};

module.exports = concertModel;