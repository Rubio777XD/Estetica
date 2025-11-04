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
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8">
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
        <Card className={cn(styles.dashCard, styles.dashCardTop)}>
          <CardHeader className={styles.dashCardHeader}>
            <div className={styles.dashCardTitleGroup}>
              <CalendarDays className={styles.dashCardIcon} />
              <CardTitle className={styles.dashCardHeading}>Citas de hoy</CardTitle>
            </div>
            <p className={styles.dashCardDescription}>
              Resumen rápido del estado de las citas programadas para la fecha actual.
            </p>
          </CardHeader>
          <CardContent className={styles.dashCardBody}>
            <div
              className={styles.dashCardScroll}
              role="region"
              aria-label="Resumen de citas para hoy"
              tabIndex={0}
            >
              {overviewStatus === 'loading' ? (
                <div className={styles.statusGrid}>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-20 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : overviewStatus === 'error' ? (
                <div className="flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <p>{overviewError instanceof Error ? overviewError.message : 'No fue posible cargar el resumen diario.'}</p>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => refetchOverview()}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.statusGrid}>
                  {Object.entries(overview?.todayBookings ?? {}).map(([status, value]) => (
                    <div key={status} className={styles.statusCard}>
                      <span className={styles.statusLabel}>
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                      </span>
                      <span className={styles.statusValue}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.dashCard, styles.dashCardTop)}>
          <CardHeader className={styles.dashCardHeader}>
            <div className={styles.dashCardTitleGroup}>
              <Clock3 className={styles.dashCardIcon} />
              <CardTitle className={styles.dashCardHeading}>Citas próximas</CardTitle>
            </div>
            <p className={styles.dashCardDescription}>Las próximas 5 citas asignadas a colaboradoras.</p>
          </CardHeader>
          <CardContent className={styles.dashCardBody}>
            <div
              className={styles.dashCardScroll}
              role="region"
              aria-label="Listado de citas próximas"
              tabIndex={0}
            >
              {upcomingStatus === 'loading' ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : upcomingStatus === 'error' ? (
                <div className="flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <p>{upcomingError instanceof Error ? upcomingError.message : 'No fue posible cargar las citas próximas.'}</p>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => refetchUpcoming()}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : upcoming.length === 0 ? (
                <div className={styles.emptyState}>
                  No hay citas próximas asignadas. Asigna nuevas citas desde la sección de pendientes.
                </div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((booking) => (
                    <div key={booking.id} className={styles.listItem}>
                      <div className={styles.listItemHeader}>
                        <p className={styles.listItemTitle}>{booking.clientName}</p>
                        <Badge variant="secondary" className={styles.badgeMuted}>
                          {booking.status === 'confirmed' ? 'Confirmada' : 'Programada'}
                        </Badge>
                      </div>
                      <p className={styles.listItemSubtle}>{booking.service.name}</p>
                      <p className={styles.listItemSubtle}>{formatDateTime(booking.startTime)}</p>
                      {booking.assignedEmail ? (
                        <p className={styles.listItemSubtle}>Colaboradora: {booking.assignedEmail}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.dashCard, styles.dashCardTop)}>
          <CardHeader className={styles.dashCardHeader}>
            <div className={styles.dashCardTitleGroup}>
              <CalendarDays className={styles.dashCardIcon} />
              <CardTitle className={styles.dashCardHeading}>Citas pendientes</CardTitle>
            </div>
            <p className={styles.dashCardDescription}>Citas sin asignar que requieren atención inmediata.</p>
          </CardHeader>
          <CardContent className={styles.dashCardBody}>
            <div
              className={styles.dashCardScroll}
              role="region"
              aria-label="Listado de citas pendientes"
              tabIndex={0}
            >
              {pendingStatus === 'loading' ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-16 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : pendingStatus === 'error' ? (
                <div className="flex flex-col gap-3 rounded-md border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <p>{pendingError instanceof Error ? pendingError.message : 'No fue posible cargar las citas pendientes.'}</p>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => refetchPending()}>
                      Reintentar
                    </Button>
                  </div>
                </div>
              ) : pending.length === 0 ? (
                <div className={styles.emptyState}>
                  No hay citas pendientes por asignar. Las nuevas citas aparecerán aquí automáticamente.
                </div>
              ) : (
                <div className="space-y-2">
                  {pending.map((booking) => (
                    <div key={booking.id} className={styles.listItem}>
                      <p className={styles.listItemTitle}>{booking.clientName}</p>
                      <p className={styles.listItemSubtle}>{booking.service.name}</p>
                      <p className={styles.listItemSubtle}>{formatDateTime(booking.startTime)}</p>
                      {booking.notes ? (
                        <p className={`${styles.listItemSubtle} line-clamp-1`}>Notas: {booking.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(styles.dashCard, styles.dashCardServices, styles.servicesCard)}>
          <CardHeader className={styles.dashCardHeader}>
            <div className={styles.dashCardTitleGroup}>
              <Users className={styles.dashCardIcon} />
              <CardTitle className={styles.dashCardHeading}>Servicios más solicitados</CardTitle>
            </div>
            <p className={styles.dashCardDescription}>Ranking basado en las citas agendadas recientemente.</p>
          </CardHeader>
          <CardContent className={styles.dashCardBody}>
            <div
              className={styles.dashCardScroll}
              role="region"
              aria-label="Ranking de servicios más solicitados"
              tabIndex={0}
            >
              {overviewStatus === 'loading' ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-14 rounded-md bg-gray-100 animate-pulse" />
                  ))}
                </div>
              ) : overviewStatus === 'error' ? (
                <p className="text-sm text-red-600">
                  {overviewError instanceof Error ? overviewError.message : 'No fue posible obtener los servicios destacados.'}
                </p>
              ) : topServices.length === 0 ? (
                <div className={styles.emptyState}>Aún no hay suficientes datos para mostrar esta estadística.</div>
              ) : (
                <div className="space-y-2">
                  {topServices.map((service) => (
                    <div key={service.serviceId} className={styles.servicesRow}>
                      <div className={styles.servicesInfo}>
                        <p className={styles.servicesName}>{service.name}</p>
                        <p className={styles.servicesCount}>{service.count} citas</p>
                      </div>
                      <Badge variant="secondary" className={styles.badgeMuted}>
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
    </div>
  );
}
