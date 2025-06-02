// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authModel = require('../models/auth');
const { authenticateToken } = require('../middleware/auth');
const { getPool } = require('../db/database');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const result = await authModel.register(email, password, name);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.status(201).json(result);
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
// router.post('/login', async (req, res) => {
//     try {
//         const { email, password } = req.body;
//
//         if (!email || !password) {
//             return res.status(400).json({ error: 'Email and password are required' });
//         }
//
//         const result = await authModel.login(email, password);
//
//         if (result.error) {
//             return res.status(401).json({ error: result.error });
//         }
//
//         res.json(result);
//     } catch (error) {
//         console.error('Authentication error:', error);
//         res.status(500).json({ error: 'Authentication failed' });
//     }
// });

// Get current user (protected route example)
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});


// Setup 2FA for a user
router.post('/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const result = await authModel.setupTwoFactorAuth(req.user.id);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('2FA setup error:', error);
        res.status(500).json({ error: '2FA setup failed' });
    }
});

// Verify and enable 2FA
router.post('/2fa/verify', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification code is required' });
        }

        const result = await authModel.verifyAndEnableTwoFactorAuth(req.user.id, token);

        if (result.error) {
            return res.status(400).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('2FA verification error:', error);
        res.status(500).json({ error: '2FA verification failed' });
    }
});

// Updated login endpoint to handle 2FA
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await authModel.loginWith2FA(email, password);

        if (result.error) {
            return res.status(401).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Complete login with 2FA code
router.post('/2fa/login', async (req, res) => {
    try {
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ error: 'User ID and verification code are required' });
        }

        const result = await authModel.verifyTwoFactorCode(userId, token);

        if (result.error) {
            return res.status(401).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('2FA login error:', error);
        res.status(500).json({ error: '2FA login failed' });
    }
});

// Add this to src/routes/authRoutes.js
router.get('/2fa/qrcode', authenticateToken, async (req, res) => {
    try {
        const pool = getPool();

        // Get the user's 2FA secret
        const result = await pool.query(
            'SELECT two_factor_secret, email FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].two_factor_secret) {
            return res.status(404).json({ error: 'No 2FA secret found' });
        }

        const { two_factor_secret, email } = result.rows[0];

        // Generate the otpauth URL
        const otpauthUrl = `otpauth://totp/YourApp:${email}?secret=${two_factor_secret}&issuer=YourApp`;

        // Generate QR code
        const { generateQRCode } = require('../utils/twoFactorAuth');
        const qrCode = await generateQRCode(otpauthUrl);

        res.json({ qrCode });
    } catch (error) {
        console.error('Error retrieving QR code:', error);
        res.status(500).json({ error: 'Failed to retrieve QR code' });
    }
});

module.exports = router;