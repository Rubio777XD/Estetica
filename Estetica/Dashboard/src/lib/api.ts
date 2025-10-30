const DEFAULT_API_URL = "http://localhost:3000";

const rawUrl = (import.meta.env?.VITE_API_URL as string | undefined) || DEFAULT_API_URL;
export const API_BASE_URL = rawUrl.replace(/\/$/, "");

export const AUTH_STORAGE_KEY = "salon_auth";

const isBrowser = typeof window !== "undefined";

export const getStoredToken = (): string | null => {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn("No fue posible leer salon_auth desde localStorage", error);
    return null;
  }
};

export const clearStoredToken = () => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn("No fue posible limpiar salon_auth desde localStorage", error);
  }
};

export const apiFetch = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredToken();
  }

  if (!response.ok) {
    let errorMessage = `Error ${response.status}`;
    try {
      const data = await response.json();
      if (data && typeof data === "object" && "error" in data) {
        errorMessage = String((data as { error: unknown }).error);
      }
    } catch (error) {
      // Ignorar errores de parseo
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
};
