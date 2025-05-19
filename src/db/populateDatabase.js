const { faker } = require('@faker-js/faker');
const { Pool } = require('pg');


let pool;
if (process.env.DATABASE_URL) {
    // Production configuration with DATABASE_URL from Render
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    // Local development fallback
    const config = {
        user: process.env.DB_USER || 'postgres' || 'bogdan',
        password: process.env.DB_PASSWORD || 'Bog022004',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'MPPConcerts'
    };
    pool = new Pool(config);
}
const BATCH_SIZE = 5000;
const TARGET_CONCERTS = 150000;

async function populateDatabase() {
    console.log('Starting massive data generation...');
    const startTime = Date.now();

    try {
        const genresResult = await pool.query('SELECT id FROM genres');
        const genres = genresResult.rows;
        console.log(`Found ${genres.length} genres`);

        let insertedCount = 0;
        while (insertedCount < TARGET_CONCERTS) {
            const values = [];
            const params = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const genreId = genres[Math.floor(Math.random() * genres.length)].id;
                const title = faker.music.songName();
                const price = parseFloat((10 + Math.random() * 200).toFixed(2));
                const venue = `${faker.location.city()} ${faker.company.name()} Arena`;

                // Random date in the next 3 years
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 1095));
                const date = futureDate.toISOString().split('T')[0];

                const imageId = Math.floor(Math.random() * 20) + 1;
                const imageUrl = `https://example.com/concerts/image${imageId}.jpg`;

                // Current timestamp for created_at and updated_at
                const now = new Date().toISOString();

                // Build parameters array - now 8 parameters per record
                const offset = i * 8;
                params.push(title, genreId, price, venue, date, imageUrl, now, now);
                values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
            }

            // Execute batch insert
            const query = `
                INSERT INTO concerts (title, genre_id, price, venue, date, image_url, created_at, updated_at)
                VALUES ${values.join(', ')}
            `;

            await pool.query(query, params);
            insertedCount += BATCH_SIZE;
            console.log(`Inserted ${insertedCount} concerts...`);
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`Data generation complete! ${insertedCount} concerts inserted in ${duration} seconds`);

        // Create performance-optimizing indexes
        await createOptimizedIndexes();

    } catch (error) {
        console.error('Error generating data:', error);
    } finally {
        await pool.end();
    }
}

async function createOptimizedIndexes() {
    console.log('Creating optimized database indexes...');

    try {
        // Create extension for text search optimization
        await pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

        // Standard indexes for frequently queried columns
        await pool.query('CREATE INDEX IF NOT EXISTS idx_concerts_genre_id ON concerts(genre_id)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_concerts_date ON concerts(date)');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_concerts_price ON concerts(price)');

        // Trigram index for text search on venue
        await pool.query('CREATE INDEX IF NOT EXISTS idx_concerts_venue_trgm ON concerts USING gin(venue gin_trgm_ops)');

        // Create statistics materialized view for fast reporting
        await pool.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS concert_statistics AS
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
      WITH DATA
    `);

        // Index the materialized view
        await pool.query('CREATE INDEX IF NOT EXISTS idx_concert_stats_genre ON concert_statistics(genre_name)');

        console.log('Optimization complete! Database is now indexed for performance.');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

populateDatabase();