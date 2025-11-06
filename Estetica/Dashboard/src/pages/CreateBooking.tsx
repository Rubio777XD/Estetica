import { useEffect } from 'react';

export default function CreateBookingRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const targetPath = '/citas-pendientes';
    if (window.location.pathname !== targetPath) {
      window.history.replaceState(null, '', targetPath);
    }
    window.dispatchEvent(new CustomEvent('dashboard:navigate:citas-pendientes'));
  }, []);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-gray-500">Redirigiendo a Citas pendientes…</p>
    </div>
  );
}
