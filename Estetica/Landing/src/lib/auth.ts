import { apiFetch, API_BASE_URL } from "./api";

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

export const login = async (email: string, password: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });

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
  return data?.token ?? "";
};

export const fetchMe = async (): Promise<MeResponse["user"]> => {
  const data = await apiFetch<MeResponse>("/api/me");
  if (!data?.user) {
    throw new Error("No se pudo obtener el usuario");
  }
  return data.user;
};

export const logout = async (): Promise<void> => {
  try {
    await apiFetch("/api/logout", { method: "POST" });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("No fue posible cerrar la sesión de forma remota", error);
    }
  }
};
