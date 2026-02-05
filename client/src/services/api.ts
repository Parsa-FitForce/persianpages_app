import axios from 'axios';
import type { AuthResponse, Category, Listing, ListingsResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  me: () => api.get<{ id: string; email: string; name: string }>('/auth/me'),
};

// Categories
export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories'),
};

// Listings
export const listingsApi = {
  getAll: (params?: {
    search?: string;
    category?: string;
    city?: string;
    country?: string;
    page?: number;
    limit?: number;
  }) => api.get<ListingsResponse>('/listings', { params }),

  getOne: (id: string) => api.get<Listing>(`/listings/${id}`),

  getMine: () => api.get<Listing[]>('/listings/user/me'),

  create: (data: Partial<Listing>) => api.post<Listing>('/listings', data),

  update: (id: string, data: Partial<Listing>) =>
    api.put<Listing>(`/listings/${id}`, data),

  delete: (id: string) => api.delete(`/listings/${id}`),
};

export default api;
