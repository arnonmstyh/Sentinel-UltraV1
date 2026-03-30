// Simple Google Sheets integration for live data
// Uses CSV export method for public sheets (no API key required)

interface GoogleSheetsData {
  headers: string[];
  rows: string[][];
}

interface IncidentData {
  Time: string;
  Type: string;
  RiskLevel: string;
  Src_IP: string;
  dst_IP: string;
  Country: string;
  Status: string;
  Response: string;
  'Time to Response': string;
  Responder: string;
}

const SPREADSHEET_ID = '1brP4N888QF_dKmSxAMNrK6B3wtNRJEuyEK1co808HJQ';
const SHEET_GID = '211809601';

export async function fetchGoogleSheetsData(): Promise<GoogleSheetsData> {
  try {
    console.log('🔄 Fetching live data from Google Sheets...');
    
    // Use CSV export method (works for public sheets)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('No data found in sheet');
    }
    
    // Parse CSV data
    const values: string[][] = lines.map(line => {
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
    const rows = values.slice(1).filter(row => row.some(cell => cell.trim())); // Filter out empty rows
    
    console.log(`✅ Successfully loaded ${rows.length} incidents from Google Sheets`);
    return { headers, rows };
    
  } catch (error) {
    console.error('❌ Error fetching Google Sheets data:', error);
    throw error;
  }
}

export function mapGoogleSheetsToIncidents(data: GoogleSheetsData) {
  const { headers, rows } = data;
  
  return rows.map((row, index) => {
    const rowData: Record<string, string> = {};
    headers.forEach((header, i) => {
      rowData[header] = row[i] || '';
    });
    
    // Parse destination IPs (handle JSON array format)
    let destinationIPs: string[] = [];
    try {
      if (rowData.dst_IP && rowData.dst_IP.startsWith('[') && rowData.dst_IP.endsWith(']')) {
        destinationIPs = JSON.parse(rowData.dst_IP);
      } else if (rowData.dst_IP) {
        destinationIPs = [rowData.dst_IP];
      }
    } catch (e) {
      console.warn('Failed to parse dst_IP:', rowData.dst_IP);
      destinationIPs = [rowData.dst_IP || ''];
    }
    
    // Map RiskLevel to severity
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'low': 'low',
      'medium': 'medium', 
      'high': 'high',
      'critical': 'critical'
    };
    
    // Parse date with flexible format handling
    const parseDate = (dateStr: string): Date => {
      if (!dateStr) return new Date();
      
      // Handle your specific format: "01/09/2025, 18:26:59" or "12/9/2025, 0:15:00"
      const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{1,2}):(\d{1,2})/);
      
      if (match) {
        const [, day, month, year, hour, minute, second] = match;
        // Create date with proper month (month is 0-indexed in JavaScript)
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
        return isNaN(date.getTime()) ? new Date() : date;
      }
      
      // Fallback to standard date parsing
      const cleanDate = dateStr.replace(/\s+/g, ' ').trim();
      const date = new Date(cleanDate);
      
      // If date is invalid, return current date
      return isNaN(date.getTime()) ? new Date() : date;
    };
    
    // Map Status to incident status
    const statusMap: Record<string, 'open' | 'investigating' | 'resolved' | 'closed'> = {
      'drop': 'open',
      'investigating': 'investigating',
      'resolved': 'resolved',
      'closed': 'closed'
    };
    
    // Extract country name (remove ISP info and clean up)
    const country = rowData.Country ? 
      rowData.Country.split(',')[0].trim().replace(/\s+$/, '') : 'Unknown';
    
    return {
      id: `INC-${String(index + 1).padStart(3, '0')}`,
      title: `${rowData.Type} from ${rowData.Src_IP}`,
      description: `Security incident detected: ${rowData.Type}. Source: ${rowData.Src_IP}, Destination: ${destinationIPs.join(', ')}`,
      severity: severityMap[rowData.RiskLevel] || 'medium',
      status: statusMap[rowData.Status] || 'open',
      sourceIP: rowData.Src_IP,
      destinationIPs: destinationIPs,
      country: country,
      type: rowData.Type,
      responder: rowData.Responder?.trim() || 'Unassigned',
      responseTime: rowData['Time to Response']?.trim() || null,
      responseStatus: rowData.Response === 'Yes' ? 'responded' : 'pending',
      timelineEvents: [], // Initialize empty timeline
      createdAt: parseDate(rowData.Time),
      updatedAt: parseDate(rowData.Time)
    };
  });
}
