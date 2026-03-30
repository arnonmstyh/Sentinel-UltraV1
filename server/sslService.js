const tls = require('tls');
const url = require('url');
const https = require('https');

const checkSSL = (targetUrl, retries = 2) => {
    return new Promise(async (resolve) => {
        try {
            // Ensure targetUrl has protocol
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl;
            }

            const parsed = new url.URL(targetUrl);
            const hostname = parsed.hostname;

            let lastError = null;

            for (let attempt = 1; attempt <= retries; attempt++) {
                // Method 1: HTTPS request (most browser-like)
                const httpsResult = await tryHttpsRequest(hostname, 15000);
                if (httpsResult.certInfo) {
                    return resolve(httpsResult);
                }
                lastError = httpsResult.error;

                // Method 2: TLS connection
                const tlsResult = await tryTlsConnect(hostname, 15000);
                if (tlsResult.certInfo) {
                    return resolve(tlsResult);
                }
                if (!lastError) lastError = tlsResult.error;

                // Wait before retry
                if (attempt < retries) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            // All methods failed — no cert info obtained at all
            resolve({
                valid: false,
                error: lastError || 'All connection attempts failed'
            });

        } catch (error) {
            resolve({
                valid: false,
                error: error.message
            });
        }
    });
};

const tryHttpsRequest = (hostname, timeout) => {
    return new Promise((resolve) => {
        let resolved = false;

        try {
            const agent = new https.Agent({
                rejectUnauthorized: false, // Accept all certs so we can inspect them
                keepAlive: false,
                timeout: timeout,
            });

            const reqOptions = {
                hostname: hostname,
                port: 443,
                method: 'HEAD',
                path: '/',
                agent: agent,
                timeout: timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SSLMonitor/1.0)',
                    'Connection': 'close',
                }
            };

            const req = https.request(reqOptions, (res) => {
                if (resolved) return;
                resolved = true;

                try {
                    const socket = res.socket;
                    const cert = socket.getPeerCertificate(true);
                    if (cert && Object.keys(cert).length > 0) {
                        const authorized = socket.authorized;
                        const authError = socket.authorizationError || null;
                        processCert(cert, hostname, authorized, authError, resolve);
                    } else {
                        resolve({
                            valid: false,
                            error: 'No certificate found in HTTPS response'
                        });
                    }
                    res.destroy();
                } catch (err) {
                    resolve({
                        valid: false,
                        error: `Error reading certificate: ${err.message}`
                    });
                }
            });

            req.on('error', (err) => {
                if (resolved) return;
                resolved = true;
                resolve({
                    valid: false,
                    error: `HTTPS request failed: ${err.message}`
                });
            });

            req.on('timeout', () => {
                if (resolved) return;
                resolved = true;
                req.destroy();
                resolve({
                    valid: false,
                    error: `Connection timed out after ${timeout}ms`
                });
            });

            req.setTimeout(timeout);
            req.end();
        } catch (error) {
            if (resolved) return;
            resolved = true;
            resolve({
                valid: false,
                error: `HTTPS request error: ${error.message}`
            });
        }
    });
};

const tryTlsConnect = (hostname, timeout) => {
    return new Promise((resolve) => {
        let resolved = false;

        try {
            const options = {
                host: hostname,
                port: 443,
                servername: hostname, // SNI — critical for shared hosting
                rejectUnauthorized: false, // Accept all certs so we can inspect them
            };

            const socket = tls.connect(options, () => {
                if (resolved) return;
                resolved = true;

                try {
                    const cert = socket.getPeerCertificate(true);

                    if (!cert || Object.keys(cert).length === 0) {
                        socket.end();
                        return resolve({
                            valid: false,
                            error: 'No certificate found in TLS handshake'
                        });
                    }

                    const authorized = socket.authorized;
                    const authError = socket.authorizationError || null;
                    processCert(cert, hostname, authorized, authError, resolve);
                    socket.end();
                } catch (err) {
                    socket.end();
                    resolve({
                        valid: false,
                        error: `Error reading certificate: ${err.message}`
                    });
                }
            });

            socket.on('error', (err) => {
                if (resolved) return;
                resolved = true;
                resolve({
                    valid: false,
                    error: `TLS connection error: ${err.message}`
                });
            });

            socket.setTimeout(timeout, () => {
                if (resolved) return;
                resolved = true;
                socket.destroy();
                resolve({
                    valid: false,
                    error: `Connection timed out after ${timeout}ms`
                });
            });
        } catch (error) {
            if (resolved) return;
            resolved = true;
            resolve({
                valid: false,
                error: `TLS connection setup error: ${error.message}`
            });
        }
    });
};

const processCert = (cert, hostname, authorized, authError, resolve) => {
    try {
        const validTo = new Date(cert.valid_to);
        const validFrom = new Date(cert.valid_from);
        const now = new Date();
        const daysRemaining = Math.ceil((validTo - now) / (1000 * 60 * 60 * 24));

        // Extract issuer name
        let issuerName = 'Unknown';
        if (cert.issuer) {
            if (typeof cert.issuer === 'string') {
                issuerName = cert.issuer;
            } else if (cert.issuer.O) {
                issuerName = cert.issuer.O;
            } else if (cert.issuer.CN) {
                issuerName = cert.issuer.CN;
            } else if (cert.issuer.OU) {
                issuerName = cert.issuer.OU;
            } else {
                const parts = [];
                if (cert.issuer.C) parts.push(`C=${cert.issuer.C}`);
                if (cert.issuer.ST) parts.push(`ST=${cert.issuer.ST}`);
                if (cert.issuer.L) parts.push(`L=${cert.issuer.L}`);
                if (cert.issuer.O) parts.push(`O=${cert.issuer.O}`);
                if (cert.issuer.OU) parts.push(`OU=${cert.issuer.OU}`);
                if (cert.issuer.CN) parts.push(`CN=${cert.issuer.CN}`);
                issuerName = parts.length > 0 ? parts.join(', ') : JSON.stringify(cert.issuer);
            }
        }

        // Extract subject CN for hostname matching info
        const subjectCN = cert.subject?.CN || '';

        // Check SAN (Subject Alternative Names) for hostname match
        const sanList = cert.subjectaltname || '';

        // Always include cert info so the UI can display it
        const certInfo = {
            issuer: issuerName,
            validFrom: validFrom,
            expiryDate: validTo,
            daysRemaining: daysRemaining,
            subjectCN: subjectCN,
        };

        // --- Validation checks ---

        // 1. Certificate expired or not yet valid
        if (now > validTo) {
            return resolve({
                valid: false,
                certInfo: true,
                ...certInfo,
                error: `Certificate expired on ${validTo.toISOString().split('T')[0]}`
            });
        }

        if (now < validFrom) {
            return resolve({
                valid: false,
                certInfo: true,
                ...certInfo,
                error: `Certificate not valid until ${validFrom.toISOString().split('T')[0]}`
            });
        }

        // 2. Certificate chain not trusted (self-signed, unknown CA, etc.)
        if (!authorized) {
            let errorMsg = 'Certificate not trusted';
            if (authError) {
                const errorMap = {
                    'DEPTH_ZERO_SELF_SIGNED_CERT': 'Self-signed certificate',
                    'SELF_SIGNED_CERT_IN_CHAIN': 'Self-signed certificate in chain',
                    'UNABLE_TO_VERIFY_LEAF_SIGNATURE': 'Unable to verify certificate chain',
                    'CERT_HAS_EXPIRED': `Certificate expired`,
                    'ERR_TLS_CERT_ALTNAME_INVALID': `Certificate hostname mismatch (cert is for ${subjectCN}, not ${hostname})`,
                    'HOSTNAME_MISMATCH': `Certificate hostname mismatch (cert is for ${subjectCN}, not ${hostname})`,
                    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY': 'Unknown certificate authority',
                    'UNABLE_TO_GET_ISSUER_CERT': 'Unknown certificate authority',
                    'CERT_NOT_YET_VALID': 'Certificate not yet valid',
                    'CERT_REVOKED': 'Certificate has been revoked',
                };
                errorMsg = errorMap[authError] || `${authError}`;
            }

            return resolve({
                valid: false,
                certInfo: true,
                ...certInfo,
                error: errorMsg
            });
        }

        // 3. All checks passed — certificate is valid and trusted
        resolve({
            valid: true,
            certInfo: true,
            ...certInfo,
        });

    } catch (error) {
        resolve({
            valid: false,
            error: `Certificate processing error: ${error.message}`
        });
    }
};

/**
 * Real HTTP service health check - measures actual web service availability.
 * Makes an HTTPS HEAD request (falls back to GET) and records response time + status code.
 *
 * @param {string} targetUrl - URL to check
 * @param {number} timeout - Timeout in ms (default 10000)
 * @returns {Promise<{serviceStatus: string, responseTime: number|null, httpStatusCode: number|null, error: string|null}>}
 */
const checkServiceHealth = (targetUrl, timeout = 10000) => {
    return new Promise((resolve) => {
        const startTime = Date.now();

        try {
            if (!targetUrl.startsWith('http')) {
                targetUrl = 'https://' + targetUrl;
            }

            const parsed = new url.URL(targetUrl);
            const isHttps = parsed.protocol === 'https:';
            const lib = isHttps ? https : require('http');

            const reqOptions = {
                hostname: parsed.hostname,
                port: parsed.port || (isHttps ? 443 : 80),
                path: parsed.pathname || '/',
                method: 'HEAD',
                timeout: timeout,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SentinelMonitor/2.0)',
                    'Accept': '*/*',
                    'Connection': 'close',
                },
                rejectUnauthorized: false, // We check SSL separately
            };

            const req = lib.request(reqOptions, (res) => {
                const responseTime = Date.now() - startTime;
                const statusCode = res.statusCode;
                res.destroy();

                // Determine service status from response
                let serviceStatus;
                if (statusCode >= 200 && statusCode < 400) {
                    serviceStatus = responseTime > 5000 ? 'DEGRADED' : 'UP';
                } else if (statusCode === 405) {
                    // Method Not Allowed - HEAD not supported, but service is UP
                    serviceStatus = responseTime > 5000 ? 'DEGRADED' : 'UP';
                } else if (statusCode >= 500) {
                    serviceStatus = 'DOWN';
                } else if (statusCode >= 400) {
                    // 4xx errors - service is running but may have issues
                    // 401/403 = auth required = service is UP
                    serviceStatus = (statusCode === 401 || statusCode === 403) ? 'UP' : 'DEGRADED';
                } else {
                    serviceStatus = 'DEGRADED';
                }

                resolve({
                    serviceStatus,
                    responseTime,
                    httpStatusCode: statusCode,
                    error: null,
                });
            });

            req.on('error', (err) => {
                const responseTime = Date.now() - startTime;

                // If HEAD fails, try GET (some servers reject HEAD)
                if (reqOptions.method === 'HEAD' && !err.message.includes('timeout')) {
                    reqOptions.method = 'GET';
                    const retryReq = lib.request(reqOptions, (res) => {
                        const retryTime = Date.now() - startTime;
                        const statusCode = res.statusCode;
                        res.destroy();

                        let serviceStatus;
                        if (statusCode >= 200 && statusCode < 400) {
                            serviceStatus = retryTime > 5000 ? 'DEGRADED' : 'UP';
                        } else if (statusCode >= 500) {
                            serviceStatus = 'DOWN';
                        } else {
                            serviceStatus = (statusCode === 401 || statusCode === 403) ? 'UP' : 'DEGRADED';
                        }

                        resolve({
                            serviceStatus,
                            responseTime: retryTime,
                            httpStatusCode: statusCode,
                            error: null,
                        });
                    });

                    retryReq.on('error', (retryErr) => {
                        resolve({
                            serviceStatus: 'DOWN',
                            responseTime: Date.now() - startTime,
                            httpStatusCode: null,
                            error: retryErr.message,
                        });
                    });

                    retryReq.on('timeout', () => {
                        retryReq.destroy();
                        resolve({
                            serviceStatus: 'DOWN',
                            responseTime: Date.now() - startTime,
                            httpStatusCode: null,
                            error: `Connection timed out after ${timeout}ms`,
                        });
                    });

                    retryReq.setTimeout(timeout);
                    retryReq.end();
                    return;
                }

                resolve({
                    serviceStatus: 'DOWN',
                    responseTime,
                    httpStatusCode: null,
                    error: err.message,
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    serviceStatus: 'DOWN',
                    responseTime: Date.now() - startTime,
                    httpStatusCode: null,
                    error: `Connection timed out after ${timeout}ms`,
                });
            });

            req.setTimeout(timeout);
            req.end();
        } catch (error) {
            resolve({
                serviceStatus: 'DOWN',
                responseTime: Date.now() - startTime,
                httpStatusCode: null,
                error: error.message,
            });
        }
    });
};

module.exports = { checkSSL, checkServiceHealth };
