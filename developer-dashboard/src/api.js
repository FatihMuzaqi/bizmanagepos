import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dev_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to catch 401 and redirect to login
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dev_token');
      localStorage.removeItem('dev_user');
      window.dispatchEvent(new Event('dev_auth_changed'));
    }
    const message = error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
    return Promise.reject(new Error(message));
  }
);

export const developerApi = {
  // Auth
  login: (credentials) => api.post('/developer/login', credentials),

  // Monitoring Stats
  getStats: () => api.get('/developer/stats'),

  // Users
  getUsers: (params) => api.get('/developer/users', { params }),
  toggleUserStatus: (id, isActive) => api.put(`/developer/users/${id}/status`, { isActive }),
  resetUserPassword: (id, password) => api.put(`/developer/users/${id}/password`, { password }),

  // Businesses
  getBusinesses: (params) => api.get('/developer/businesses', { params }),

  // Subscriptions & Midtrans Invoices
  getSubscriptions: (params) => api.get('/developer/subscriptions', { params }),
  updateSubscription: (id, data) => api.put(`/developer/subscriptions/${id}`, data),
  getInvoices: (params) => api.get('/developer/invoices', { params }),

  // SaaS Plans Price & Limit Management
  getPlans: () => api.get('/developer/plans'),
  createPlan: (data) => api.post('/developer/plans', data),
  updatePlan: (id, data) => api.put(`/developer/plans/${id}`, data),
  deletePlan: (id) => api.delete(`/developer/plans/${id}`),
};

export default api;
