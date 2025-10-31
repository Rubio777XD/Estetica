import { useMemo, useState } from 'react';
import { Calendar, Clock, Mail, RefreshCw, Send, User, Loader2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

import { apiFetch, ApiError } from '../lib/api';
import { formatDateOnly, formatTime } from '../lib/format';
import { invalidateQuery, setQueryData, useApiQuery } from '../lib/data-store';
import type { Assignment, Booking, UnassignedBookingsResponse } from '../types/api';

const PENDING_BOOKINGS_KEY = 'bookings:pending';

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const getTimeUntil = (value: string) => {
  const target = new Date(value).getTime();
  const diffMs = target - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) >= 60) {
    const diffHours = Math.round(diffMinutes / 60);
    return relativeFormatter.format(diffHours, 'hour');
  }
  return relativeFormatter.format(diffMinutes, 'minute');
};

const getActiveAssignment = (assignments?: Assignment[] | null) =>
  assignments?.find((assignment) => assignment.status === 'pending' && new Date(assignment.expiresAt).getTime() > Date.now()) ??
  null;

const getLatestAssignment = (assignments?: Assignment[] | null) => assignments?.[0] ?? null;

export default function CitasPendientes() {
  const [emailValues, setEmailValues] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  const { data: bookings = [], status, error, refetch } = useApiQuery<Booking[]>(
    PENDING_BOOKINGS_KEY,
    async () => {
      const response = await apiFetch<UnassignedBookingsResponse>('/api/bookings/unassigned');
      return response.bookings;
    }
  );

  const updateEmail = (id: string, value: string) => {
    setEmailValues((prev) => ({ ...prev, [id]: value }));
  };

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [bookings]
  );

  const handleSendInvitation = async (booking: Booking, email?: string) => {
    const targetEmail = (email ?? emailValues[booking.id] ?? '').trim();
    if (!targetEmail) {
      toast.error('Ingresa un correo electrónico');
      return;
    }

    setSending((prev) => ({ ...prev, [booking.id]: true }));

    try {
      const { assignment } = await apiFetch<{ assignment: Assignment }>(`/api/assignments`, {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id, email: targetEmail }),
      });

      setQueryData<Booking[]>(PENDING_BOOKINGS_KEY, (prev = []) =>
        prev.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                assignments: [assignment, ...(item.assignments ?? [])],
              }
            : item
        )
      );

      toast.success('Invitación enviada');
      updateEmail(booking.id, targetEmail);
      invalidateQuery(['stats-overview']);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible enviar la invitación';
      toast.error(message);
    } finally {
      setSending((prev) => ({ ...prev, [booking.id]: false }));
      invalidateQuery(PENDING_BOOKINGS_KEY);
    }
  };

  const handleCancelInvitation = async (booking: Booking, assignment: Assignment) => {
    setCancelling((prev) => ({ ...prev, [booking.id]: true }));
    try {
      const { assignment: updated } = await apiFetch<{ assignment: Assignment }>(`/api/assignments/${assignment.id}`, {
        method: 'DELETE',
      });
      setQueryData<Booking[]>(PENDING_BOOKINGS_KEY, (prev = []) =>
        prev.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                assignments: [updated, ...(item.assignments ?? []).filter((a) => a.id !== updated.id)],
              }
            : item
        )
      );
      toast.success('Invitación cancelada');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible cancelar la invitación';
      toast.error(message);
    } finally {
      setCancelling((prev) => ({ ...prev, [booking.id]: false }));
      invalidateQuery(PENDING_BOOKINGS_KEY);
    }
  };

  const renderStatusBadge = (booking: Booking) => {
    const active = getActiveAssignment(booking.assignments);
    const latest = getLatestAssignment(booking.assignments);

    if (active) {
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
          Invitación enviada · vence {getTimeUntil(active.expiresAt)}
        </Badge>
      );
    }

    if (latest?.status === 'expired') {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Invitación expirada</Badge>;
    }

    if (latest?.status === 'declined') {
      return <Badge className="bg-red-100 text-red-700 border-red-200">Invitación cancelada</Badge>;
    }

    if (latest?.status === 'accepted') {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Aceptada recientemente</Badge>;
    }

    return <Badge variant="secondary">Sin invitación</Badge>;
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border border-gray-200 animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'No fue posible cargar las citas.'}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (sortedBookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <Mail className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay citas pendientes por asignar</p>
            <p className="text-sm text-gray-500">Las invitaciones enviadas aparecerán aquí para su seguimiento.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {sortedBookings.map((booking) => {
          const activeAssignment = getActiveAssignment(booking.assignments);
          const latestAssignment = getLatestAssignment(booking.assignments);
          const emailValue = emailValues[booking.id] ?? latestAssignment?.email ?? '';
          const isSending = sending[booking.id] ?? false;
          const isCancelling = cancelling[booking.id] ?? false;

          return (
            <Card key={booking.id} className="border border-gray-200 shadow-sm">
              <CardHeader className="pb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg text-gray-900">
                    <User className="h-5 w-5 text-gray-500" />
                    <span>{booking.clientName}</span>
                  </CardTitle>
                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatDateOnly(booking.startTime)} · {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{booking.service?.name ?? 'Servicio'} · {booking.service?.duration ?? 0} min</span>
                    </div>
                    {booking.notes && <p className="text-xs text-gray-500">Notas: {booking.notes}</p>}
                  </div>
                </div>
                {renderStatusBadge(booking)}
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    type="email"
                    placeholder="correo@colaboradora.com"
                    value={emailValue}
                    onChange={(event) => updateEmail(booking.id, event.target.value)}
                    className="flex-1"
                    aria-label="Correo electrónico de la colaboradora"
                    disabled={isSending || isCancelling}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSendInvitation(booking, emailValue)}
                      disabled={isSending || isCancelling}
                      className="bg-black hover:bg-gray-900"
                    >
                      {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      {activeAssignment ? 'Reenviar' : 'Enviar invitación'}
                    </Button>
                    {activeAssignment && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleCancelInvitation(booking, activeAssignment)}
                        disabled={isCancelling}
                      >
                        {isCancelling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
                {latestAssignment && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Última invitación a <strong>{latestAssignment.email}</strong>
                    </span>
                    <span>{formatDateOnly(latestAssignment.createdAt)} · {formatTime(latestAssignment.createdAt)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Citas pendientes de asignar</h2>
          <p className="text-sm text-gray-500">
            Envía invitaciones a las colaboradoras independientes para confirmar la asignación de cada cita.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={status === 'loading'}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>
      {renderContent()}
    </div>
  );
}
