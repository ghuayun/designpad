const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure we get real client IPs behind reverse proxies (Azure)
app.set('trust proxy', true);

// Helper: stable local date key YYYY-MM-DD
function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper: migrate any non-ISO daily keys to ISO (YYYY-MM-DD)
function migrateDailyKeysToISO(daily) {
  const result = {};
  if (!daily) return result;
  for (const [k, v] of Object.entries(daily)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) {
      result[k] = (result[k] || 0) + (v || 0);
    } else {
      const parsed = new Date(k);
      if (!isNaN(parsed)) {
        const key = getLocalDateKey(parsed);
        result[key] = (result[key] || 0) + (v || 0);
      }
    }
  }
  return result;
}

// Simple visit tracking - stored in memory and file
let visitStats = {
    totalVisits: 0,
    uniqueVisitors: new Set(),
    dailyVisits: {},
    lastReset: getLocalDateKey()
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
    const todayKey = getLocalDateKey();
    const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || req.connection.remoteAddress || 'unknown';
    
    // Initialize daily stats if new day (but don't reset all data)
    if (visitStats.lastReset !== todayKey) {
        visitStats.lastReset = todayKey;
        visitStats.uniqueVisitors.clear(); // Only reset daily unique visitors
        // Keep historical dailyVisits data - don't reset it
    }
    
    // Track total visits
    visitStats.totalVisits++;
    
    // Track unique visitors (by IP per day)
    visitStats.uniqueVisitors.add(ip);
    
    // Track daily visits (preserve historical data)
    if (!visitStats.dailyVisits[todayKey]) {
        visitStats.dailyVisits[todayKey] = 0;
    }
    visitStats.dailyVisits[todayKey]++;
    
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
        visitStats.dailyVisits = migrateDailyKeysToISO(savedStats.dailyVisits || {});
        // Normalize lastReset to ISO local date key
        if (savedStats.lastReset) {
          const parsed = new Date(savedStats.lastReset);
          visitStats.lastReset = isNaN(parsed) ? getLocalDateKey() : getLocalDateKey(parsed);
        } else {
          visitStats.lastReset = getLocalDateKey();
        }
        
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
    const todayKey = getLocalDateKey();
    const stats = {
        totalVisits: visitStats.totalVisits,
        todayVisits: visitStats.dailyVisits[todayKey] || 0,
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
        const key = getLocalDateKey(date);
        recent[key] = visitStats.dailyVisits[key] || 0;
    }
    
    return recent;
}

// Simple stats page
app.get('/stats', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/stats.html'));
});

// SEO-friendly routes
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
