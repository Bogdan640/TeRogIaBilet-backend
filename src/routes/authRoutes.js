const express = require('express');
const router = express.Router();
const authModel = require('../models/auth');

router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = authModel.login(email, password);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Verify token for protected routes
router.get('/verify', (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = parseInt(authHeader.split(' ')[1], 10);
        const user = authModel.getUserById(userId);

        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.json({ valid: true, user });
    } catch (error) {
        res.status(500).json({ error: 'Token verification failed' });
    }
});

module.exports = router;