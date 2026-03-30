// API configuration
// When using Vite proxy, we can use relative URLs which will be proxied to backend
// This works both locally and via ngrok (single tunnel)

export const getApiUrl = (): string => {
  // Always use relative URL - Vite proxy handles forwarding to backend
  // This works because:
  // - Local: /api/* → proxy → localhost:3001/api/*
  // - Ngrok: /api/* → proxy → localhost:3001/api/*
  return '';
};

// Check if we're accessing via ngrok (for any special handling needed)
export const isNgrokAccess = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname.includes('ngrok-free.dev') || hostname.includes('ngrok.io') || hostname.includes('ngrok.app');
};

// Simple fetch wrapper - no special headers needed with proxy setup
export const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(url, options);
};

// For backwards compatibility
export const API_URL = getApiUrl();
