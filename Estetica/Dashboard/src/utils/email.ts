import { API_BASE_URL } from '../lib/api';

export const sendTestEmail = async (): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/api/test-email`, {
    method: 'GET',
    headers: {
      Accept: 'text/plain',
    },
    credentials: 'include',
  });

  let message: string;
  try {
    message = await response.text();
  } catch (error) {
    message = '';
  }

  if (!response.ok) {
    throw new Error(message || 'No fue posible enviar el correo de prueba');
  }

  return message || '✅ Correo enviado correctamente.';
};
