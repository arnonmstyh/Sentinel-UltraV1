import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { VpnAccessRecord } from '@/types/vpn';
import { getApiUrl, apiFetch } from '@/lib/api';

interface VpnUsageContextType {
  records: VpnAccessRecord[];
  loading: boolean;
  error: string | null;
  isLiveData: boolean;
  lastSyncTime: Date | null;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (interval: number) => void;
  refreshData: () => Promise<void>;
}

const VpnUsageContext = createContext<VpnUsageContextType | undefined>(undefined);

export const useVpnUsage = () => {
  const context = useContext(VpnUsageContext);
  if (context === undefined) {
    throw new Error('useVpnUsage must be used within a VpnUsageProvider');
  }
  return context;
};

interface VpnUsageProviderProps {
  children: React.ReactNode;
}

export const VpnUsageProvider: React.FC<VpnUsageProviderProps> = ({ children }) => {
  const [records, setRecords] = useState<VpnAccessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveData, setIsLiveData] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);

  // Ref keeps the loader stable for the auto-refresh interval effect
  const loadVpnUsageRef = useRef<(force?: boolean) => Promise<void>>();

  const loadVpnUsage = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      const url = `${getApiUrl()}/api/vpn-usage${force ? '?force=1' : ''}`;
      const response = await apiFetch(url);
      if (!response.ok) throw new Error('Failed to fetch VPN usage');

      const data = await response.json();

      const parsed: VpnAccessRecord[] = data.map((item: any) => ({
        ...item,
        timestamp: item.timestamp ? new Date(item.timestamp) : null,
      }));

      setRecords(parsed);
      setIsLiveData(true);
      setLastSyncTime(new Date());
      console.log(`✅ Loaded ${parsed.length} VPN access records`);
    } catch (err) {
      console.error('❌ Failed to load VPN usage:', err);
      setError('Failed to load VPN usage data');
      setIsLiveData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  loadVpnUsageRef.current = loadVpnUsage;

  // Manual refresh bypasses the server cache
  const refreshData = async () => {
    await loadVpnUsage(true);
  };

  // Load on mount
  useEffect(() => {
    loadVpnUsage();
  }, [loadVpnUsage]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      loadVpnUsageRef.current?.();
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [autoRefreshInterval]);

  const value: VpnUsageContextType = {
    records,
    loading,
    error,
    isLiveData,
    lastSyncTime,
    autoRefreshInterval,
    setAutoRefreshInterval,
    refreshData,
  };

  return (
    <VpnUsageContext.Provider value={value}>
      {children}
    </VpnUsageContext.Provider>
  );
};
