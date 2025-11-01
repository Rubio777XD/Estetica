import { useEffect, useMemo, useState } from 'react';
import { Loader2, MailPlus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';

import { apiFetch, ApiError } from '../lib/api';
import { formatDateTime, localDateTimeToIso, toDateTimeInputValue } from '../lib/format';
import { invalidateQuery, invalidateQueriesMatching, useApiQuery } from '../lib/data-store';
import type { Assignment, AssignmentStatus, Booking, Service } from '../types/api';

const PENDING_KEY = 'bookings:pending';
const PAGE_SIZE = 10;

type BookingWithRelations = Booking & { assignments?: Assignment[] | null };

type AssignDialogState = {
  booking: BookingWithRelations;
  email: string;
  name: string;
};

type EditDialogState = {
  booking: BookingWithRelations;
  clientName: string;
  serviceId: string;
  startTime: string;
  notes: string;
};

const getLatestAssignment = (assignments?: Assignment[] | null) => assignments?.[0] ?? null;

const normalizeEmailValue = (value: string) => value.trim().toLowerCase();

const parseInvitedEmail = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.email === 'string') {
      return {
        email: normalizeEmailValue(parsed.email),
        name: typeof parsed.name === 'string' && parsed.name.trim().length > 0 ? parsed.name.trim() : null,
      };
    }
  } catch (error) {
    // fallback to raw value
  }
  return { email: normalizeEmailValue(value), name: null };
};

const getInvitedPeople = (booking: BookingWithRelations) => {
  const entries = (booking.invitedEmails ?? []).map(parseInvitedEmail);
  const byEmail = new Map<string, { email: string; name: string | null }>();
  entries.forEach((entry) => {
    if (!byEmail.has(entry.email)) {
      byEmail.set(entry.email, { email: entry.email, name: entry.name ?? null });
    } else if (entry.name && entry.name.trim().length > 0) {
      byEmail.set(entry.email, { email: entry.email, name: entry.name });
    }
  });
  return Array.from(byEmail.values());
};

const INVITE_STATUS_LABELS: Record<AssignmentStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  declined: 'Rechazada',
  expired: 'Expirada',
};

const INVITE_STATUS_STYLES: Record<AssignmentStatus, string> = {
  pending: 'text-amber-600 bg-amber-50 border border-amber-100',
  accepted: 'text-emerald-600 bg-emerald-50 border border-emerald-100',
  declined: 'text-rose-600 bg-rose-50 border border-rose-100',
  expired: 'text-gray-500 bg-gray-100 border border-gray-200',
};

const getInviteStatus = (
  booking: BookingWithRelations,
  email: string
): AssignmentStatus | null => {
  const normalized = normalizeEmailValue(email);
  const assignment = booking.assignments?.find(
    (item) => normalizeEmailValue(item.email) === normalized
  );
  if (assignment) {
    return assignment.status;
  }
  if (booking.confirmedEmail && normalizeEmailValue(booking.confirmedEmail) === normalized) {
    return 'accepted';
  }
  return null;
};

export default function CitasPendientes() {
  const [currentPage, setCurrentPage] = useState(1);
  const [assignDialog, setAssignDialog] = useState<AssignDialogState | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<BookingWithRelations | null>(null);

  const { data: bookings = [], status, error, refetch, setData } = useApiQuery<BookingWithRelations[]>(
    PENDING_KEY,
    async () => {
      const response = await apiFetch<{ bookings: BookingWithRelations[] }>('/api/bookings/unassigned');
      return response.bookings;
    }
  );

  const { data: services = [] } = useApiQuery<Service[]>(
    'services',
    async () => {
      const response = await apiFetch<{ services: Service[] }>('/api/services');
      return response.services;
    }
  );

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [bookings]
  );

  const pageCount = Math.max(1, Math.ceil(sortedBookings.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleBookings = sortedBookings.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    if (pageStart >= sortedBookings.length && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [sortedBookings.length, pageStart, currentPage]);

  const openAssignDialog = (booking: BookingWithRelations) => {
    const latest = getLatestAssignment(booking.assignments);
    setAssignDialog({ booking, email: latest?.email ?? '', name: '' });
  };

  const handleAssignBooking = async () => {
    if (!assignDialog) return;
    const { booking, email, name } = assignDialog;
    if (!email.trim()) {
      toast.error('Ingresa un correo electrónico válido');
      return;
    }
    const trimmedEmail = email.trim();
    const normalized = normalizeEmailValue(trimmedEmail);
    const invited = getInvitedPeople(booking);
    const existingEmails = new Set(invited.map((item) => item.email));
    if (invited.length >= 3 && !existingEmails.has(normalized)) {
      toast.error('Solo puedes invitar hasta 3 personas por cita');
      return;
    }
    setAssignLoading(true);
    try {
      await apiFetch('/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: booking.id,
          email: trimmedEmail,
          name: name.trim() ? name.trim() : undefined,
        }),
      });
      toast.success('Invitación enviada');
      invalidateQuery(PENDING_KEY);
      invalidateQuery('bookings:pending:summary');
      setAssignDialog(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible enviar la invitación';
      toast.error(message);
    } finally {
      setAssignLoading(false);
    }
  };

  const openEditDialog = (booking: BookingWithRelations) => {
    setEditDialog({
      booking,
      clientName: booking.clientName,
      serviceId: booking.serviceId,
      startTime: toDateTimeInputValue(booking.startTime),
      notes: booking.notes ?? '',
    });
  };

  const handleUpdateBooking = async () => {
    if (!editDialog) return;
    const { booking, clientName, serviceId, startTime, notes } = editDialog;
    const isoStart = localDateTimeToIso(startTime);
    if (!isoStart) {
      toast.error('Selecciona una fecha y hora válidas');
      return;
    }
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre de la clienta');
      return;
    }
    setEditLoading(true);
    try {
      const { booking: updated } = await apiFetch<{ booking: BookingWithRelations }>(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          clientName: clientName.trim(),
          serviceId,
          startTime: isoStart,
          notes: notes.trim() || null,
          status: booking.status,
        }),
      });
      setData((prev = []) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success('Cita actualizada');
      invalidateQuery('bookings:pending:summary');
      setEditDialog(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible actualizar la cita';
      toast.error(message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog) return;
    try {
      await apiFetch(`/api/bookings/${cancelDialog.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'canceled' }),
      });
      toast.success('Cita cancelada');
      setData((prev = []) => prev.filter((item) => item.id !== cancelDialog.id));
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:pending:summary');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible cancelar la cita';
      toast.error(message);
    } finally {
      setCancelDialog(null);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse border border-gray-200">
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
          <MailPlus className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay citas pendientes por asignar</p>
            <p className="text-sm text-gray-500">Las invitaciones enviadas aparecerán aquí para su seguimiento.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha / Hora</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleBookings.map((booking) => {
                const latest = getLatestAssignment(booking.assignments);
                const invitedPeople = getInvitedPeople(booking);
                const confirmedEmail = booking.confirmedEmail
                  ? normalizeEmailValue(booking.confirmedEmail)
                  : null;
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium text-gray-900">{booking.clientName}</TableCell>
                    <TableCell className="text-gray-700">{booking.service.name}</TableCell>
                    <TableCell className="text-gray-600">{formatDateTime(booking.startTime)}</TableCell>
                    <TableCell className="text-gray-500">
                      <div className="space-y-1">
                        <p>{booking.notes ? booking.notes : '—'}</p>
                        {latest ? (
                          <p className="text-xs text-gray-400">Última invitación: {latest.email}</p>
                        ) : null}
                        {invitedPeople.length > 0 ? (
                          <div className="pt-2">
                            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                              Personas invitadas
                            </p>
                            <ul className="space-y-1">
                              {invitedPeople.map((person) => {
                                const isConfirmed = confirmedEmail === person.email;
                                return (
                                  <li key={person.email} className="flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                      {person.name && person.name.trim().length > 0
                                        ? `${person.name} · ${person.email}`
                                        : person.email}
                                    </span>
                                    {isConfirmed ? (
                                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                        Confirmada
                                      </span>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openAssignDialog(booking)}>
                          <MailPlus className="h-4 w-4" />
                          Invitar personas
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => openEditDialog(booking)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-2" onClick={() => setCancelDialog(booking)}>
                          <Trash2 className="h-4 w-4" />
                          Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Pagination className="pt-2">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setCurrentPage((prev) => Math.max(1, prev - 1));
                }}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }).map((_, index) => {
              const page = index + 1;
              const isActive = page === currentPage;
              if (pageCount > 5) {
                if (page === 1 || page === pageCount || Math.abs(page - currentPage) <= 1) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href="#"
                        isActive={isActive}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage(page);
                        }}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink href="#" onClick={(event) => event.preventDefault()}>
                        …
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                return null;
              }
              return (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={isActive}
                    onClick={(event) => {
                      event.preventDefault();
                      setCurrentPage(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setCurrentPage((prev) => Math.min(pageCount, prev + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="dashboard-section-title text-gray-900">Citas pendientes</h2>
          <p className="dashboard-section-subtitle">
            Asigna colaboradoras, ajusta detalles o cancela citas que aún no se han confirmado.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={status === 'loading'} className="gap-2">
          <Loader2 className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {renderContent()}

      <Dialog open={assignDialog !== null} onOpenChange={(open) => !open && !assignLoading && setAssignDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar personas</DialogTitle>
            <DialogDescription>Comparte la cita con hasta tres colaboradoras para que puedan aceptarla.</DialogDescription>
          </DialogHeader>
          {assignDialog
            ? (() => {
                const invitedPeople = getInvitedPeople(assignDialog.booking);
                const reachedLimit = invitedPeople.length >= 3;
                const currentEmail = assignDialog.email.trim();
                const canAddNew = !reachedLimit ||
                  invitedPeople.some((person) => person.email === normalizeEmailValue(currentEmail));
                return (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                        <span>Invitaciones enviadas</span>
                        <span className="text-gray-500">{invitedPeople.length}/3</span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {invitedPeople.length === 0 ? (
                          <p className="text-sm text-gray-500">Aún no has invitado a ninguna persona.</p>
                        ) : (
                          invitedPeople.map((person) => {
                            const status = getInviteStatus(assignDialog.booking, person.email);
                            const badgeClass = status ? INVITE_STATUS_STYLES[status] : 'text-gray-600 bg-gray-100 border border-gray-200';
                            const badgeLabel = status ? INVITE_STATUS_LABELS[status] : 'Enviada';
                            return (
                              <div
                                key={person.email}
                                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium text-gray-900">
                                    {person.name && person.name.trim().length > 0 ? person.name : 'Sin nombre registrado'}
                                  </span>
                                  <span className="text-gray-500">{person.email}</span>
                                </div>
                                <span className={`ml-3 rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
                                  {badgeLabel}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="assign-name">Nombre de la invitada</Label>
                        <Input
                          id="assign-name"
                          value={assignDialog.name}
                          onChange={(event) =>
                            setAssignDialog((prev) => (prev ? { ...prev, name: event.target.value } : prev))
                          }
                          disabled={assignLoading}
                          placeholder="Nombre completo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assign-email">Correo electrónico</Label>
                        <Input
                          id="assign-email"
                          type="email"
                          value={assignDialog.email}
                          onChange={(event) =>
                            setAssignDialog((prev) => (prev ? { ...prev, email: event.target.value } : prev))
                          }
                          disabled={assignLoading}
                          placeholder="correo@colaboradora.com"
                        />
                      </div>
                      {reachedLimit && !canAddNew ? (
                        <p className="text-xs text-amber-600">
                          Ya alcanzaste el límite de invitaciones para esta cita. Puedes reenviar a alguna persona existente.
                        </p>
                      ) : null}
                    </div>

                    <DialogFooter className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setAssignDialog(null)} disabled={assignLoading}>
                        Atrás
                      </Button>
                      <Button
                        onClick={handleAssignBooking}
                        disabled={
                          assignLoading ||
                          currentEmail.length === 0 ||
                          (!canAddNew && currentEmail.length > 0)
                        }
                      >
                        {assignLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar invitación'}
                      </Button>
                    </DialogFooter>
                  </div>
                );
              })()
            : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog !== null} onOpenChange={(open) => !open && !editLoading && setEditDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cita</DialogTitle>
            <DialogDescription>Actualiza los detalles de la cita antes de asignarla.</DialogDescription>
          </DialogHeader>
          {editDialog ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-client">Clienta</Label>
                  <Input
                    id="edit-client"
                    value={editDialog.clientName}
                    onChange={(event) =>
                      setEditDialog((prev) => (prev ? { ...prev, clientName: event.target.value } : prev))
                    }
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-service">Servicio</Label>
                  <Select
                    value={editDialog.serviceId}
                    onValueChange={(value) =>
                      setEditDialog((prev) => (prev ? { ...prev, serviceId: value } : prev))
                    }
                    disabled={editLoading}
                  >
                    <SelectTrigger id="edit-service">
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Fecha y hora</Label>
                  <Input
                    id="edit-date"
                    type="datetime-local"
                    value={editDialog.startTime}
                    onChange={(event) =>
                      setEditDialog((prev) => (prev ? { ...prev, startTime: event.target.value } : prev))
                    }
                    disabled={editLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notas</Label>
                  <Input
                    id="edit-notes"
                    value={editDialog.notes}
                    onChange={(event) =>
                      setEditDialog((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
                    }
                    disabled={editLoading}
                    placeholder="Observaciones adicionales"
                  />
                </div>
              </div>

              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setEditDialog(null)} disabled={editLoading}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateBooking} disabled={editLoading}>
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialog !== null} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar cita</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar esta cita pendiente? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              onClick={() => setCancelDialog(null)}
              className="border border-white/10 bg-transparent text-gray-200 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white shadow-[0_12px_30px_rgba(220,38,38,0.35)] transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              onClick={handleConfirmCancel}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
