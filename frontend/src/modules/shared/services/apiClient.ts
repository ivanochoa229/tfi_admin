import axios from 'axios';

const API_BASE_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
  'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL
});

export const withAuthorization = (token: string | null | undefined) => ({
  headers: token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {}
});