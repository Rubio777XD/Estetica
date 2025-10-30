import { apiFetch, clearStoredToken, getStoredToken } from "./api";

interface MeResponse {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role?: string | null;
  };
}

export const ensureSession = async (): Promise<MeResponse["user"]> => {
  const token = getStoredToken();
  if (!token) {
    throw new Error("Token no disponible");
  }

  const response = await apiFetch<MeResponse>("/api/me");
  if (!response?.user) {
    throw new Error("No fue posible validar la sesión");
  }
  return response.user;
};

export const dropSession = () => {
  clearStoredToken();
};
