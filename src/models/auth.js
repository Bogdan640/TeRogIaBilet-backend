// src/models/auth.js
const bcrypt = require('bcrypt');
const { getPool } = require('../db/database'); // Import getPool instead of pool
const { generateToken } = require('../utils/jwt');
const { generateSecret, generateQRCode, verifyToken } = require('../utils/twoFactorAuth');

async function register(email, password, name) {
    try {
        const pool = getPool(); // Get the pool instance

        // Check if user already exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return { error: 'User already exists' };
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert the new user
        const result = await pool.query(
            'INSERT INTO users (email, password, name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, name',
            [email, hashedPassword, name]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = generateToken({ id: user.id, email: user.email });

        return { user, token };
    } catch (error) {
        console.error('Registration error:', error);
        return { error: 'Registration failed' };
    }
}

async function login(email, password) {
    try {
        const pool = getPool(); // Get the pool instance

        // Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return { error: 'Invalid credentials' };
        }

        const user = result.rows[0];

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return { error: 'Invalid credentials' };
        }

        // Generate JWT token
        const token = generateToken({ id: user.id, email: user.email });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            token
        };
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Login failed' };
    }
}

async function setupTwoFactorAuth(userId) {
    try {
        const pool = getPool(); // Get the pool instance

        // Get user email
        const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            return { error: 'User not found' };
        }

        const email = userResult.rows[0].email;

        // Generate 2FA secret
        const secret = generateSecret(email);

        // Generate QR code
        const qrCode = await generateQRCode(secret.otpauth_url);

        // Store the secret temporarily (will be confirmed when user verifies)
        await pool.query(
            'UPDATE users SET temp_two_factor_secret = $1, two_factor_enabled = false WHERE id = $2',
            [secret.base32, userId]
        );

        return {
            secret: secret.base32,
            qrCode
        };
    } catch (error) {
        console.error('2FA setup error:', error);
        return { error: '2FA setup failed' };
    }
}

async function verifyAndEnableTwoFactorAuth(userId, token) {
    try {
        const pool = getPool(); // Get the pool instance

        // Get user and temp secret
        const userResult = await pool.query(
            'SELECT temp_two_factor_secret FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].temp_two_factor_secret) {
            return { error: 'No 2FA setup in progress' };
        }

        const secret = userResult.rows[0].temp_two_factor_secret;

        // Verify token
        const isValid = verifyToken(token, secret);

        if (!isValid) {
            return { error: 'Invalid verification code' };
        }

        // Activate 2FA
        await pool.query(
            'UPDATE users SET two_factor_secret = temp_two_factor_secret, temp_two_factor_secret = NULL, two_factor_enabled = true WHERE id = $1',
            [userId]
        );

        return { success: true };
    } catch (error) {
        console.error('2FA verification error:', error);
        return { error: '2FA verification failed' };
    }
}

async function loginWith2FA(email, password) {
    try {
        const pool = getPool(); // Get the pool instance

        // Find user by email
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return { error: 'Invalid credentials' };
        }

        const user = result.rows[0];

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return { error: 'Invalid credentials' };
        }

        // If 2FA is enabled, return partial login success
        if (user.two_factor_enabled) {
            return {
                requireTwoFactor: true,
                userId: user.id,
                tempToken: generateToken({ id: user.id, partial: true }, '5m') // Short-lived token
            };
        }

        // No 2FA, return full login success
        const token = generateToken({ id: user.id, email: user.email });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            token
        };
    } catch (error) {
        console.error('Login error:', error);
        return { error: 'Login failed' };
    }
}

async function verifyTwoFactorCode(userId, token) {
    try {
        const pool = getPool(); // Get the pool instance

        // Get user and 2FA secret
        const userResult = await pool.query(
            'SELECT two_factor_secret FROM users WHERE id = $1 AND two_factor_enabled = true',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return { error: 'User not found or 2FA not enabled' };
        }

        const secret = userResult.rows[0].two_factor_secret;

        // Verify token
        const isValid = verifyToken(token, secret);

        if (!isValid) {
            return { error: 'Invalid verification code' };
        }

        // Get user details for token
        const userDetails = await pool.query(
            'SELECT id, email, name FROM users WHERE id = $1',
            [userId]
        );

        const user = userDetails.rows[0];

        // Generate full access token
        const fullToken = generateToken({ id: user.id, email: user.email });

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            },
            token: fullToken
        };
    } catch (error) {
        console.error('2FA verification error:', error);
        return { error: '2FA verification failed' };
    }
}

// Export all functions
module.exports = {
    register,
    login,
    setupTwoFactorAuth,
    verifyAndEnableTwoFactorAuth,
    loginWith2FA,
    verifyTwoFactorCode
};