import { useEffect, useSyncExternalStore } from "react";
import { apiFetch, API_BASE_URL } from "./api";

export interface PublicService {
  id: string;
  name: string;
  price: number;
  duration: number;
  description?: string | null;
  imageUrl?: string | null;
  highlights?: string[];
  updatedAt?: string;
}

interface PublicServicesResponse {
  services?: PublicService[];
  data?: { services: PublicService[] };
}

type ServiceState = {
  status: "idle" | "loading" | "success" | "error";
  services: PublicService[];
  error: string | null;
};

let state: ServiceState = { status: "idle", services: [], error: null };
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;
let eventSource: EventSource | null = null;
let retryTimer: number | undefined;
let retries = 0;

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

const setState = (partial: Partial<ServiceState>) => {
  state = { ...state, ...partial };
  emit();
};

const extractServices = (response: PublicServicesResponse): PublicService[] => {
  if (response.services && Array.isArray(response.services)) {
    return response.services;
  }
  if (response.data?.services && Array.isArray(response.data.services)) {
    return response.data.services;
  }
  return [];
};

const loadServices = async (force = false) => {
  if (!force && (state.status === "loading" || inflight)) {
    return inflight;
  }

  setState({ status: "loading", error: null });

  const request = (async () => {
    try {
      const response = await apiFetch<PublicServicesResponse>("/api/public/services");
      const services = extractServices(response);
      setState({ services, status: "success", error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No fue posible cargar los servicios";
      setState({ status: "error", error: message });
    } finally {
      inflight = null;
    }
  })();

  inflight = request;
  return request;
};

const stopStream = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  if (retryTimer) {
    window.clearTimeout(retryTimer);
    retryTimer = undefined;
  }
  retries = 0;
};

const startStream = () => {
  if (typeof window === "undefined") {
    return;
  }
  if (eventSource) {
    return;
  }

  const connect = () => {
    stopStream();

    const source = new EventSource(`${API_BASE_URL}/api/public/events`);
    eventSource = source;

    const handleChange = () => {
      void loadServices(true);
    };

    source.addEventListener("open", () => {
      retries = 0;
    });

    source.addEventListener("service:created", handleChange);
    source.addEventListener("service:updated", handleChange);
    source.addEventListener("service:deleted", handleChange);
    source.addEventListener("stats:invalidate", handleChange as EventListener);

    source.onerror = () => {
      source.close();
      eventSource = null;
      const delay = Math.min(30000, 2000 * Math.max(1, ++retries));
      retryTimer = window.setTimeout(connect, delay);
    };
  };

  connect();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (typeof window !== "undefined" && listeners.size === 1) {
    startStream();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      stopStream();
    }
  };
};

const getState = () => state;

export const usePublicServices = () => {
  const snapshot = useSyncExternalStore(subscribe, getState, getState);

  useEffect(() => {
    if (snapshot.status === "idle") {
      void loadServices();
    }
  }, [snapshot.status]);

  useEffect(() => {
    if (listeners.size > 0 && !eventSource) {
      startStream();
    }
  }, [snapshot.services.length]);

  return {
    services: snapshot.services,
    status: snapshot.status,
    error: snapshot.error,
    refresh: () => loadServices(true).catch(() => undefined),
  };
};
