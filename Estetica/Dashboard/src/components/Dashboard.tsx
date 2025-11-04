import { CalendarDays, Clock3, RefreshCw, Users } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from './ui/utils';

import styles from './Dashboard.module.css';

import { apiFetch } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { invalidateQuery, useApiQuery } from '../lib/data-store';
import type { Booking, Service, StatsOverviewResponse } from '../types/api';

type BookingWithService = Booking & { service: Service };

const STATUS_LABELS = {
  scheduled: 'Programadas',
  confirmed: 'Confirmadas',
  done: 'Realizadas',
  canceled: 'Canceladas',
};

export default function Dashboard() {
  const {
    data: overview,
    status: overviewStatus,
    error: overviewError,
    refetch: refetchOverview,
  } = useApiQuery<StatsOverviewResponse>('stats-overview', async () => apiFetch<StatsOverviewResponse>('/api/stats/overview'));

  const {
    data: upcoming = [],
    status: upcomingStatus,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useApiQuery<BookingWithService[]>(
    'bookings:upcoming:summary',
    async () => {
      const response = await apiFetch<{ bookings: BookingWithService[] }>('/api/bookings/upcoming');
      return response.bookings.slice(0, 5);
    }
  );

  const {
    data: pending = [],
    status: pendingStatus,
    error: pendingError,
    refetch: refetchPending,
  } = useApiQuery<BookingWithService[]>(
    'bookings:pending:summary',
    async () => {
      const response = await apiFetch<{ bookings: BookingWithService[] }>('/api/bookings/unassigned');
      return response.bookings.slice(0, 5);
    }
  );

  const topServices = overview?.topServices ?? [];

  const handleRefreshAll = () => {
    invalidateQuery('stats-overview');
    invalidateQuery('bookings:upcoming:summary');
    invalidateQuery('bookings:pending:summary');
    void refetchOverview();
    void refetchUpcoming();
    void refetchPending();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="gap-2 rounded-full border-gray-200 shadow-sm sm:w-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Actualizar panel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className={cn(styles.cardBase, styles.topCard, 'w-full rounded-none border border-gray-200')}>
          <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CalendarDays className="h-5 w-5 text-gray-500" aria-hidden="true" />
              Citas de hoy
            </CardTitle>
            <p className="text-xs text-gray-500 leading-relaxed">
              Resumen rápido del estado de las citas programadas para la fecha actual.
            </p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={styles.cardBody}>
              {overviewStatus === 'loading' ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : overviewStatus === 'error' ? (
                <div className="flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 p-4 text-xs text-red-700">
                  <p>{overviewError instanceof Error ? overviewError.message : 'No fue posible cargar el resumen diario.'}</p>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => refetchOverview()}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(overview?.todayBookings ?? {}).map(([status, value]) => (
                    <div
                      key={status}
                      className="flex flex-col justify-between rounded-md border border-gray-200 bg-gray-50/80 p-4"
                    >
                      <span className="text-[0.68rem] font-medium uppercase tracking-wide text-gray-500">
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                      </span>
                      <span className="text-2xl font-semibold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.cardBase, styles.topCard, 'w-full rounded-none border border-gray-200')}>
          <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock3 className="h-5 w-5 text-gray-500" aria-hidden="true" />
              Citas próximas
            </CardTitle>
            <p className="text-xs text-gray-500 leading-relaxed">
              Las próximas 5 citas asignadas a colaboradoras.
            </p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={cn(styles.cardBody, styles.scrollable)}>
              {upcomingStatus === 'loading' ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : upcomingStatus === 'error' ? (
                <div className="flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 p-4 text-xs text-red-700">
                  <p>{upcomingError instanceof Error ? upcomingError.message : 'No fue posible cargar las citas próximas.'}</p>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => refetchUpcoming()}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : upcoming.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 bg-white p-4 text-xs text-gray-500">
                  No hay citas próximas asignadas. Asigna nuevas citas desde la sección de pendientes.
                </p>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex flex-col gap-1 rounded-md border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900">{booking.clientName}</p>
                        <Badge variant="outline" className="border-gray-200 bg-gray-50 px-2 py-1 text-[0.7rem] text-gray-600">
                          {booking.status === 'confirmed' ? 'Confirmada' : 'Programada'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{booking.service.name}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.startTime)}</p>
                      {booking.assignedEmail ? (
                        <p className="text-xs text-gray-400">Colaboradora: {booking.assignedEmail}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.cardBase, styles.topCard, 'w-full rounded-none border border-gray-200')}>
          <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CalendarDays className="h-5 w-5 text-gray-500" aria-hidden="true" />
              Citas pendientes
            </CardTitle>
            <p className="text-xs text-gray-500 leading-relaxed">
              Citas sin asignar que requieren atención inmediata.
            </p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={cn(styles.cardBody, styles.scrollable)}>
              {pendingStatus === 'loading' ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : pendingStatus === 'error' ? (
                <div className="flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 p-4 text-xs text-red-700">
                  <p>{pendingError instanceof Error ? pendingError.message : 'No fue posible cargar las citas pendientes.'}</p>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => refetchPending()}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : pending.length === 0 ? (
                <p className="rounded-md border border-dashed border-gray-200 bg-white p-4 text-xs text-gray-500">
                  No hay citas pendientes por asignar. Las nuevas citas aparecerán aquí automáticamente.
                </p>
              ) : (
                <div className="space-y-2">
                  {pending.map((booking) => (
                    <div key={booking.id} className="rounded-md border border-gray-200 bg-white p-3">
                      <p className="text-sm font-semibold text-gray-900">{booking.clientName}</p>
                      <p className="text-xs text-gray-500">{booking.service.name}</p>
                      <p className="text-xs text-gray-500">{formatDateTime(booking.startTime)}</p>
                      {booking.notes ? (
                        <p className="text-xs text-gray-400 line-clamp-1">Notas: {booking.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(styles.cardBase, styles.servicesCard, 'rounded-none border border-gray-200')}>
        <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Users className="h-5 w-5 text-gray-500" aria-hidden="true" />
            Servicios más solicitados
          </CardTitle>
          <p className="text-xs text-gray-500 leading-relaxed">Ranking basado en las citas agendadas recientemente.</p>
        </CardHeader>
        <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
          <div className={cn(styles.cardBody, styles.scrollable)}>
            {overviewStatus === 'loading' ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-14 rounded-md bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : overviewStatus === 'error' ? (
              <p className="rounded-md border border-red-100 bg-red-50 p-4 text-xs text-red-700">
                {overviewError instanceof Error ? overviewError.message : 'No fue posible obtener los servicios destacados.'}
              </p>
            ) : topServices.length === 0 ? (
              <p className="text-xs text-gray-500">Aún no hay suficientes datos para mostrar esta estadística.</p>
            ) : (
              <div className="space-y-2">
                {topServices.map((service) => (
                  <div
                    key={service.serviceId}
                    className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50/80 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.count} citas</p>
                    </div>
                    <Badge variant="outline" className="border-gray-200 bg-white px-2 py-1 text-[0.7rem] text-gray-700">
                      #{service.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
