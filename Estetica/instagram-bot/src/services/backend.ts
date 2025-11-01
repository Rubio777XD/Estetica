import axios from 'axios';

import { config } from '../config';
import { logger } from '../utils/logger';

export type BackendService = {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string | null;
};

export type CreateBookingPayload = {
  clientName: string;
  serviceId: string;
  startTime: string;
  notes?: string | null;
  email?: string | null;
  phone?: string | null;
};

const client = axios.create({
  baseURL: config.urls.backend,
  timeout: 10_000,
});

let servicesCache: BackendService[] = [];
let lastRefresh: number | null = null;

export const refreshServices = async () => {
  try {
    const response = await client.get('/api/public/services');
    const services =
      (response.data?.data?.services as BackendService[] | undefined) ??
      (response.data?.services as BackendService[] | undefined) ??
      [];
    if (Array.isArray(services)) {
      servicesCache = services;
      lastRefresh = Date.now();
      logger.info({ count: services.length }, 'Servicios sincronizados desde el backend');
    } else {
      throw new Error('Respuesta inválida del backend al obtener servicios');
    }
  } catch (error) {
    logger.error({ err: error }, 'Error al sincronizar servicios');
    throw error;
  }
};

export const scheduleServiceRefresh = () => {
  const interval = config.services.refreshIntervalMs;
  setInterval(() => {
    refreshServices().catch((error) => {
      logger.error({ err: error }, 'Fallo en refresco periódico de servicios');
    });
  }, interval);
};

export const getCachedServices = () => servicesCache;

export const getLastRefresh = () => lastRefresh;

export const ensureServicesLoaded = async () => {
  if (servicesCache.length === 0) {
    await refreshServices();
  }
};

export const createBooking = async (payload: CreateBookingPayload) => {
  const response = await client.post('/api/public/bookings', payload);
  return response.data?.data?.booking ?? response.data?.booking ?? null;
};
