const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { initDb, Url, Incident } = require('./db');
const { initScheduler, updateAllUrls, checkAndSendExpirationAlerts, pollServiceHealth, syncIncidentsFromSheet } = require('./scheduler');
const { checkSSL, checkServiceHealth } = require('./sslService');
const { seedIncidents, syncIncidentsFromSheet: syncFromSheet } = require('./incidentService');
const { sendTelegramMessage } = require('./telegramService');
const { getVpnUsage } = require('./vpnService');
const { validateUrl, validateBulkUrls, validateIncident, validateIncidentUpdate } = require('./middleware/validation');
const { apiLimiter, writeLimiter, bulkLimiter } = require('./middleware/rateLimit');
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = 3001;
const HOST = '0.0.0.0';

// Serve production frontend build
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Keep unsafe-inline for now to not break UI
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "ws:", "wss:", "http:"], // Allow API connections
      fontSrc: ["'self'", "data:", "https:"],
      workerSrc: ["'self'", "blob:"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false // Disable for compatibility
}));

// CORS configuration - restrict to known origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3001',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:8082',
  'http://10.201.50.88:3001',
  'http://10.201.50.88:8080',
  'http://10.201.50.88:8081',
  'http://10.201.50.88:8082',
  'https://ddpmsoc.ngrok.app',
  'http://ddpmsoc.ngrok.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow same-origin requests (no origin header when frontend served from same server)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

// Reduce request size limit for security (10MB is too high)
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Send startup notification to Telegram
const sendStartupNotification = async () => {
    const os = require('os');
    const hostname = os.hostname();
    const now = new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'medium',
        timeStyle: 'medium'
    });
    
    const message = `🚀 <b>Sentinel Dashboard Started</b>\n\n` +
        `✅ All systems are online!\n\n` +
        `📊 <b>Status:</b>\n` +
        `   • Backend API: Running on port ${PORT}\n` +
        `   • Database: Connected\n` +
        `   • Scheduler: Active\n` +
        `   • SSL Monitor: Ready\n\n` +
        `🖥️ <b>Host:</b> ${hostname}\n` +
        `🕐 <b>Time:</b> ${now}\n` +
        `🌐 <b>URL:</b> https://ddpmsoc.ngrok.app\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 Scheduled tasks:\n` +
        `   • SSL Check: Daily at midnight\n` +
        `   • Expiration Alerts: Weekdays 10:00 AM`;
    
    await sendTelegramMessage(message);
};

// Initialize DB and Scheduler
const startServer = async () => {
    await initDb();
    await seedIncidents(); // Seed data if empty
    initScheduler();
    
    // Send startup notification after a short delay to ensure everything is ready
    setTimeout(() => {
        sendStartupNotification().catch(err => {
            console.error('Failed to send startup notification:', err);
        });
    }, 3000);
};
startServer();

// --- INCIDENT ROUTES ---

// GET all incidents
app.get('/api/incidents', asyncHandler(async (req, res) => {
    const incidents = await Incident.findAll({ order: [['createdAt', 'DESC']] });
    res.json(incidents);
}));

// POST create incident
app.post('/api/incidents', writeLimiter, validateIncident, asyncHandler(async (req, res) => {
    const { title, description, severity, type, sourceIP, destinationIPs, country, responder } = req.body;

    // Auto-generate next ID
    const allIncidents = await Incident.findAll({ attributes: ['id'] });
    let maxNum = 0;
    allIncidents.forEach(inc => {
        const match = inc.id.match(/INC-(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
        }
    });
    const newId = `INC-${String(maxNum + 1).padStart(3, '0')}`;

    const newIncident = await Incident.create({
        id: newId,
        title,
        description: description || `Security incident detected: ${type}. Source: ${sourceIP}`,
        severity,
        status: 'open',
        type,
        sourceIP,
        destinationIPs: destinationIPs || [],
        country: country || 'Unknown',
        responder: responder || 'Unassigned',
        responseTime: null,
        responseStatus: 'pending',
        notes: '',
        timelineEvents: [],
    });

    res.status(201).json(newIncident);
}));

// Allowed status transitions for user-driven updates. Sync (syncIncidentsFromSheet) bypasses this.
const STATUS_TRANSITIONS = {
    open: ['investigating'],
    investigating: ['open', 'resolved'],
    resolved: ['investigating', 'closed'],
    closed: ['open']
};

// PUT update incident with optimistic concurrency + state-machine
app.put('/api/incidents/:id', writeLimiter, validateIncidentUpdate, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const body = req.body || {};

    // OCC precondition: client must submit its known version.
    if (body.version === undefined || body.version === null) {
        return res.status(428).json({ error: 'Missing version — include the incident\'s current version in the request body (optimistic concurrency).' });
    }
    const clientVersion = Number(body.version);

    // Include soft-deleted so we can return 410 rather than 404 for deleted rows.
    const incident = await Incident.findByPk(id, { paranoid: false });
    if (!incident) {
        return res.status(404).json({ error: 'Incident not found' });
    }
    if (incident.deletedAt) {
        return res.status(410).json({ error: 'Incident has been deleted' });
    }

    // State-machine check (only for user PUTs; sync has its own rules).
    if (body.status !== undefined && body.status !== incident.status) {
        const allowed = STATUS_TRANSITIONS[incident.status] || [];
        if (!allowed.includes(body.status)) {
            return res.status(400).json({
                error: `Illegal status transition: ${incident.status} → ${body.status}`,
                allowedTransitions: allowed
            });
        }
    }

    // Strip server-managed and non-persisted fields before writing.
    const { version: _v, id: _id, createdAt: _ca, updatedAt: _ua, deletedAt: _da, sheetRowHash: _srh, ...newFields } = body;

    // Race-free compare-and-swap. If another writer beat us, affected === 0 → 409.
    const [affected] = await Incident.update(
        { ...newFields, version: clientVersion + 1 },
        { where: { id, version: clientVersion } }
    );

    if (affected === 0) {
        const current = await Incident.findByPk(id, { paranoid: false });
        res.set('Retry-After', '1');
        return res.status(409).json({
            error: 'Version mismatch — this incident was updated by someone else. Refresh and retry.',
            currentVersion: current ? current.version : null,
            currentIncident: current
        });
    }

    const updated = await Incident.findByPk(id);
    res.json(updated);
}));

// DELETE incident
app.delete('/api/incidents/:id', writeLimiter, asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!/^INC-\d+$/.test(id)) {
        return res.status(400).json({ error: 'Invalid incident ID format' });
    }

    const deleted = await Incident.destroy({ where: { id } });

    if (deleted === 0) {
        return res.status(404).json({ error: 'Incident not found' });
    }

    res.json({ message: 'Incident deleted successfully' });
}));

// POST sync incidents from Google Sheets
app.post('/api/incidents/sync', writeLimiter, asyncHandler(async (req, res) => {
    const result = await syncFromSheet();
    res.json({ message: 'Sync completed', ...result });
}));

// --- URL ROUTES ---

// GET all URLs
app.get('/api/urls', asyncHandler(async (req, res) => {
    const urls = await Url.findAll({ order: [['daysRemaining', 'ASC']] });
    res.json(urls);
}));

// Helper to process a single URL check
const processUrlCheck = async (url) => {
    const result = await checkSSL(url);

    let status = 'PENDING';
    let serviceStatus = 'UNKNOWN';
    let issuer = null;
    let expiryDate = null;
    let validFrom = null;
    let daysRemaining = null;
    let lastError = null;

    // If we got cert info, the service responded (UP)
    if (result.certInfo) {
        serviceStatus = 'UP';
    } else {
        // No cert info means we couldn't connect at all
        serviceStatus = 'DOWN';
    }

    if (result.valid) {
        // Certificate is trusted — show cert details
        issuer = result.issuer;
        expiryDate = result.expiryDate;
        validFrom = result.validFrom;
        daysRemaining = result.daysRemaining;
        status = 'GOOD';
        if (daysRemaining <= 7) status = 'WARNING';
        if (daysRemaining <= 0) status = 'EXPIRED';
    } else {
        // Certificate not valid — clear cert details to avoid misleading display
        issuer = null;
        expiryDate = null;
        validFrom = null;
        daysRemaining = null;
        status = 'ERROR';
        lastError = result.error;
    }

    // Also perform a real HTTP health check
    const health = await checkServiceHealth(url);

    return {
        issuer, expiryDate, validFrom, daysRemaining, status, lastError,
        serviceStatus: health.serviceStatus,
        responseTime: health.responseTime,
        httpStatusCode: health.httpStatusCode,
        lastServiceCheck: new Date(),
        consecutiveFailures: health.serviceStatus === 'DOWN' ? 1 : 0,
    };
};

// POST add URL - with validation and rate limiting
app.post('/api/urls', writeLimiter, validateUrl, asyncHandler(async (req, res) => {
    const { url } = req.body;
    
    const checkData = await processUrlCheck(url);

    const newUrl = await Url.create({
        url,
        ...checkData,
        lastChecked: new Date()
    });

    res.status(201).json(newUrl);
}));

// POST Bulk Import - with validation and stricter rate limiting
app.post('/api/urls/bulk', bulkLimiter, validateBulkUrls, asyncHandler(async (req, res) => {
    const { urls } = req.body;

    const results = [];
    for (const url of urls) {
        try {
            // Validate each URL individually
            if (!url || typeof url !== 'string' || url.trim().length === 0) {
                results.push({ url, status: 'Error', error: 'Invalid URL format' });
                continue;
            }

            // Check if already exists
            const exists = await Url.findOne({ where: { url: url.trim() } });
            if (exists) {
                results.push({ url, status: 'Skipped (Duplicate)' });
                continue;
            }

            const checkData = await processUrlCheck(url.trim());
            await Url.create({
                url: url.trim(),
                ...checkData,
                lastChecked: new Date()
            });
            results.push({ url, status: 'Added' });
        } catch (err) {
            results.push({ url, status: 'Error', error: err.message || 'Unknown error' });
        }
    }

    res.json({ message: 'Bulk import processed', results });
}));

// DELETE URL
app.delete('/api/urls/:id', writeLimiter, asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Validate ID is numeric
    if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: 'Invalid URL ID' });
    }
    
    const deleted = await Url.destroy({ where: { id } });
    
    if (deleted === 0) {
        return res.status(404).json({ error: 'URL not found' });
    }
    
    res.json({ message: 'Deleted successfully' });
}));

// PATCH toggle star on URL
app.patch('/api/urls/:id/star', writeLimiter, asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: 'Invalid URL ID' });
    }

    const urlRecord = await Url.findByPk(id);
    if (!urlRecord) {
        return res.status(404).json({ error: 'URL not found' });
    }

    await urlRecord.update({ starred: !urlRecord.starred });
    res.json(urlRecord);
}));

// POST refresh single URL
app.post('/api/urls/:id/refresh', writeLimiter, asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ error: 'Invalid URL ID' });
    }

    const urlRecord = await Url.findByPk(id);
    if (!urlRecord) {
        return res.status(404).json({ error: 'URL not found' });
    }

    const checkData = await processUrlCheck(urlRecord.url);
    await urlRecord.update({ ...checkData, lastChecked: new Date() });
    res.json(urlRecord);
}));

// POST force refresh
app.post('/api/refresh', writeLimiter, asyncHandler(async (req, res) => {
    // Run refresh asynchronously to not block response
    updateAllUrls().catch(err => {
        console.error('Error refreshing URLs:', err);
    });
    
    res.json({ message: 'Refresh started' });
}));

// POST trigger a service health poll
app.post('/api/health-poll', writeLimiter, asyncHandler(async (req, res) => {
    pollServiceHealth().catch(err => {
        console.error('Error in health poll:', err);
    });
    res.json({ message: 'Health poll started' });
}));

// GET service health status (lightweight endpoint for frontend polling)
app.get('/api/service-status', asyncHandler(async (req, res) => {
    const urls = await Url.findAll({
        attributes: ['id', 'serviceStatus', 'responseTime', 'httpStatusCode', 'lastServiceCheck', 'consecutiveFailures'],
        order: [['id', 'ASC']],
    });
    res.json(urls);
}));

// POST check expiration alerts and send Telegram notification
app.post('/api/check-expiration-alerts', writeLimiter, asyncHandler(async (req, res) => {
    // Run check asynchronously to not block response
    checkAndSendExpirationAlerts().catch(err => {
        console.error('Error checking expiration alerts:', err);
    });
    
    res.json({ message: 'Expiration alert check started' });
}));

// GET ngrok backend URL (for frontend configuration)
app.get('/api/ngrok-backend-url', asyncHandler(async (req, res) => {
    // Try to get from ngrok API
    try {
        const http = require('http');
        const response = await new Promise((resolve, reject) => {
            http.get('http://localhost:4040/api/tunnels', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            }).on('error', reject);
        });
        
        const backendTunnel = response.tunnels?.find(t => t.name === 'backend' || t.config?.addr === '3001');
        if (backendTunnel) {
            return res.json({ backendUrl: backendTunnel.public_url });
        }
    } catch (error) {
        console.error('Error fetching ngrok URL:', error);
    }
    
    res.json({ backendUrl: null });
}));

// VPN access log (live from Google Sheet, in-memory cached)
app.get('/api/vpn-usage', asyncHandler(async (req, res) => {
    const force = req.query.force === '1';
    const records = await getVpnUsage({ force });
    res.json(records);
}));

// SPA fallback - serve index.html for all non-API routes
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
});
