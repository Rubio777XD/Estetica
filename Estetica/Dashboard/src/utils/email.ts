import { API_BASE_URL } from '../lib/api';

type TestEmailResponse = {
  success: true;
  message: string;
  data: {
    delivered: boolean;
    to: string;
    transport: unknown;
  };
};

export const sendTestEmail = async (): Promise<TestEmailResponse> => {
  const response = await fetch(`${API_BASE_URL}/api/test-email`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    // ignore parse errors, handled below
  }

  if (!response.ok || !payload || typeof payload !== 'object') {
    const errorMessage =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error?: unknown }).error ?? 'No fue posible enviar el correo de prueba')
        : 'No fue posible enviar el correo de prueba';
    throw new Error(errorMessage);
  }

  return payload as TestEmailResponse;
};
