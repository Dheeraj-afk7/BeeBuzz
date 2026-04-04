// api.ts

import axios from 'axios';
import { mockAuthApi, mockLoadApi, mockPaymentApi } from './mockApi.tsx';

// Set this to true to use mock API (no backend needed)
const USE_MOCK_API = false;

// Real API instance
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Mock Helper APIs ---

const mockBidApi = {
  create: async () => ({ data: { success: true } }),
  update: async () => ({ data: { success: true } }),
  getForLoad: async () => ({ data: { data: [] } }),
  getMyBids: async () => ({ data: { data: [] } }),
  accept: async () => ({ data: { success: true } }),
  reject: async () => ({ data: { success: true } })
};

const mockNotificationApi = {
  getAll: async () => ({ data: { data: [] } }),
  getUnread: async () => ({ data: { data: { count: 0 } } }),
  markAsRead: async () => ({ data: { success: true } })
};

const mockChatApi = {
  send: async () => ({ data: { success: true } }),
  getMessages: async () => ({ data: { data: [] } })
};

// --- Real API Definitions ---

const realAuthApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data)
};

const realLoadApi = {
  create: (data: any) => api.post('/loads', data),
  getAll: (params?: any) => api.get('/loads', { params }),
  getOne: (id: string) => api.get(`/loads/${id}?_t=${Date.now()}`),
  update: (id: string, data: any) => api.put(`/loads/${id}`, data),
  accept: (id: string) => api.post(`/loads/${id}/accept`),
  updateStatus: (id: string, status: string, notes?: string) => 
    api.put(`/loads/${id}/status`, { status, notes }),
  updateLocation: (id: string, lat: number, lng: number) => 
    api.put(`/loads/${id}/location`, { lat, lng }),
  cancel: (id: string) => api.delete(`/loads/${id}`),
  uploadPod: (id: string, data: any) => api.put(`/loads/${id}/pod`, data)
};

const realBidApi = {
  create: (data: any) => api.post('/bids', data),
  getForLoad: (loadId: string) => api.get(`/bids/load/${loadId}`),
  getMyBids: () => api.get('/bids/my'),
  update: (bidId: string, data: any) => api.put(`/bids/${bidId}`, data),
  accept: (bidId: string) => api.put(`/bids/${bidId}/accept`),
  reject: (bidId: string) => api.put(`/bids/${bidId}/reject`)
};

const realNotificationApi = {
  getAll: () => api.get('/notifications'),
  getUnread: () => api.get('/notifications/unread'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`)
};

const realChatApi = {
  send: (data: any) => api.post('/chat', data),
  getMessages: (loadId: string) => api.get(`/chat/${loadId}`)
};

const realPaymentApi = {
  getEarnings: () => api.get('/payments/earnings'),
  getAll: (params?: { role?: string; page?: number; limit?: number }) => 
    api.get('/payments', { params }),
  requestPayout: (amount: number) => api.post('/payments/payout', { amount }),
  getPayoutHistory: () => api.get('/payments/payouts')
};

// --- Select API based on Flag ---

if (USE_MOCK_API) {
  console.log('🔧 Using Mock API');
}

export const authApi = USE_MOCK_API ? mockAuthApi : realAuthApi;
export const loadApi = USE_MOCK_API ? mockLoadApi : realLoadApi;
export const paymentApi = USE_MOCK_API ? mockPaymentApi : realPaymentApi;
export const bidApi = USE_MOCK_API ? mockBidApi : realBidApi;
export const notificationApi = USE_MOCK_API ? mockNotificationApi : realNotificationApi;
export const chatApi = USE_MOCK_API ? mockChatApi : realChatApi;

export default api;
