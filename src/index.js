
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDb } = require('./db/database');  // Add this line
const concertRoutes = require('./routes/concertRoutes');
const filtersRoutes = require('./routes/filterRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3001;


// Initialize database connection
initDb()
    .then(() => {
        console.log('Database connection established');
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// Middleware
app.use(bodyParser.json());



const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://te-rog-ia-bilet-b619.vercel.app', 'https://te-rog-ia-bilet.vercel.app']  // Hardcode your frontend URL
        : 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};
     app.use(cors(corsOptions));




// Routes
// Add this before your other routes
app.get('/', (req, res) => {
    res.json({ message: 'API is running. Use /api/concerts, /api/filters, or /api/auth endpoints' });
});
app.use('/api/concerts', concertRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/auth', authRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Server is running' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;