import { apiFetch, API_BASE_URL, AUTH_STORAGE_KEY, getStoredToken, clearStoredToken } from "./api";

interface LoginResponse {
  token: string;
}

interface MeResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
  };
}

const isBrowser = typeof window !== "undefined";

const persistToken = (token: string) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, token);
  } catch (error) {
    console.warn("No fue posible guardar salon_auth en localStorage", error);
  }
};

export const login = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (response.status === 401) {
    clearStoredToken();
  }

  if (!response.ok) {
    let errorMessage = "No fue posible iniciar sesión";
    try {
      const data = (await response.json()) as { error?: string } | undefined;
      if (data?.error) {
        errorMessage = data.error;
      }
    } catch (error) {
      // Ignorar errores de parseo
    }
    throw new Error(errorMessage);
  }

  const data = (await response.json()) as LoginResponse;
  if (!data?.token) {
    throw new Error("Respuesta de login inválida");
  }

  persistToken(data.token);
  return data.token;
};

export const fetchMe = async (): Promise<MeResponse["user"]> => {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Sesión no disponible");
  }

  const data = await apiFetch<MeResponse>("/api/me");
  if (!data?.user) {
    throw new Error("No se pudo obtener el usuario");
  }
  return data.user;
};

export const logout = () => {
  clearStoredToken();
};
