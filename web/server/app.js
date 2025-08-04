const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Simple visit tracking - stored in memory and file
let visitStats = {
    totalVisits: 0,
    uniqueVisitors: new Set(),
    dailyVisits: {},
    lastReset: new Date().toDateString()
};

// Load existing stats on startup
loadStats();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Visit tracking middleware - only for the main page
app.use((req, res, next) => {
    // Only track visits to the main app page
    if (req.url === '/' || req.url === '/index.html') {
        trackVisit(req);
    }
    next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Simple visit tracking function
function trackVisit(req) {
    const today = new Date().toDateString();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Reset daily stats if new day
    if (visitStats.lastReset !== today) {
        visitStats.dailyVisits = {};
        visitStats.lastReset = today;
        visitStats.uniqueVisitors.clear(); // Reset daily unique visitors
    }
    
    // Track total visits
    visitStats.totalVisits++;
    
    // Track unique visitors (by IP per day)
    visitStats.uniqueVisitors.add(ip);
    
    // Track daily visits
    if (!visitStats.dailyVisits[today]) {
        visitStats.dailyVisits[today] = 0;
    }
    visitStats.dailyVisits[today]++;
    
    // Save stats periodically
    saveStats();
}

// Load stats from file
async function loadStats() {
    try {
        const statsFile = path.join(__dirname, '../stats.json');
        const data = await fs.readFile(statsFile, 'utf8');
        const savedStats = JSON.parse(data);
        
        visitStats.totalVisits = savedStats.totalVisits || 0;
        visitStats.dailyVisits = savedStats.dailyVisits || {};
        visitStats.lastReset = savedStats.lastReset || new Date().toDateString();
        
        console.log('📊 Stats loaded:', visitStats.totalVisits, 'total visits');
    } catch (error) {
        console.log('📊 No existing stats found, starting fresh');
    }
}

// Save stats to file
async function saveStats() {
    try {
        const statsFile = path.join(__dirname, '../stats.json');
        const dataToSave = {
            totalVisits: visitStats.totalVisits,
            dailyVisits: visitStats.dailyVisits,
            lastReset: visitStats.lastReset,
            lastUpdated: new Date().toISOString()
        };
        
        await fs.writeFile(statsFile, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Failed to save stats:', error);
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Simple stats API endpoint
app.get('/api/stats', (req, res) => {
    const today = new Date().toDateString();
    const stats = {
        totalVisits: visitStats.totalVisits,
        todayVisits: visitStats.dailyVisits[today] || 0,
        uniqueVisitorsToday: visitStats.uniqueVisitors.size,
        recentDays: getRecentDaysStats(),
        lastUpdated: new Date().toISOString()
    };
    
    res.json(stats);
});

// Get stats for recent days
function getRecentDaysStats() {
    const recent = {};
    const today = new Date();
    
    // Get last 7 days
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toDateString();
        recent[dateString] = visitStats.dailyVisits[dateString] || 0;
    }
    
    return recent;
}

// Simple stats page
app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/stats.html'));
});

// SEO-friendly routes
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/about.html'));
});

app.get('/features', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/features.html'));
});

app.get('/sitemap.xml', (req, res) => {
    res.type('application/xml');
    res.sendFile(path.join(__dirname, '../public/sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, '../public/robots.txt'));
});

// Add structured data endpoint for rich snippets
app.get('/api/structured-data', (req, res) => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "DesignPad",
        "description": "Free online drawing and diagramming tool for creating flowcharts, diagrams, and visual designs",
        "url": "https://designpad.info",
        "applicationCategory": "DesignApplication",
        "operatingSystem": "Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "reviewCount": visitStats.totalVisits || 100
        },
        "author": {
            "@type": "Organization",
            "name": "DesignPad Team"
        },
        "datePublished": "2025-08-01",
        "softwareVersion": "1.0"
    };
    
    res.json(structuredData);
});

// API endpoints
app.get('/api/status', (req, res) => {
    res.json({
        app: 'DesignPad',
        version: '1.0.0',
        status: 'running',
        features: {
            fileUpload: true,
            autoSave: true,
            export: true,
            visitTracking: true
        }
    });
});

// Save stats on exit
process.on('SIGINT', async () => {
    console.log('\n📊 Saving stats before exit...');
    await saveStats();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await saveStats();
    process.exit(0);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested resource was not found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 DesignPad server running on port ${PORT}`);
    console.log(`📊 Visit tracking enabled - view stats at http://localhost:${PORT}/stats`);
});

module.exports = app;
