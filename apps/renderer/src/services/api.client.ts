import axios from 'axios';
import { useAuthStore } from '../store/authStore';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

// Inyecta el token JWT en cada request
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el servidor devuelve 401, limpia la sesión
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(err);
  }
);