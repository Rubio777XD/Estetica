const DEFAULT_API_URL = "http://localhost:3000";

const rawUrl = (import.meta.env?.VITE_API_URL as string | undefined) || DEFAULT_API_URL;
export const API_BASE_URL = rawUrl.replace(/\/$/, "");

const STORAGE_KEY = "salon_auth";

const isBrowser = typeof window !== "undefined";

const getStoredToken = (): string | null => {
  if (!isBrowser) return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("No fue posible leer salon_auth desde localStorage", error);
    return null;
  }
};

const clearStoredToken = () => {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("No fue posible limpiar salon_auth desde localStorage", error);
  }
};

export const apiFetch = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
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
      signal: controller.signal,
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
      } catch (parseError) {
        // Ignorar errores de parseo; se usará el mensaje genérico
      }
      throw new Error(errorMessage || "Error en la solicitud");
    }

    const contentLength = response.headers.get("content-length");
    if (response.status === 204 || contentLength === "0") {
      return undefined as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

export { STORAGE_KEY as AUTH_STORAGE_KEY, getStoredToken, clearStoredToken };
