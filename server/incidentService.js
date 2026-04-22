const crypto = require('crypto');
const { Incident } = require('./db');

// Google Sheet Details
const SPREADSHEET_ID = '1brP4N888QF_dKmSxAMNrK6B3wtNRJEuyEK1co808HJQ';
const SHEET_GID = '211809601';

// Responder names that indicate fully-automated handling → case is auto-closed on every sync.
const AUTO_CLOSE_RESPONDERS = new Set(['ai ait csoc']);

function isAutoCloseResponder(responder) {
    return AUTO_CLOSE_RESPONDERS.has((responder || '').toLowerCase().trim());
}

async function fetchGoogleSheetsData() {
    try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.status}`);
        return await response.text();
    } catch (error) {
        console.error('Error fetching Google Sheets CSV:', error);
        return null;
    }
}

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

    const headers = values[0] || [];
    const rows = values.slice(1).filter(row => row.some(cell => cell.trim()));
    return { headers, rows };
}

/**
 * Generate a deterministic hash from the raw sheet row data.
 * Uses Time + Type + Src_IP as the unique fingerprint.
 */
function generateRowHash(rowData) {
    const raw = `${rowData.Time || ''}|${rowData.Type || ''}|${rowData.Src_IP || ''}`;
    return crypto.createHash('md5').update(raw).digest('hex');
}

/**
 * Parse date string from Google Sheet (DD/MM/YYYY, HH:MM:SS format).
 * Uses UTC to avoid timezone inconsistencies between runs.
 */
function parseDate(dateStr) {
    if (!dateStr) return new Date();
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);

    if (match) {
        const [, day, month, year, hour, minute, second] = match;
        // Use Date.UTC to ensure consistent timestamps regardless of server timezone
        const ts = Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
        const date = new Date(ts);
        return isNaN(date.getTime()) ? new Date() : date;
    }
    const cleanDate = dateStr.replace(/\s+/g, ' ').trim();
    const date = new Date(cleanDate);
    return isNaN(date.getTime()) ? new Date() : date;
}

function mapRowToIncident(row, headers, index) {
    const rowData = {};
    headers.forEach((header, i) => {
        // Trim header names (Google Sheets has trailing spaces like "Responder by ")
        rowData[header.trim()] = row[i] || '';
    });

    // Parse destination IPs
    let destinationIPs = [];
    try {
        if (rowData.dst_IP && rowData.dst_IP.startsWith('[') && rowData.dst_IP.endsWith(']')) {
            destinationIPs = JSON.parse(rowData.dst_IP);
        } else if (rowData.dst_IP) {
            destinationIPs = [rowData.dst_IP];
        }
    } catch (e) {
        destinationIPs = [rowData.dst_IP || ''];
    }

    // Map RiskLevel to severity
    const severityMap = { 'low': 'low', 'medium': 'medium', 'high': 'high', 'critical': 'critical' };

    // Map Status from sheet
    const statusRaw = (rowData.Status || '').toLowerCase().trim();
    const statusMap = {
        'drop': 'open',
        'investigating': 'investigating',
        'resolved': 'resolved',
        'closed': 'closed',
        'automated blocked': 'resolved',
    };

    const country = rowData.Country ? rowData.Country.split(',')[0].trim() : 'Unknown';
    const createdAt = parseDate(rowData.Time);

    // Responder - check both "Responder by" and "Responder" columns
    const responder = (rowData['Responder by'] || rowData['Responder'] || '').trim() || 'Unassigned';

    // Response time from sheet
    const responseTimeRaw = (rowData['Time to Response'] || '').trim();

    // Generate unique hash for this row
    const sheetRowHash = generateRowHash(rowData);

    // AI-handled cases are always considered closed AND responded, regardless of what the sheet's Status/Response columns say.
    const autoHandled = isAutoCloseResponder(responder);
    const status = autoHandled ? 'closed' : (statusMap[statusRaw] || 'open');
    const responseStatus = autoHandled
        ? 'responded'
        : ((rowData.Response || '').toLowerCase() === 'yes' ? 'responded' : 'pending');

    return {
        id: `INC-${String(index + 1).padStart(3, '0')}`,
        title: `${rowData.Type} from ${rowData.Src_IP}`,
        description: `Security incident detected: ${rowData.Type}. Source: ${rowData.Src_IP}, Destination: ${destinationIPs.join(', ')}`,
        severity: severityMap[(rowData.RiskLevel || '').toLowerCase()] || 'medium',
        status: status,
        sourceIP: rowData.Src_IP,
        destinationIPs: destinationIPs,
        country: country,
        type: rowData.Type,
        responder: responder,
        responseTime: responseTimeRaw || null,
        responseStatus: responseStatus,
        notes: (rowData.Note || '').trim() || '',
        timelineEvents: [],
        sheetRowHash: sheetRowHash,
        createdAt: createdAt,
        updatedAt: createdAt
    };
}

async function seedIncidents() {
    try {
        const count = await Incident.count();
        if (count > 0) {
            console.log('Database already has incidents. Skipping seed.');
            return;
        }

        console.log('Seeding incidents from Google Sheets...');
        const csvText = await fetchGoogleSheetsData();
        if (!csvText) return;

        const { headers, rows } = parseCSV(csvText);
        const incidents = rows.map((row, index) => mapRowToIncident(row, headers, index));

        if (incidents.length > 0) {
            // Explicit version:0 — bulkCreate sometimes bypasses column defaults.
            await Incident.bulkCreate(incidents.map(i => ({ ...i, version: 0 })));
            console.log(`Successfully seeded ${incidents.length} incidents.`);
        }
    } catch (error) {
        console.error('Error seeding incidents:', error);
    }
}

/**
 * Sync incidents from Google Sheets.
 * - Uses sheetRowHash (MD5 of Time|Type|Src_IP) for exact dedup
 * - Only inserts truly new rows
 * - Updates responder, severity, country, responseTime, responseStatus, and createdAt (Detect time) for existing rows if changed in sheet
 * - Status is app-owned: never overwritten on existing rows (sheet seeds it on insert only)
 * - Exception — auto-handled responders (AUTO_CLOSE_RESPONDERS, e.g. "AI AIT CSOC"):
 *     - status is forced to 'closed' on every sync (overrides app-owned-status)
 *     - responseStatus is forced to 'responded' on every sync (regardless of sheet's Response column)
 * - Preserves app-only fields (notes, timelineEvents)
 */
async function syncIncidentsFromSheet() {
    try {
        const csvText = await fetchGoogleSheetsData();
        if (!csvText) {
            return { added: 0, updated: 0 };
        }

        const { headers, rows } = parseCSV(csvText);
        if (rows.length === 0) return { added: 0, updated: 0 };

        const sheetIncidents = rows.map((row, index) => mapRowToIncident(row, headers, index));

        // Get all existing incidents (including soft-deleted) so we can skip rows the user has deleted.
        const existing = await Incident.findAll({ paranoid: false });
        const hashMap = new Map();   // sheetRowHash -> incident
        const titleMap = new Map();  // title+sourceIP+type -> incident (fallback for old records without hash)

        existing.forEach(inc => {
            if (inc.sheetRowHash) {
                hashMap.set(inc.sheetRowHash, inc);
            }
            // Fallback key for records created before sheetRowHash was added
            const fallbackKey = `${inc.title}|${inc.sourceIP}|${inc.type}`;
            if (!titleMap.has(fallbackKey)) {
                titleMap.set(fallbackKey, []);
            }
            titleMap.get(fallbackKey).push(inc);
        });

        // Find max INC number
        let maxNum = 0;
        existing.forEach(inc => {
            const match = inc.id.match(/INC-(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });

        let added = 0;
        let updated = 0;

        for (const sheetInc of sheetIncidents) {
            // Primary match: by sheetRowHash (exact)
            let existingInc = hashMap.get(sheetInc.sheetRowHash);

            // If the matched incident was soft-deleted by a user, respect that intent: skip (don't update, don't re-insert).
            if (existingInc && existingInc.deletedAt) {
                continue;
            }

            // Fallback match: for old records without hash, match by title + closest timestamp
            if (!existingInc) {
                const fallbackKey = `${sheetInc.title}|${sheetInc.sourceIP}|${sheetInc.type}`;
                const candidates = titleMap.get(fallbackKey) || [];
                const sheetTs = new Date(sheetInc.createdAt).getTime();

                // Find the closest timestamp match within 24 hours
                let bestMatch = null;
                let bestDiff = Infinity;
                for (const cand of candidates) {
                    if (cand.sheetRowHash) continue; // Already matched by hash
                    if (cand.deletedAt) continue; // Don't match against soft-deleted rows
                    const candTs = new Date(cand.createdAt).getTime();
                    const diff = Math.abs(sheetTs - candTs);
                    if (diff < bestDiff && diff < 24 * 60 * 60 * 1000) {
                        bestDiff = diff;
                        bestMatch = cand;
                    }
                }

                if (bestMatch) {
                    existingInc = bestMatch;
                    // Backfill the hash for future exact matching
                    await bestMatch.update({ sheetRowHash: sheetInc.sheetRowHash });
                    hashMap.set(sheetInc.sheetRowHash, bestMatch);
                }
            }

            if (!existingInc) {
                // Truly new incident - insert
                maxNum++;
                const newId = `INC-${String(maxNum).padStart(3, '0')}`;
                await Incident.create({ ...sheetInc, id: newId });
                added++;
            } else {
                // Existing incident - sync fields from sheet (responder, severity, etc.). Status is app-owned and intentionally not synced here, with one exception: auto-close responders (see below).
                const updates = {};
                if (sheetInc.severity !== existingInc.severity) updates.severity = sheetInc.severity;
                if (sheetInc.country !== existingInc.country) updates.country = sheetInc.country;

                // Keep Detect time (createdAt) in sync with the sheet's Time column. The sheet is authoritative for when the incident was detected.
                const sheetCreatedMs = sheetInc.createdAt ? new Date(sheetInc.createdAt).getTime() : null;
                const existingCreatedMs = existingInc.createdAt ? new Date(existingInc.createdAt).getTime() : null;
                if (sheetCreatedMs && sheetCreatedMs !== existingCreatedMs) updates.createdAt = sheetInc.createdAt;

                // Auto-close rule: if the sheet says this incident is handled by an automated responder (e.g. AI AIT CSOC), force status to 'closed' on every sync — overrides the app-owned-status rule for this specific case.
                if (isAutoCloseResponder(sheetInc.responder) && existingInc.status !== 'closed') {
                    updates.status = 'closed';
                }
                if (sheetInc.responseStatus !== existingInc.responseStatus) updates.responseStatus = sheetInc.responseStatus;
                if (sheetInc.responseTime && sheetInc.responseTime !== existingInc.responseTime) updates.responseTime = sheetInc.responseTime;

                // Always sync responder from sheet if sheet has a value
                if (sheetInc.responder && sheetInc.responder !== 'Unassigned' && sheetInc.responder !== existingInc.responder) {
                    updates.responder = sheetInc.responder;
                }

                // Sync destination IPs if changed
                const existingDstStr = JSON.stringify(existingInc.destinationIPs || []);
                const sheetDstStr = JSON.stringify(sheetInc.destinationIPs || []);
                if (sheetDstStr !== existingDstStr) updates.destinationIPs = sheetInc.destinationIPs;

                if (Object.keys(updates).length > 0) {
                    await existingInc.update(updates);
                    updated++;
                }
            }
        }

        if (added > 0 || updated > 0) {
            console.log(`Google Sheets sync: ${added} added, ${updated} updated`);
        }
        return { added, updated };
    } catch (error) {
        console.error('Error syncing from Google Sheets:', error);
        return { added: 0, updated: 0, error: error.message };
    }
}

module.exports = { seedIncidents, syncIncidentsFromSheet };
