import { apiFetch } from "./api";

interface MeResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
  };
}

export const ensureSession = async (): Promise<MeResponse["user"]> => {
  const response = await apiFetch<MeResponse>("/api/me");
  if (!response?.user) {
    throw new Error("No fue posible validar la sesión");
  }
  return response.user;
};

export const logout = async (): Promise<void> => {
  try {
    await apiFetch("/api/logout", { method: "POST" });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("No fue posible cerrar sesión desde el dashboard", error);
    }
  }
};
