const cron = require('node-cron');
const { Url } = require('./db');
const { checkSSL, checkServiceHealth } = require('./sslService');
const { sendSSLExpirationAlert } = require('./telegramService');
const { syncIncidentsFromSheet } = require('./incidentService');

const updateAllUrls = async () => {
    console.log('Starting daily SSL check...');
    const urls = await Url.findAll();

    for (const urlRecord of urls) {
        const result = await checkSSL(urlRecord.url);

        if (result.valid) {
            let status = 'GOOD';
            if (result.daysRemaining <= 7) status = 'WARNING';
            if (result.daysRemaining <= 0) status = 'EXPIRED';

            await urlRecord.update({
                issuer: result.issuer,
                expiryDate: result.expiryDate,
                validFrom: result.validFrom,
                daysRemaining: result.daysRemaining,
                lastChecked: new Date(),
                status: status
            });
        } else {
            await urlRecord.update({
                lastChecked: new Date(),
                status: 'ERROR',
                lastError: result.error || 'Unknown error'
            });
        }

        // Also run a health check during daily SSL scan
        const health = await checkServiceHealth(urlRecord.url);
        await urlRecord.update({
            serviceStatus: health.serviceStatus,
            responseTime: health.responseTime,
            httpStatusCode: health.httpStatusCode,
            lastServiceCheck: new Date(),
            consecutiveFailures: health.serviceStatus === 'DOWN'
                ? (urlRecord.consecutiveFailures || 0) + 1
                : 0,
        });
    }
    console.log('Daily SSL check completed.');
};

/**
 * Service health polling - runs frequently to check web service availability.
 * Uses smart intervals: DOWN services get checked more often.
 */
const HEALTH_POLL_INTERVAL_MS = 3 * 60 * 1000; // 3 minutes base interval
const DOWN_RECHECK_MS = 60 * 1000;              // 1 minute for DOWN services
const STABLE_SKIP_MS = 5 * 60 * 1000;           // 5 minutes for stable UP services

let healthPollRunning = false;

const pollServiceHealth = async () => {
    if (healthPollRunning) return; // Prevent overlapping runs
    healthPollRunning = true;

    try {
        const urls = await Url.findAll();
        const now = Date.now();
        let checked = 0;

        for (const urlRecord of urls) {
            const lastCheck = urlRecord.lastServiceCheck
                ? new Date(urlRecord.lastServiceCheck).getTime()
                : 0;
            const elapsed = now - lastCheck;

            // Smart interval: check DOWN services more frequently
            const currentStatus = urlRecord.serviceStatus || 'UNKNOWN';
            let shouldCheck = false;

            if (currentStatus === 'DOWN' || currentStatus === 'UNKNOWN') {
                shouldCheck = elapsed >= DOWN_RECHECK_MS;
            } else if (currentStatus === 'DEGRADED') {
                shouldCheck = elapsed >= (DOWN_RECHECK_MS * 2); // 2 min for degraded
            } else {
                // UP - check less frequently if stable (no recent failures)
                const stableThreshold = (urlRecord.consecutiveFailures || 0) === 0
                    ? STABLE_SKIP_MS
                    : HEALTH_POLL_INTERVAL_MS;
                shouldCheck = elapsed >= stableThreshold;
            }

            if (!shouldCheck) continue;

            const health = await checkServiceHealth(urlRecord.url);
            const failures = health.serviceStatus === 'DOWN'
                ? (urlRecord.consecutiveFailures || 0) + 1
                : 0;

            await urlRecord.update({
                serviceStatus: health.serviceStatus,
                responseTime: health.responseTime,
                httpStatusCode: health.httpStatusCode,
                lastServiceCheck: new Date(),
                consecutiveFailures: failures,
            });

            checked++;
        }

        if (checked > 0) {
            console.log(`Health poll: checked ${checked}/${urls.length} services`);
        }
    } catch (error) {
        console.error('Error in service health poll:', error);
    } finally {
        healthPollRunning = false;
    }
};

/**
 * Check for SSL certificates expiring in less than 20 days and send Telegram alert
 */
const checkAndSendExpirationAlerts = async () => {
    try {
        console.log('Checking for certificates expiring in less than 20 days...');
        
        // Get all URLs from database
        const allUrls = await Url.findAll();
        
        // Filter URLs with daysRemaining < 20 and not null
        const expiringUrls = allUrls.filter(url => {
            // Include URLs with daysRemaining < 20 (including expired ones)
            // Also include ERROR status URLs as they might have expiration issues
            if (url.daysRemaining !== null && url.daysRemaining < 20) {
                return true;
            }
            // Include expired certificates (daysRemaining <= 0 or status EXPIRED)
            if (url.status === 'EXPIRED' || (url.daysRemaining !== null && url.daysRemaining <= 0)) {
                return true;
            }
            return false;
        });
        
        if (expiringUrls.length > 0) {
            console.log(`Found ${expiringUrls.length} certificate(s) expiring in less than 20 days. Sending Telegram alert...`);
            
            // Convert Sequelize models to plain objects for Telegram service
            const expiringUrlsData = expiringUrls.map(url => ({
                url: url.url,
                daysRemaining: url.daysRemaining,
                expiryDate: url.expiryDate,
                issuer: url.issuer,
                status: url.status,
                lastError: url.lastError
            }));
            
            const success = await sendSSLExpirationAlert(expiringUrlsData);
            
            if (success) {
                console.log('Telegram alert sent successfully.');
            } else {
                console.error('Failed to send Telegram alert.');
            }
        } else {
            console.log('No certificates expiring in less than 20 days found.');
        }
    } catch (error) {
        console.error('Error checking expiration alerts:', error);
    }
};

const initScheduler = () => {
    // Run SSL check every day at midnight
    cron.schedule('0 0 * * *', () => {
        updateAllUrls();
    });

    // Run expiration alert check every weekday (Monday-Friday) at 10:00 AM
    cron.schedule('0 10 * * 1-5', () => {
        console.log('Running weekday expiration alert check (Monday-Friday, 10:00 AM)...');
        checkAndSendExpirationAlerts();
    });

    // Start service health polling (every 60 seconds, smart intervals inside)
    setInterval(pollServiceHealth, 60 * 1000);

    // Google Sheets incident sync every 12 hours
    cron.schedule('0 */12 * * *', () => {
        console.log('Running scheduled Google Sheets sync (every 12 hours)...');
        syncIncidentsFromSheet();
    });

    // Start service health polling (every 60 seconds, smart intervals inside)
    setInterval(pollServiceHealth, 60 * 1000);

    // Run initial health check 5 seconds after startup
    setTimeout(pollServiceHealth, 5000);

    // Run initial Google Sheets sync 10 seconds after startup
    setTimeout(syncIncidentsFromSheet, 10000);

    console.log('Scheduler initialized:');
    console.log('  - Daily SSL check: Every day at midnight (0 0 * * *)');
    console.log('  - Expiration alerts: Weekdays at 10:00 AM (0 10 * * 1-5)');
    console.log('  - Service health poll: Every 60s (smart intervals per service)');
    console.log('  - Google Sheets sync: Every 12 hours + on startup');
};

module.exports = { initScheduler, updateAllUrls, checkAndSendExpirationAlerts, pollServiceHealth, syncIncidentsFromSheet };
