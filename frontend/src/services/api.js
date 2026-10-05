import axios from 'axios';

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const hostname = window.location.hostname || 'localhost';
    return `${protocol}//${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const host = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  const protocol = (typeof window !== 'undefined' && window.location.protocol) || 'http:';
  return `${protocol}//${host}:5000${path.startsWith('/') ? '' : '/'}${path}`;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor: Attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('swms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle auth expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginEndpoint = error.config && error.config.url && error.config.url.includes('/auth/login');
      if (!isLoginEndpoint && localStorage.getItem('swms_token')) {
        localStorage.removeItem('swms_token');
        localStorage.removeItem('swms_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  getCollectors: () => api.get('/auth/collectors'),
  getAllUsers: (role) => api.get('/auth/users', { params: { role } }),
};

// Bins APIs
export const binsAPI = {
  getAll: (params) => api.get('/bins', { params }),
  getById: (id) => api.get(`/bins/${id}`),
  getPrediction: (id) => api.get(`/bins/${id}/prediction`),
  classifyDeposit: (id, data) => api.post(`/bins/${id}/classify-deposit`, data),
  create: (data) => api.post('/bins', data),
  update: (id, data) => api.put(`/bins/${id}`, data),
  delete: (id) => api.delete(`/bins/${id}`),
};

// IoT Telemetry API
export const iotAPI = {
  sendReading: (readingData, apiKey) =>
    api.post('/iot/bin-reading', readingData, {
      headers: { 'x-api-key': apiKey || 'swms_iot_device_secure_token_998877' },
    }),
};

// Collections APIs
export const collectionsAPI = {
  getAll: (params) => api.get('/collections', { params }),
  getById: (id) => api.get(`/collections/${id}`),
  create: (data) => api.post('/collections', data),
  assign: (id, data) => api.put(`/collections/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/collections/${id}/status`, data),
  recordCollection: (id, formData) =>
    api.post(`/collections/${id}/collect`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getPlannedRoute: (params) => api.get('/collections/route/plan', { params }),
};

// Complaints APIs (Illegal Dumping)
export const complaintsAPI = {
  getAll: (params) => api.get('/complaints', { params }),
  getMy: () => api.get('/complaints/my'),
  create: (formData) =>
    api.post('/complaints', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateStatus: (id, data) => api.put(`/complaints/${id}/status`, data),
};

// Recycling APIs
export const recyclingAPI = {
  getIncoming: (params) => api.get('/recycling', { params }),
  getStats: () => api.get('/recycling/stats'),
  updateStatus: (id, data) => api.put(`/recycling/${id}/status`, data),
};

// Waste AI APIs
export const wasteAPI = {
  classify: (formData) =>
    api.post('/waste/classify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getHistory: () => api.get('/waste/history'),
};

// Analytics & Reports APIs
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  exportReportUrl: (type) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return `${API_BASE_URL}/reports/export?type=${type}${token ? `&token=${encodeURIComponent(token)}` : ''}`;
  },
  downloadReport: (type) =>
    api.get('/reports/export', {
      params: { type },
      responseType: 'blob',
    }),
};

// Collector Fleet APIs
export const collectorAPI = {
  updateLocation: (data) => api.post('/collector/location', data),
  getVehicle: () => api.get('/collector/vehicle'),
};

// Citizen Eco-Rewards APIs
export const rewardsAPI = {
  getCitizenRewards: () => api.get('/citizen/rewards'),
};

// Notifications APIs
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Admin Operations, Diagnostics & Anomaly APIs
export const adminAPI = {
  getAnomalies: () => api.get('/admin/anomalies'),
  getMaintenance: () => api.get('/admin/maintenance'),
  getAuditLogs: () => api.get('/admin/audit-logs'),
  getSystemHealth: () => api.get('/admin/system-health'),
};

export default api;

