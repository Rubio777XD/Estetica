import { useMemo, useState } from 'react';
import { CalendarRange, Loader2, NotebookText } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

import { apiFetch } from '../lib/api';
import {
  formatCurrency,
  formatDateTime,
  localDateTimeToIso,
  toDateTimeInputValue,
} from '../lib/format';
import { useApiQuery } from '../lib/data-store';
import { DateTimeField } from './DateTimeField';
import type { Booking, Service } from '../types/api';

type BookingWithRelations = Booking & { service: Service | null };

const buildDefaultRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 0);
  return {
    from: toDateTimeInputValue(start.toISOString()),
    to: toDateTimeInputValue(end.toISOString()),
  };
};

export default function CitasTerminadas() {
  const defaults = useMemo(buildDefaultRange, []);
  const [filters, setFilters] = useState(() => ({ ...defaults }));
  const queryKey = `bookings:done:${filters.from}:${filters.to}`;

  const { data: bookings = [], status, error, refetch } = useApiQuery<BookingWithRelations[]>(
    queryKey,
    async () => {
      const params = new URLSearchParams({ status: 'done', limit: '200' });
      const fromIso = localDateTimeToIso(filters.from);
      const toIso = localDateTimeToIso(filters.to);
      if (fromIso) {
        params.set('from', fromIso.slice(0, 10));
      }
      if (toIso) {
        params.set('to', toIso.slice(0, 10));
      }
      const response = await apiFetch<{ bookings: BookingWithRelations[] }>(
        `/api/bookings?${params.toString()}`
      );
      return response.bookings.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    }
  );

  const totalAmount = useMemo(
    () =>
      bookings.reduce((sum, booking) => {
        const payments = booking.payments ?? [];
        return sum + payments.reduce((acc, payment) => acc + payment.amount, 0);
      }, 0),
    [bookings]
  );

  const handleReset = () => {
    setFilters({ ...defaults });
    void refetch();
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="border border-gray-200 rounded-lg p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
          <p className="text-sm text-gray-600">
            {error instanceof Error ? error.message : 'No fue posible cargar las citas terminadas.'}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (bookings.length === 0) {
      return (
        <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
          <p className="text-base font-medium text-gray-800">No hay citas marcadas como realizadas</p>
          <p className="text-sm text-gray-500">
            Ajusta los filtros de fecha para consultar periodos anteriores.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {bookings.map((booking) => {
          const totalPaid = (booking.payments ?? []).reduce((acc, payment) => acc + payment.amount, 0);
          return (
            <Card key={booking.id} className="border border-gray-200">
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-gray-500" /> {formatDateTime(booking.startTime)}
                  </CardTitle>
                  <p className="text-sm text-gray-500">{booking.clientName}</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                  Pago registrado: {formatCurrency(totalPaid)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Servicio</p>
                    <p className="text-sm font-medium text-gray-900">
                      {booking.service?.name ?? booking.serviceNameSnapshot}
                    </p>
                  </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Duración</p>
                  <p className="text-sm text-gray-700">
                    {(() => {
                      const durationMinutes = booking.service?.duration ?? booking.serviceDurationSnapshot;
                      return durationMinutes > 0 ? `${durationMinutes} minutos` : 'No disponible';
                    })()}
                  </p>
                </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Realizado por</p>
                    <p className="text-sm text-gray-700">{booking.completedBy ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500">Correo del cliente</p>
                    <p className="text-sm text-gray-700">{booking.clientEmail ?? '—'}</p>
                  </div>
                </div>
                {booking.notes ? (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-800 mb-1">Notas</p>
                    <p>{booking.notes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">
          Consulta el historial de citas marcadas como realizadas y sus pagos registrados.
        </p>
        <Card className="border border-gray-200">
          <CardContent className="py-6">
            <div className="grid gap-4 md:grid-cols-2">
              <DateTimeField
                label="Desde"
                value={filters.from}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, from: event.target.value }))
                }
                id="done-from"
                helperText="Selecciona la fecha inicial del periodo"
                required
              />
              <DateTimeField
                label="Hasta"
                value={filters.to}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, to: event.target.value }))
                }
                id="done-to"
                helperText="Selecciona la fecha final del periodo"
                required
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                Restablecer
              </Button>
              <Button onClick={() => refetch()}>Aplicar filtros</Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <NotebookText className="h-4 w-4" />
            <span>
              Total de citas: <strong>{bookings.length}</strong>
            </span>
          </div>
          <div className="text-sm text-gray-600">
            Total pagado en el periodo: <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </div>
      </div>

      {renderContent()}
    </div>
  );
}
