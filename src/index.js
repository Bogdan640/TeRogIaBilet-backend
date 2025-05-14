// //index.js
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const concertRoutes = require('./routes/concertRoutes');
// const filtersRoutes = require('../src/routes/filterRoutes');
// const authRoutes = require('./routes/authRoutes');
//
// const app = express();
// const PORT = process.env.PORT || 3001; // Changed to 3001 to avoid conflicts with frontend dev server
//
// // Middleware
// app.use(bodyParser.json());
// app.use(cors({
//     origin: 'http://localhost:5173', // Your Vite frontend URL
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type']
// }));
//
// // Routes
// app.use('/api/concerts', concertRoutes);
// app.use('/api/filters', filtersRoutes);
// app.use('/api/auth', authRoutes);
//
// // Health check route
// app.get('/health', (req, res) => {
//     res.json({ status: 'Server is running' });
// });
//
// // Start server
// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });
//
//
//
// app.get('/api/test', (req, res) => {
//     res.json({ message: 'Server is working' });
// });
//
// // app.use(cors({
// //     origin: 'http://localhost:5173', // Your Vite frontend URL
// //     methods: ['GET', 'POST', 'PUT', 'DELETE'],
// //     allowedHeaders: ['Content-Type', 'Authorization']
// // }));
//
// // In your backend index.js file
// const corsOptions = {
//     origin: 'http://localhost:5173',
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     credentials: true,
//     preflightContinue: false,
//     optionsSuccessStatus: 204
// };
//
// app.use(cors(corsOptions));


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

// CORS setup
const corsOptions = {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Routes
app.use('/api/concerts', concertRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/auth', authRoutes);

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running' });
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;