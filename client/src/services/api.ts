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

  me: () => api.get<{ id: string; email: string; name: string; emailVerified: boolean; googleId?: string; hasPassword?: boolean }>('/auth/me'),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),

  verifyEmail: (token: string) =>
    api.get<{ message: string }>('/auth/verify-email', { params: { token } }),

  resendVerification: () =>
    api.post<{ message: string }>('/auth/resend-verification'),

  updateProfile: (data: { name: string; email: string }) =>
    api.put<{ id: string; email: string; name: string; emailVerified: boolean; googleId?: string }>('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put<{ message: string }>('/auth/change-password', data),
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

  create: (data: Partial<Listing> & { verificationToken?: string }) =>
    api.post<Listing>('/listings', data),

  update: (id: string, data: Partial<Listing>) =>
    api.put<Listing>(`/listings/${id}`, data),

  delete: (id: string) => api.delete(`/listings/${id}`),

  claim: (id: string, verificationToken: string) =>
    api.post<Listing>(`/listings/${id}/claim`, { verificationToken }),
};

// Phone Verification
export const verificationApi = {
  getPhoneHint: (listingId: string) =>
    api.get<{ maskedPhone: string }>(`/verification/phone-hint/${listingId}`),

  sendOtp: (data: { phone: string; channel: 'sms' | 'call'; listingId?: string }) =>
    api.post<{ message: string; expiresAt: string }>('/verification/send', data),

  confirmOtp: (data: { phone: string; code: string }) =>
    api.post<{ verificationToken: string }>('/verification/confirm', data),
};

// Upload
export const uploadApi = {
  uploadPhotos: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('photos', file));
    return api.post<{ urls: string[] }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
