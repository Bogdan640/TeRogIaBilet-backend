const { Pool } = require('pg');

// PostgreSQL connection configuration
let pool = null;

const initDb = async () => {
    try {
        if (!pool) {
            console.log('Attempting to connect to PostgreSQL...');

            // Use environment variables in production, fallback to local config for development
            if (process.env.DATABASE_URL) {
                // Production configuration with DATABASE_URL from Render
                console.log('Using production database connection');
                pool = new Pool({
                    connectionString: process.env.DATABASE_URL,
                    ssl: { rejectUnauthorized: false } // Required for most cloud DB providers
                });
            } else {
                // Local development configuration
                const config = {
                    user: 'postgres',
                    password: 'Bog022004',
                    host: 'localhost',
                    port: 5432,
                    database: 'MPPConcerts'
                };

                console.log('Using local database connection');
                console.log('Connection config:', JSON.stringify({
                    host: config.host,
                    port: config.port,
                    database: config.database,
                    user: config.user
                }));

                // Connect to postgres database first to create our database if needed
                const pgPool = new Pool({
                    ...config,
                    database: 'postgres'
                });

                // Check if our database exists
                const dbResult = await pgPool.query(
                    `SELECT 1 FROM pg_database WHERE datname = 'mppconcerts'`
                );

                if (dbResult.rowCount === 0) {
                    console.log('Creating MPPConcerts database...');
                    await pgPool.query('CREATE DATABASE mppconcerts');
                }

                await pgPool.end();

                // Connect to our database
                pool = new Pool(config);
            }

            // Create tables if they don't exist
            await createTables();

            // Update existing users to have 2FA enabled by default
            await updateExistingUsersFor2FA();

            // Insert sample data if needed
            await insertSampleData();
        }
        console.log('Database connection initialized successfully');
        return pool;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
};

const createTables = async () => {
    // Create users table first (no dependencies)
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
                                             id SERIAL PRIMARY KEY,
                                             email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            temp_two_factor_secret VARCHAR(255),
            two_factor_secret VARCHAR(255),
            two_factor_enabled BOOLEAN DEFAULT TRUE,  -- Changed from FALSE to TRUE
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
            )
    `;

    const createGenresTable = `
        CREATE TABLE IF NOT EXISTS genres (
                                              id SERIAL PRIMARY KEY,
                                              name VARCHAR(100) NOT NULL UNIQUE
            )
    `;

    const createConcertsTable = `
        CREATE TABLE IF NOT EXISTS concerts (
                                                id SERIAL PRIMARY KEY,
                                                title VARCHAR(100) NOT NULL,
            genre_id INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            venue VARCHAR(100) NOT NULL,
            date DATE NOT NULL,
            image_url VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            FOREIGN KEY (genre_id) REFERENCES genres(id)
            )
    `;

    await pool.query(createUsersTable);
    await pool.query(createGenresTable);
    await pool.query(createConcertsTable);
    console.log('Tables created successfully');
};

// New function to update existing users
const updateExistingUsersFor2FA = async () => {
    try {
        // Update all existing users to have 2FA enabled by default
        const updateResult = await pool.query(`
            UPDATE users 
            SET two_factor_enabled = TRUE 
            WHERE two_factor_enabled = FALSE OR two_factor_enabled IS NULL
        `);

        if (updateResult.rowCount > 0) {
            console.log(`Updated ${updateResult.rowCount} existing users to have 2FA enabled by default`);
        }
    } catch (error) {
        console.error('Error updating existing users for 2FA:', error);
    }
};

const insertSampleData = async () => {
    // Check if we already have data
    const result = await pool.query('SELECT COUNT(*) FROM genres');
    if (parseInt(result.rows[0].count) > 0) {
        console.log('Sample data already exists');
        return;
    }

    // Insert genres
    const insertGenres = `
        INSERT INTO genres (name) VALUES
            ('Rock'), ('Pop'), ('Hip-Hop'), ('Jazz'), ('Classical'),
            ('Electronic'), ('Country'), ('R&B'), ('Metal'), ('Folk')
    `;
    await pool.query(insertGenres);

    // Insert concerts
    const insertConcerts = `
        INSERT INTO concerts (title, genre_id, price, venue, date, image_url) VALUES
            ('Summer Rock Fest', 1, 59.99, 'City Arena', '2023-07-15', 'https://example.com/rock.jpg'),
            ('Pop Extravaganza', 2, 79.99, 'Downtown Stadium', '2023-08-20', 'https://example.com/pop.jpg'),
            ('Hip-Hop Showcase', 3, 49.99, 'Urban Center', '2023-06-30', 'https://example.com/hiphop.jpg'),
            ('Jazz Night', 4, 39.99, 'Blue Note Club', '2023-09-10', 'https://example.com/jazz.jpg'),
            ('Symphony Orchestra', 5, 89.99, 'Grand Hall', '2023-10-05', 'https://example.com/classical.jpg'),
            ('Electronic Dance Festival', 6, 69.99, 'Tech Pavilion', '2023-08-05', 'https://example.com/electronic.jpg'),
            ('Country Music Fair', 7, 44.99, 'Ranch Stadium', '2023-07-25', 'https://example.com/country.jpg'),
            ('R&B Soulful Night', 8, 54.99, 'Soul Lounge', '2023-09-22', 'https://example.com/rnb.jpg'),
            ('Metal Mayhem', 9, 64.99, 'Dark Arena', '2023-10-31', 'https://example.com/metal.jpg'),
            ('Folk Festival', 10, 34.99, 'Heritage Park', '2023-06-18', 'https://example.com/folk.jpg')
    `;
    await pool.query(insertConcerts);

    console.log('Sample data inserted successfully');
};

const getPool = () => {
    if (!pool) {
        throw new Error('Database not initialized. Call initDb first.');
    }
    return pool;
};

module.exports = { initDb, getPool };