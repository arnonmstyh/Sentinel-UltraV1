// VPN access log service
// Reads the VPN usage audit log from the shared Google Sheet (tab gid=0),
// normalizes each row, and caches the result in memory (read-only telemetry —
// no SQLite persistence, unlike incidents).

// Google Sheet Details — VPN access tab
const SPREADSHEET_ID = '1brP4N888QF_dKmSxAMNrK6B3wtNRJEuyEK1co808HJQ';
const SHEET_GID = '0';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory cache
let cache = { data: null, fetchedAt: 0 };

async function fetchVpnSheet() {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error(`Failed to fetch VPN CSV: ${response.status}`);
    return await response.text();
}

// Robust quoted-CSV parser (mirrors server/incidentService.js parseCSV)
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    const values = lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim().replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim().replace(/^"|"$/g, ''));
        return result;
    });

    const headers = (values[0] || []).map(h => h.trim());
    const rows = values.slice(1).filter(row => row.some(cell => cell.trim()));
    return { headers, rows };
}

// Parse the VPN log date format "YYYY-MM-DD,HH:MM" (e.g. "2026-02-01,02:22").
// Returns an ISO 8601 string, or null when unparseable. Built in UTC to avoid
// server-timezone drift.
function parseVpnDate(raw) {
    if (!raw) return null;
    const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2}),\s*(\d{1,2}):(\d{2})$/);
    if (match) {
        const [, y, m, d, hh, mm] = match;
        const date = new Date(Date.UTC(+y, +m - 1, +d, +hh, +mm));
        return isNaN(date.getTime()) ? null : date.toISOString();
    }
    const fallback = new Date(raw);
    return isNaN(fallback.getTime()) ? null : fallback.toISOString();
}

function classifyOutcome(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('tunnel established')) return 'success';
    if (s.includes('denied') || s.includes('permission_denied') || s.includes('fail')) return 'failure';
    return 'other';
}

// Strip brute-force junk from a username: keep the text before the first
// "/", whitespace, "@" or "!" character.
function cleanUserName(user) {
    if (!user) return '';
    return user.split(/[/\s@!]/)[0].trim();
}

function mapRowToVpnRecord(row, headers) {
    const rowData = {};
    headers.forEach((header, i) => {
        rowData[header.toLowerCase()] = (row[i] || '').trim();
    });

    const rawTime = rowData['time'] || '';
    const srcIp = rowData['src_ip'] || '';
    const user = rowData['user'] || '';
    const country = rowData['country'] || '';
    const status = rowData['status'] || '';
    const response = rowData['response'] || '';

    // Skip rows that carry no usable signal
    if (!srcIp && !user) return null;

    const outcome = classifyOutcome(status);
    const cleanUser = cleanUserName(user);
    // Brute-force heuristic (advisory): a failed login whose username field
    // contains password-like characters typed in by the attacker.
    const isBruteForce = outcome === 'failure' && /[/!@]/.test(user);

    return {
        timestamp: parseVpnDate(rawTime),
        rawTime,
        srcIp,
        user,
        cleanUser,
        country,
        status,
        outcome,
        response,
        isBruteForce,
    };
}

async function getVpnUsage({ force = false } = {}) {
    const now = Date.now();
    if (!force && cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
        return cache.data;
    }

    let csvText;
    try {
        csvText = await fetchVpnSheet();
    } catch (error) {
        if (cache.data) {
            console.warn('VPN sheet fetch failed, serving stale cache:', error.message);
            return cache.data;
        }
        throw error;
    }

    if (!csvText) {
        if (cache.data) return cache.data;
        throw new Error('Empty response from VPN sheet');
    }

    const { headers, rows } = parseCSV(csvText);
    const records = rows
        .map(row => mapRowToVpnRecord(row, headers))
        .filter(Boolean)
        .map((record, index) => ({ id: `VPN-${String(index + 1).padStart(4, '0')}`, ...record }));

    cache = { data: records, fetchedAt: now };
    console.log(`Loaded ${records.length} VPN access records from Google Sheets.`);
    return records;
}

module.exports = { getVpnUsage };
