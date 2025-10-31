const DEFAULT_API_URL = "http://localhost:3000";

const rawUrl = (import.meta.env?.VITE_API_URL as string | undefined) || DEFAULT_API_URL;
export const API_BASE_URL = rawUrl.replace(/\/$/, "");

export const apiFetch = async <T = unknown>(path: string, options: RequestInit = {}): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const headers = new Headers(options.headers);

    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("Accept", "application/json");

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: options.credentials ?? "include",
    });

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

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};
