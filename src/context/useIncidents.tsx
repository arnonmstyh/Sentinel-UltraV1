import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Incident } from '@/types/incident';
import { getApiUrl, apiFetch } from '@/lib/api';

interface IncidentsContextType {
  incidents: Incident[];
  loading: boolean;
  error: string | null;
  isLiveData: boolean;
  lastSyncTime: Date | null;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  addIncident: (incident: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Incident>;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  deleteIncident: (id: string) => void;
  getIncidentById: (id: string) => Incident | undefined;
  refreshData: () => Promise<void>;
}

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

      // Parse dates
      const parsedIncidents = data.map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        // Ensure arrays are arrays (sqlite stores as JSON string sometimes if not handled by sequelize properly, but sequelize should handle it)
        destinationIPs: typeof item.destinationIPs === 'string' ? JSON.parse(item.destinationIPs) : item.destinationIPs,
        timelineEvents: typeof item.timelineEvents === 'string' ? JSON.parse(item.timelineEvents) : (item.timelineEvents || [])
      }));

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

  const addIncident = async (incidentData: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident> => {
    const response = await apiFetch(`${getApiUrl()}/api/incidents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(incidentData),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(errorBody || 'Failed to create incident');
    }

    const created = await response.json();

    const parsedIncident: Incident = {
      ...created,
      createdAt: new Date(created.createdAt),
      updatedAt: new Date(created.updatedAt),
      destinationIPs: typeof created.destinationIPs === 'string' ? JSON.parse(created.destinationIPs) : created.destinationIPs,
      timelineEvents: typeof created.timelineEvents === 'string' ? JSON.parse(created.timelineEvents) : (created.timelineEvents || []),
    };

    // Prepend new incident to state
    setIncidents(prev => [parsedIncident, ...prev]);

    return parsedIncident;
  };

  const updateIncident = async (id: string, updates: Partial<Incident>) => {
    // Optimistic update
    setIncidents(prev =>
      prev.map(incident =>
        incident.id === id
          ? { ...incident, ...updates, updatedAt: new Date() }
          : incident
      )
    );

    try {
      await apiFetch(`${getApiUrl()}/api/incidents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to save incident update:', err);
      // Revert or show error could go here
    }
  };

  const deleteIncident = async (id: string) => {
    // Capture previous state for rollback
    const previousIncidents = incidents;

    // Optimistic removal
    setIncidents(prev => prev.filter(incident => incident.id !== id));

    try {
      const response = await apiFetch(`${getApiUrl()}/api/incidents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete incident');
      }
    } catch (err) {
      console.error('Failed to delete incident, rolling back:', err);
      // Rollback on error
      setIncidents(previousIncidents);
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
