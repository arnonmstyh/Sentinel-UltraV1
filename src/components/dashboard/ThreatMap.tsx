import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { useIncidents } from "@/context/useIncidents";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, GeoJSON } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

// Component to fit bounds after map loads
const MapBounds = ({ threats }: { threats: Array<{ lat: number; lng: number }> }) => {
  const map = useMap();
  
  useEffect(() => {
    if (threats.length > 0) {
      const bounds = threats.map(t => [t.lat, t.lng] as [number, number]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [threats, map]);
  
  return null;
};

const ThreatMap = () => {
  const { incidents } = useIncidents();
  // Build country scores (heat) based on severity-weighted incidents
  const countryToLatLng: Record<string, [number, number]> = {
    Thailand: [15.8700, 100.9925],
    Indonesia: [-0.7893, 113.9213],
    Netherlands: [52.3676, 4.9041],
    China: [35.8617, 104.1954],
    "China Telecom": [35.8617, 104.1954],
    "China Unicom": [35.8617, 104.1954],
    "United States": [37.0902, -95.7129],
    "United States of America": [37.0902, -95.7129],
    "Russian Federation": [55.7558, 37.6173],
    Russia: [55.7558, 37.6173],
    Vietnam: [14.0583, 108.2772],
    "Iran, Islamic Republic of": [32.4279, 53.6880],
    "Syrian Arab Republic": [34.8021, 38.9968],
    "Czech Republic": [49.8175, 15.4730],
    "Bolivia, Plurinational State of": [-16.2902, -63.5887],
    "Tanzania, United Republic of": [-6.3690, 34.8888],
    "Moldova, Republic of": [47.0105, 28.8638],
    "Korea, Republic of": [35.9078, 127.7669],
    "Korea, Democratic People's Republic of": [40.3399, 127.5101],
    "Lao People's Democratic Republic": [19.8563, 102.4955],
    "Congo, the Democratic Republic of the": [-4.0383, 21.7587],
    Congo: [-0.2280, 15.8277],
    "Côte d'Ivoire": [7.5400, -5.5471],
    Burma: [21.9162, 95.9560],
    Cambodia: [12.5657, 104.9910],
    "Kingdom of Cambodia": [12.5657, 104.9910],
    "South Korea": [35.9078, 127.7669],
    Bangladesh: [23.6850, 90.3563],
    Ukraine: [48.3794, 31.1656],
    Ukrain: [48.3794, 31.1656],
    Germany: [51.1657, 10.4515],
    France: [46.2276, 2.2137],
    India: [20.5937, 78.9629],
    Japan: [36.2048, 138.2529],
    Brazil: [-14.2350, -51.9253],
    Singapore: [1.3521, 103.8198],
    Malaysia: [4.2105, 101.9758],
    Philippines: [12.8797, 121.7740],
    Pakistan: [30.3753, 69.3451],
    "Hong Kong": [22.3193, 114.1694],
    Taiwan: [23.6978, 120.9605],
    Romania: [45.9432, 24.9668],
    Bulgaria: [42.7339, 25.4858],
    Poland: [51.9194, 19.1451],
    Turkey: [38.9637, 35.2433],
    "United Kingdom": [55.3781, -3.4360],
    Canada: [56.1304, -106.3468],
    Australia: [-25.2744, 133.7751],
    Mexico: [23.6345, -102.5528],
    Argentina: [-38.4161, -63.6167],
    Egypt: [26.8206, 30.8025],
    "South Africa": [-30.5595, 22.9375],
    Nigeria: [9.0820, 8.6753],
    Kenya: [-0.0236, 37.9062],
    Iraq: [33.2232, 43.6793],
    "Saudi Arabia": [23.8859, 45.0792],
    "United Arab Emirates": [23.4241, 53.8478],
    Israel: [31.0461, 34.8516],
  };

  // Normalize country naming variations before any computations
  const normalizeCountryName = (name: string) => {
    const n = (name || "").trim();
    const map: Record<string, string> = {
      "United States": "United States of America",
      "USA": "United States of America",
      "U.S.A.": "United States of America",
      "Russia": "Russian Federation",
      "Iran": "Iran, Islamic Republic of",
      "Syria": "Syrian Arab Republic",
      "Viet Nam": "Vietnam",
      "Czechia": "Czech Republic",
      "Bolivia": "Bolivia, Plurinational State of",
      "Tanzania": "Tanzania, United Republic of",
      "Moldova": "Moldova, Republic of",
      "South Korea": "Korea, Republic of",
      "North Korea": "Korea, Democratic People's Republic of",
      "Laos": "Lao People's Democratic Republic",
      "Congo (Kinshasa)": "Congo, the Democratic Republic of the",
      "Congo (Brazzaville)": "Congo",
      "Ivory Coast": "Côte d'Ivoire",
      "Myanmar": "Burma",
      "BD": "Bangladesh",
      "BANGLADESH": "Bangladesh",
    };
    if (map[n]) return map[n];
    const lower = n.toLowerCase();
    if (lower.includes("china")) return "China";
    if (lower.includes("indonesia")) return "Indonesia";
    if (lower.includes("thailand")) return "Thailand";
    if (lower.includes("netherlands")) return "Netherlands";
    if (lower.includes("united states")) return "United States of America";
    if (lower.includes("russia")) return "Russian Federation";
    if (lower.includes("korea") && lower.includes("democratic")) return "Korea, Democratic People's Republic of";
    if (lower.includes("korea")) return "Korea, Republic of";
    if (lower.includes("cambodia") || lower.includes("khmer")) return "Cambodia";
    if (lower.includes("bangladesh") || lower === "bd") return "Bangladesh";
    if (lower.includes("ukrain")) return "Ukraine";
    if (lower.includes("unidentif") || lower.includes("unknown")) return "";
    return n;
  };
  const threats = incidents.map(i => {
    const country = normalizeCountryName(i.country || "");
    const ll = countryToLatLng[country] || countryToLatLng[normalizeCountryName(country)] || null;
    if (!ll) return null;
    return {
      id: i.id,
      title: i.title,
      severity: i.severity,
      type: i.type,
      status: i.status,
      country,
      lat: ll[0],
      lng: ll[1],
    };
  }).filter(Boolean) as Array<{id:string;title:string;severity:string;type:string;status:string;country:string;lat:number;lng:number}>;

  // (moved normalizeCountryName above)

  const severityWeight = (sev: string) => sev === "critical" ? 1 : sev === "high" ? 0.8 : sev === "medium" ? 0.4 : 0.1;
  const countryWeights = useMemo(() => {
    const acc: Record<string, number> = {};
    incidents.forEach(i => {
      const country = normalizeCountryName(i.country || "");
      if (!country) return;
      acc[country] = (acc[country] || 0) + severityWeight(i.severity);
    });
    return acc;
  }, [incidents]);

  // Calculate actual incident counts per country
  const countryIncidentCounts = useMemo(() => {
    const acc: Record<string, number> = {};
    incidents.forEach(i => {
      const country = normalizeCountryName(i.country || "");
      if (!country) return;
      acc[country] = (acc[country] || 0) + 1;
    });
    return acc;
  }, [incidents]);

  // Calculate actual incident severities per country
  const countryIncidentSeverities = useMemo(() => {
    const acc: Record<string, { critical: number; high: number; medium: number; low: number }> = {};
    incidents.forEach(i => {
      const country = normalizeCountryName(i.country || "");
      if (!country) return;
      if (!acc[country]) {
        acc[country] = { critical: 0, high: 0, medium: 0, low: 0 };
      }
      acc[country][i.severity as keyof typeof acc[string]]++;
    });
    return acc;
  }, [incidents]);

  const maxScore = useMemo(() => {
    return Object.values(countryWeights).reduce((m, v) => Math.max(m, v), 0) || 1;
  }, [countryWeights]);

  const normalizeKey = (s: string) =>
    (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .replace(/[^a-z]/g, "");

  // Function to determine actual risk level based on incident severities
  const getActualRiskLevel = (countryName: string): string => {
    const severities = countryIncidentSeverities[countryName] || countryIncidentSeverities[normalizeCountryName(countryName)];
    if (!severities) return 'Low';
    
    // If there are any critical incidents, risk level is High
    if (severities.critical > 0) return 'High';
    
    // If there are any high incidents, risk level is High
    if (severities.high > 0) return 'High';
    
    // If there are any medium incidents, risk level is Medium
    if (severities.medium > 0) return 'Medium';
    
    // Only low incidents, risk level is Low
    return 'Low';
  };

  const countryKeyToScore = useMemo(() => {
    const map: Record<string, number> = {};
    Object.entries(countryWeights).forEach(([name, score]) => {
      map[normalizeKey(name)] = (map[normalizeKey(name)] || 0) + score;
    });
    return map;
  }, [countryWeights]);

  // Load world countries GeoJSON (lightweight)
  const [worldData, setWorldData] = useState<any | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("https://unpkg.com/geojson-world@3.0.0/countries.geo.json");
        const json = await resp.json();
        if (!cancelled) setWorldData(json);
      } catch {
        setWorldData(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "#ef4444";
      case "high": return "#f97316";
      case "medium": return "#f59e0b";
      case "low": return "#84cc16";
      default: return "#3b82f6";
    }
  };
  
  const getSeverityRadius = (severity: string) => {
    switch (severity) {
      case "critical": return 15;
      case "high": return 12;
      case "medium": return 10;
      case "low": return 8;
      default: return 10;
    }
  };

  return (
    <Card className="bg-gradient-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Global Threat Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96 rounded-lg overflow-hidden">
          <MapContainer
            center={[20, 0] as LatLngExpression}
            zoom={2}
            minZoom={2}
            maxBounds={[[85, -180], [-85, 180]] as any}
            maxBoundsViscosity={1.0}
            worldCopyJump={false}
            style={{ height: "100%", width: "100%", background: "#1a1f2e" }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              noWrap={true}
            />
            
            <MapBounds threats={threats} />
            
            {/* Country heat layer */}
            {worldData && (
              <GeoJSON
                data={worldData as any}
                style={(feature: any) => {
                  const raw: string = feature?.properties?.name || "";
                  const name = normalizeCountryName(raw);
                  const score = countryKeyToScore[normalizeKey(name)] || countryKeyToScore[normalizeKey(raw)] || 0;
                  const ratio = Math.max(0, Math.min(1, score / maxScore));
                  const intensity = score > 0 ? Math.max(0.15, ratio) : 0; // ensure visible minimum
                  
                  // Determine color based on threat level (3 levels: High, Medium, Low)
                  let color = '#fca5a5'; // Light red for low
                  if (ratio >= 0.6) color = '#dc2626'; // Dark red for high
                  else if (ratio >= 0.3) color = '#f87171'; // Medium red for medium
                  
                  const fill = `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, ${intensity})`;
                  return {
                    color: "#4b5563",
                    weight: 1,
                    fillColor: fill,
                    fillOpacity: intensity,
                  } as any;
                }}
                onEachFeature={(feature: any, layer: any) => {
                  const raw: string = feature?.properties?.name || "";
                  const name = normalizeCountryName(raw);
                  const score = countryKeyToScore[normalizeKey(name)] || countryKeyToScore[normalizeKey(raw)] || 0;
                  const incidentCount = countryIncidentCounts[name] || countryIncidentCounts[normalizeCountryName(raw)] || 0;
                  if (score > 0) {
                    const actualRiskLevel = getActualRiskLevel(name);
                    const riskLevelColor = actualRiskLevel === 'High' ? '#dc2626' : actualRiskLevel === 'Medium' ? '#f87171' : '#fca5a5';
                    
                    layer.bindPopup(`
                      <div style="padding: 8px; min-width: 150px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>
                        <div style="margin-bottom: 4px;">
                          <span style="font-weight: bold;">Risk Level:</span> 
                          <span style="color: ${riskLevelColor}; font-weight: bold;">${actualRiskLevel}</span>
                        </div>
                        <div style="margin-bottom: 4px;">
                          <span style="font-weight: bold;">Count:</span> ${incidentCount}
                        </div>
                      </div>
                    `);
                  }
                }}
              />
            )}

            {/* Also render centroid markers scaled by incident count as a visible fallback */}
            {Object.entries(countryWeights).map(([name, score]) => {
              if (!score) return null;
              const ll = countryToLatLng[name] || countryToLatLng[normalizeCountryName(name)] || null;
              if (!ll) return null;
              const ratio = Math.max(0.2, Math.min(1, score / maxScore));
              const incidentCount = countryIncidentCounts[name] || countryIncidentCounts[normalizeCountryName(name)] || 0;
              const actualRiskLevel = getActualRiskLevel(name);
              
              // Determine color based on actual risk level
              let color = '#fca5a5'; // Light red for low
              if (actualRiskLevel === 'High') color = '#dc2626'; // Dark red for high
              else if (actualRiskLevel === 'Medium') color = '#f87171'; // Medium red for medium
              
              return (
                <CircleMarker
                  key={`centroid-${name}`}
                  center={[ll[0], ll[1]] as LatLngExpression}
                  pathOptions={{ fillColor: color, fillOpacity: 0.8, color: color, weight: 2 }}
                  radius={8 + 12 * ratio}
                >
                  <Popup>
                    <div className="p-3 min-w-[150px]">
                      <h3 className="font-semibold text-sm mb-2">{name}</h3>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-medium">Risk Level:</span>
                          <span 
                            className="font-bold"
                            style={{ 
                              color: actualRiskLevel === 'High' ? '#dc2626' : actualRiskLevel === 'Medium' ? '#f87171' : '#fca5a5'
                            }}
                          >
                            {actualRiskLevel}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Count:</span>
                          <span className="font-mono">{incidentCount}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3 space-y-2 z-[1000]">
            <p className="text-xs font-semibold text-foreground">Threat Severity</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#dc2626' }} />
                <span className="text-xs text-muted-foreground">High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f87171' }} />
                <span className="text-xs text-muted-foreground">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#fca5a5' }} />
                <span className="text-xs text-muted-foreground">Low</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThreatMap;
