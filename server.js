/**
 * CINTENT Developer Platform v2 - Simple Express Server
 * Copy to server.js for Hostinger deployment
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        'https://api-cintent.cognivantalabs.com',
        'https://cintent.cognivantalabs.com',
        'https://cognivantalabs.com',
        'http://localhost:3000',
        'http://localhost:8080'
    ],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes - Frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CINTENT-DEVELOPER-PLATFORM-V2.html'));
});

app.get('/platform', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CINTENT-DEVELOPER-PLATFORM-V2.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'CINTENT-ADMIN-GOVERNANCE-CONSOLE.html'));
});

// Routes - API
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        environment: NODE_ENV
    });
});

app.get('/api/status', (req, res) => {
    res.json({
        platform: 'CINTENT Developer Platform v2',
        version: '2.0.0',
        status: 'operational',
        services: {
            authentication: 'ready',
            marketplace: 'ready',
            playground: 'ready',
            billing: 'ready'
        }
    });
});

app.get('/docs', (req, res) => {
    res.json({
        platform: 'CINTENT Developer Platform v2',
        version: '2.0.0',
        endpoints: {
            root: 'GET /',
            platform: 'GET /platform',
            admin: 'GET /admin',
            health: 'GET /api/health',
            status: 'GET /api/status',
            docs: 'GET /docs'
        }
    });
});

// API Stubs - Ready for Implementation
app.post('/api/auth/signup', (req, res) => {
    res.status(501).json({ message: 'Implementation pending', endpoint: 'POST /api/auth/signup' });
});

app.post('/api/auth/login', (req, res) => {
    res.status(501).json({ message: 'Implementation pending', endpoint: 'POST /api/auth/login' });
});

app.get('/api/marketplace/apis', (req, res) => {
    res.json({ apis: [], total: 730, message: 'Implementation pending' });
});

app.post('/api/playground/execute', (req, res) => {
    res.json({ status: 'pending implementation', endpoint: 'POST /api/playground/execute' });
});

app.get('/api/billing/subscription', (req, res) => {
    res.json({ message: 'Implementation pending', endpoint: 'GET /api/billing/subscription' });
});

// Error handling
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        message: `Endpoint ${req.path} does not exist`
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: NODE_ENV === 'production' ? 'An error occurred' : err.message
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═════════════════════════════════════════════════════════╗
║  CINTENT Developer Platform v2                         ║
║  Server running on port ${PORT}                        ║
║  Environment: ${NODE_ENV.toUpperCase()}${' '.repeat(32 - NODE_ENV.length)}║
╚═════════════════════════════════════════════════════════╝

✅ Frontend:
   • Platform: http://localhost:${PORT}/
   • Admin: http://localhost:${PORT}/admin

✅ API:
   • Health: http://localhost:${PORT}/api/health
   • Status: http://localhost:${PORT}/api/status
   • Docs: http://localhost:${PORT}/docs

📍 Hostinger Subdomain:
   • https://api-cintent.cognivantalabs.com

🚀 Ready for connections...
    `);
});

process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    server.close(() => process.exit(0));
});

module.exports = app;
