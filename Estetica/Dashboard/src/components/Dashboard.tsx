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
} as const;

const STATUS_ORDER = ['scheduled', 'confirmed', 'done', 'canceled'] as const;

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

      <div className={styles.dashboardGrid}>
        <Card className={cn(styles.cardBase, styles.topCard, 'w-full rounded-none border border-gray-200')}>
          <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
            <CardTitle className={styles.cardTitle}>
              <CalendarDays className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
              Citas de hoy
            </CardTitle>
            <p className={styles.subtitle}>Resumen rápido del estado de las citas programadas para la fecha actual.</p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={styles.cardBody}>
              {overviewStatus === 'loading' ? (
                <div className={styles.statGrid}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className={cn(styles.statCard, styles.skeleton)} />
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
                <div className={styles.statGrid}>
                  {STATUS_ORDER.map((status) => (
                    <div key={status} className={styles.statCard}>
                      <span className={styles.statLabel}>{STATUS_LABELS[status]}</span>
                      <span className={styles.statValue}>{overview?.todayBookings?.[status] ?? 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.cardBase, styles.topCard, 'w-full rounded-none border border-gray-200')}>
          <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
            <CardTitle className={styles.cardTitle}>
              <Clock3 className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
              Citas próximas
            </CardTitle>
            <p className={styles.subtitle}>Las próximas 5 citas asignadas a colaboradoras.</p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={cn(styles.cardBody, styles.scrollable)}>
              {upcomingStatus === 'loading' ? (
                <div className={styles.itemList}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className={cn(styles.itemCard, styles.skeleton)} />
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
                <div className={styles.itemList}>
                  {upcoming.map((booking) => (
                    <div key={booking.id} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <p className={styles.itemTitle}>{booking.clientName}</p>
                        <Badge variant="outline" className={cn(styles.badge, 'border-gray-200 bg-gray-50 text-gray-600')}>
                          {booking.status === 'confirmed' ? 'Confirmada' : 'Programada'}
                        </Badge>
                      </div>
                      <p className={styles.itemMeta}>{booking.service.name}</p>
                      <p className={styles.itemMeta}>{formatDateTime(booking.startTime)}</p>
                      {booking.assignedEmail ? (
                        <p className={cn(styles.itemNote, styles.truncate)}>Colaboradora: {booking.assignedEmail}</p>
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
            <CardTitle className={styles.cardTitle}>
              <CalendarDays className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
              Citas pendientes
            </CardTitle>
            <p className={styles.subtitle}>Citas sin asignar que requieren atención inmediata.</p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={cn(styles.cardBody, styles.scrollable)}>
              {pendingStatus === 'loading' ? (
                <div className={styles.itemList}>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className={cn(styles.itemCard, styles.skeleton)} />
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
                <div className={styles.itemList}>
                  {pending.map((booking) => (
                    <div key={booking.id} className={styles.itemCard}>
                      <p className={styles.itemTitle}>{booking.clientName}</p>
                      <p className={styles.itemMeta}>{booking.service.name}</p>
                      <p className={styles.itemMeta}>{formatDateTime(booking.startTime)}</p>
                      {booking.notes ? (
                        <p className={cn(styles.itemNote, styles.clampTwo)}>Notas: {booking.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.cardBase, styles.servicesCard, styles.fullSpan, 'w-full rounded-none border border-gray-200')}>
          <CardHeader className="px-4 pt-4 pb-0 space-y-1.5">
            <CardTitle className={styles.cardTitle}>
              <Users className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
              Servicios más solicitados
            </CardTitle>
            <p className={styles.subtitle}>Ranking basado en las citas agendadas recientemente.</p>
          </CardHeader>
          <CardContent className={cn(styles.cardContent, 'px-4 pb-4')}>
            <div className={cn(styles.cardBody, styles.scrollable)}>
              {overviewStatus === 'loading' ? (
                <div className={styles.itemList}>
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className={cn(styles.itemCard, styles.skeleton)} />
                  ))}
                </div>
              ) : overviewStatus === 'error' ? (
                <p className="rounded-md border border-red-100 bg-red-50 p-4 text-xs text-red-700">
                  {overviewError instanceof Error ? overviewError.message : 'No fue posible obtener los servicios destacados.'}
                </p>
              ) : topServices.length === 0 ? (
                <p className="text-xs text-gray-500">Aún no hay suficientes datos para mostrar esta estadística.</p>
              ) : (
                <div className={styles.itemList}>
                  {topServices.map((service, index) => (
                    <div key={service.serviceId ?? index} className={styles.itemCard}>
                      <div className={styles.itemHeader}>
                        <div>
                          <p className={styles.itemTitle}>{service.name}</p>
                          <p className={styles.itemMeta}>{service.count} citas</p>
                        </div>
                        <Badge variant="outline" className={cn(styles.rankBadge, 'border-gray-200')}>
                          #{service.count}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
