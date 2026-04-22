import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Incident } from '@/types/incident';
import { getApiUrl, apiFetch } from '@/lib/api';
import { toast } from 'sonner';

interface IncidentsContextType {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  isLiveData: boolean;
  lastSyncTime: Date | null;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  addIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt'>) => Promise<Incident>;
  updateIncident: (id: string, updates: Partial<Incident>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;
  getIncidentById: (id: string) => Incident | undefined;
  refreshData: () => Promise<void>;
}

// Parse a server incident payload into the frontend shape (dates, JSON arrays).
const parseIncident = (raw: any): Incident => ({
  ...raw,
  createdAt: new Date(raw.createdAt),
  updatedAt: new Date(raw.updatedAt),
  deletedAt: raw.deletedAt ? new Date(raw.deletedAt) : null,
  destinationIPs: typeof raw.destinationIPs === 'string' ? JSON.parse(raw.destinationIPs) : raw.destinationIPs,
  timelineEvents: typeof raw.timelineEvents === 'string' ? JSON.parse(raw.timelineEvents) : (raw.timelineEvents || []),
});

const IncidentsContext = createContext<IncidentsContextType | undefined>(undefined);

export const useIncidents = () => {
  const context = useContext(IncidentsContext);
  if (context === undefined) {
    throw new Error('useIncidents must be used within an IncidentsProvider');
  }
  return context;
};

interface IncidentsProviderProps {
  children: React.ReactNode;
}

export const IncidentsProvider: React.FC<IncidentsProviderProps> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(900000); // 15 min default

  // Use ref to keep loadIncidents stable for the interval effect
  const loadIncidentsRef = useRef<() => Promise<void>>();

  // Load data from Local API
  const loadIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading incidents from Local API...');
      const response = await apiFetch(`${getApiUrl()}/api/incidents`);
      if (!response.ok) throw new Error('Failed to fetch incidents');

      const data = await response.json();
      const parsedIncidents = data.map(parseIncident);

      setIncidents(parsedIncidents);
      setLastSyncTime(new Date());
      console.log(`✅ Loaded ${parsedIncidents.length} incidents`);
    } catch (err) {
      console.error('❌ Failed to load incidents:', err);
      setError('Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, []);

  loadIncidentsRef.current = loadIncidents;

  // Refresh data function
  const refreshData = async () => {
    await loadIncidents();
  };

  // Load data on mount
  useEffect(() => {
    loadIncidents();
  }, [loadIncidents]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      loadIncidentsRef.current?.();
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval]);

  const addIncident = async (incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt'>): Promise<Incident> => {
    try {
      const response = await apiFetch(`${getApiUrl()}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incidentData),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let message = 'Failed to create incident';
        try {
          const parsed = JSON.parse(errorBody);
          message = parsed.error || (parsed.details && parsed.details.join('; ')) || message;
        } catch { /* text body */ message = errorBody || message; }
        toast.error(message);
        throw new Error(message);
      }

      const parsedIncident = parseIncident(await response.json());
      setIncidents(prev => [parsedIncident, ...prev]);
      return parsedIncident;
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith('Failed'))) {
        toast.error('Failed to create incident (network error)');
      }
      throw err;
    }
  };

  const updateIncident = async (id: string, updates: Partial<Incident>): Promise<void> => {
    const current = incidents.find(i => i.id === id);
    if (!current) {
      toast.error('Cannot update: incident not found in current view');
      throw new Error('Incident not found in state');
    }

    // Snapshot for rollback on non-conflict failures.
    const previousIncidents = incidents;

    // Optimistic update.
    setIncidents(prev =>
      prev.map(incident =>
        incident.id === id
          ? { ...incident, ...updates, updatedAt: new Date() }
          : incident
      )
    );

    let response: Response;
    try {
      response = await apiFetch(`${getApiUrl()}/api/incidents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updates, version: current.version }),
      });
    } catch (err) {
      // Network error.
      console.error('Network error during incident update:', err);
      setIncidents(previousIncidents);
      toast.error('Network error — your change was not saved.');
      throw err;
    }

    if (response.ok) {
      const saved = parseIncident(await response.json());
      setIncidents(prev => prev.map(i => (i.id === id ? saved : i)));
      return;
    }

    // Parse server error payload.
    let body: any = {};
    try { body = await response.json(); } catch { /* leave empty */ }

    if (response.status === 409) {
      // Conflict — replace local state with server's current view so user sees actual values.
      if (body.currentIncident) {
        const server = parseIncident(body.currentIncident);
        setIncidents(prev => prev.map(i => (i.id === id ? server : i)));
      } else {
        setIncidents(previousIncidents);
      }
      toast.error('This incident was changed by someone else. Your update was not saved — please review the current values and try again.');
      throw new Error('Version conflict');
    }

    // All other failures — rollback and surface server message.
    setIncidents(previousIncidents);
    const msg = body.error
      || (body.details && body.details.join('; '))
      || `Save failed (HTTP ${response.status})`;
    toast.error(msg);
    throw new Error(msg);
  };

  const deleteIncident = async (id: string): Promise<void> => {
    const previousIncidents = incidents;
    setIncidents(prev => prev.filter(incident => incident.id !== id));

    let response: Response;
    try {
      response = await apiFetch(`${getApiUrl()}/api/incidents/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Network error during incident delete:', err);
      setIncidents(previousIncidents);
      toast.error('Network error — incident was not deleted.');
      throw err;
    }

    if (!response.ok) {
      setIncidents(previousIncidents);
      let msg = `Delete failed (HTTP ${response.status})`;
      try {
        const body = await response.json();
        msg = body.error || msg;
      } catch { /* ignore */ }
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const getIncidentById = (id: string) => {
    return incidents.find(incident => incident.id === id);
  };

  const value: IncidentsContextType = {
    incidents,
    loading,
    error,
    isLiveData: true, // Always true now backed by DB
    lastSyncTime,
    autoRefreshInterval,
    setAutoRefreshInterval,
    addIncident,
    updateIncident,
    deleteIncident,
    getIncidentById,
    refreshData,
  };

  return (
    <IncidentsContext.Provider value={value}>
      {children}
    </IncidentsContext.Provider>
  );
};
