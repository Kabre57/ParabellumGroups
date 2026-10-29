import { create } from 'axios';
import * as SecureStore from 'expo-secure-store';

import { useEnterpriseStore } from '../stores/enterpriseStore';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://parabellum-erp.online/api';
const baseURL = configuredBaseUrl.endsWith('/api')
  ? configuredBaseUrl
  : `${configuredBaseUrl.replace(/\/$/, '')}/api`;

export const apiClient = create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

const isPublicAuthUrl = (url?: string): boolean => Boolean(url && [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
].some((path) => url.includes(path)));

apiClient.interceptors.request.use(async (config) => {
  if (!isPublicAuthUrl(config.url)) {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }

  const enterpriseId = useEnterpriseStore.getState().activeEnterpriseId;
  if (enterpriseId !== null) config.headers.set('X-Enterprise-Id', String(enterpriseId));
  return config;
});
