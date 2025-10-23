// API Configuration
const getApiBaseUrl = () => {
  console.log('Environment check:', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    hostname: window.location.hostname
  });
  
  // Check if we have an environment variable for the API URL
  if (import.meta.env.VITE_API_BASE_URL) {
    console.log('Using VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Fallback to localhost for development
  if (import.meta.env.DEV || window.location.hostname === 'localhost') {
    console.log('Using localhost for development');
    return 'http://localhost:5001';
  }
  
  // For production, use the actual Render backend URL
  console.log('Using production backend URL');
  return 'https://pos-system-backend-ctvx.onrender.com';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
  },
  ITEMS: '/api/items',
  ORDERS: '/api/orders',
  TABLES: '/api/tables',
  USERS: '/api/users',
  DASHBOARD: {
    CASHIER: '/api/dashboard/cashier',
    ADMIN: '/api/dashboard/admin',
  },
  HEALTH: '/api/health'
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  buildApiUrl
};