import { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Check,
  X,
  PenSquare,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { apiFetch, ApiError } from '../lib/api';
import {
  addDays,
  addMinutes,
  formatCurrency,
  formatDateOnly,
  formatDateTime,
  formatTime,
  localDateTimeToIso,
  toDateKey,
  toDateTimeInputValue,
} from '../lib/format';
import { invalidateQuery, setQueryData, useApiQuery } from '../lib/data-store';
import type { Booking, BookingStatus, BookingsResponse, Service, ServicesResponse } from '../types/api';

const SERVICES_KEY = 'services';
const TIME_FILTERS = ['today', 'week', 'all'] as const;
const STATUS_FILTERS = ['all', 'scheduled', 'confirmed', 'done', 'canceled'] as const;
const ALL_BOOKING_KEYS = TIME_FILTERS.flatMap((time) => STATUS_FILTERS.map((status) => `bookings:${time}:${status}`));

const STATUS_LABELS: Record<BookingStatus, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  done: 'Realizada',
  canceled: 'Cancelada',
};

const STATUS_VARIANTS: Record<BookingStatus, string> = {
  scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  done: 'bg-green-100 text-green-800 border-green-200',
  canceled: 'bg-red-100 text-red-700 border-red-200',
};

type TimeFilter = (typeof TIME_FILTERS)[number];
type StatusFilter = (typeof STATUS_FILTERS)[number];

type BookingFormState = {
  clientName: string;
  serviceId: string;
  startTime: string;
  notes: string;
};

const EMPTY_FORM: BookingFormState = {
  clientName: '',
  serviceId: '',
  startTime: '',
  notes: '',
};

function matchesFilters(booking: Booking, timeFilter: TimeFilter, statusFilter: StatusFilter) {
  const bookingKey = toDateKey(new Date(booking.startTime));
  const todayKey = toDateKey(new Date());
  const weekEndKey = toDateKey(addDays(new Date(), 7));

  if (timeFilter === 'today' && bookingKey !== todayKey) {
    return false;
  }
  if (timeFilter === 'week' && (bookingKey < todayKey || bookingKey > weekEndKey)) {
    return false;
  }
  if (statusFilter !== 'all' && booking.status !== statusFilter) {
    return false;
  }
  return true;
}

function sortByStartTime(items: Booking[]) {
  return [...items].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export default function Citas() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState<BookingFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<BookingFormState>(EMPTY_FORM);
  const [bookingEditing, setBookingEditing] = useState<Booking | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bookingsKey = `bookings:${timeFilter}:${statusFilter}`;

  const { data: services = [] } = useApiQuery<Service[]>(
    SERVICES_KEY,
    async () => {
      const response = await apiFetch<ServicesResponse>('/api/services');
      return response.services;
    }
  );

  const { data: bookings = [], status, error, refetch } = useApiQuery<Booking[]>(
    bookingsKey,
    async () => {
      const params = new URLSearchParams();
      const now = new Date();
      if (timeFilter === 'today') {
        const dateKey = toDateKey(now);
        params.set('from', dateKey);
        params.set('to', dateKey);
      } else if (timeFilter === 'week') {
        params.set('from', toDateKey(now));
        params.set('to', toDateKey(addDays(now, 7)));
      }
      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      const search = params.toString();
      const response = await apiFetch<BookingsResponse>(`/api/bookings${search ? `?${search}` : ''}`);
      return sortByStartTime(response.bookings);
    }
  );

  const servicesOptions = useMemo(() => services.map((service) => ({ value: service.id, label: service.name })), [services]);

  const selectedCreateService = services.find((service) => service.id === createForm.serviceId) || null;
  const selectedEditService = services.find((service) => service.id === editForm.serviceId) || null;

  const createEndPreview = useMemo(() => {
    const startIso = localDateTimeToIso(createForm.startTime);
    if (!selectedCreateService || !startIso) return null;
    const end = addMinutes(new Date(startIso), selectedCreateService.duration);
    return formatTime(end.toISOString());
  }, [createForm.startTime, selectedCreateService]);

  const editEndPreview = useMemo(() => {
    if (!selectedEditService || !editForm.startTime) return null;
    const startIso = localDateTimeToIso(editForm.startTime);
    if (!startIso) return null;
    const end = addMinutes(new Date(startIso), selectedEditService.duration);
    return formatTime(end.toISOString());
  }, [editForm.startTime, selectedEditService]);

  const resetCreateForm = () => setCreateForm(EMPTY_FORM);
  const resetEditForm = () => {
    setEditForm(EMPTY_FORM);
    setBookingEditing(null);
  };

  const upsertBookingInCache = (updated: Booking, removeIfMismatch = false) => {
    setQueryData<Booking[]>(bookingsKey, (prev = []) => {
      const exists = prev.some((item) => item.id === updated.id);
      const shouldInclude = matchesFilters(updated, timeFilter, statusFilter);
      if (!shouldInclude && removeIfMismatch) {
        return prev.filter((item) => item.id !== updated.id);
      }
      if (!exists) {
        return shouldInclude ? sortByStartTime([...prev, updated]) : prev;
      }
      return sortByStartTime(prev.map((item) => (item.id === updated.id ? updated : item)).filter((item) => (removeIfMismatch ? matchesFilters(item, timeFilter, statusFilter) : true)));
    });
  };

  const handleCreateBooking = async () => {
    if (isSubmitting) return;
    if (!selectedCreateService) {
      toast.error('Selecciona un servicio');
      return;
    }
    const startIso = localDateTimeToIso(createForm.startTime);
    if (!startIso) {
      toast.error('Selecciona una fecha y hora válidas');
      return;
    }

    setIsSubmitting(true);
    const startDate = new Date(startIso);
    const endDate = addMinutes(startDate, selectedCreateService.duration);
    const optimisticId = `temp-${Date.now()}`;
    const optimisticBooking: Booking = {
      id: optimisticId,
      clientName: createForm.clientName.trim(),
      serviceId: selectedCreateService.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      status: 'scheduled',
      notes: createForm.notes.trim() ? createForm.notes.trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      service: selectedCreateService,
      payments: [],
    };

    if (matchesFilters(optimisticBooking, timeFilter, statusFilter)) {
      setQueryData<Booking[]>(bookingsKey, (prev = []) => sortByStartTime([optimisticBooking, ...prev]));
    }

    try {
      const { booking } = await apiFetch<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          clientName: optimisticBooking.clientName,
          serviceId: optimisticBooking.serviceId,
          startTime: startDate.toISOString(),
          notes: optimisticBooking.notes,
        }),
      });
      upsertBookingInCache({ ...booking, service: selectedCreateService }, true);
      toast.success('Cita creada');
      setCreateDialogOpen(false);
      resetCreateForm();
    } catch (err) {
      setQueryData<Booking[]>(bookingsKey, (prev = []) => prev.filter((item) => item.id !== optimisticId));
      toast.error(err instanceof ApiError ? err.message : 'No fue posible crear la cita');
    } finally {
      setIsSubmitting(false);
      invalidateQuery([...ALL_BOOKING_KEYS, 'stats-overview', 'stats-revenue']);
    }
  };

  const openEditDialog = (booking: Booking) => {
    setBookingEditing(booking);
    setEditForm({
      clientName: booking.clientName,
      serviceId: booking.serviceId,
      startTime: toDateTimeInputValue(booking.startTime),
      notes: booking.notes ?? '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdateBooking = async () => {
    if (!bookingEditing || isSubmitting) return;
    const service = services.find((item) => item.id === editForm.serviceId);
    if (!service) {
      toast.error('Selecciona un servicio válido');
      return;
    }
    const startIso = localDateTimeToIso(editForm.startTime);
    if (!startIso) {
      toast.error('Selecciona una fecha y hora válidas');
      return;
    }

    setIsSubmitting(true);
    const startDate = new Date(startIso);
    const endDate = addMinutes(startDate, service.duration);
    const updated: Booking = {
      ...bookingEditing,
      clientName: editForm.clientName.trim(),
      serviceId: service.id,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      notes: editForm.notes.trim() ? editForm.notes.trim() : null,
      service,
    };
    upsertBookingInCache(updated, true);

    try {
      const { booking } = await apiFetch<{ booking: Booking }>(`/api/bookings/${bookingEditing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          clientName: updated.clientName,
          serviceId: updated.serviceId,
          startTime: updated.startTime,
          notes: updated.notes,
          status: updated.status,
        }),
      });
      upsertBookingInCache({ ...booking, service }, true);
      toast.success('Cita actualizada');
      setEditDialogOpen(false);
      resetEditForm();
    } catch (err) {
      upsertBookingInCache(bookingEditing, true);
      toast.error(err instanceof ApiError ? err.message : 'No fue posible actualizar la cita');
    } finally {
      setIsSubmitting(false);
      invalidateQuery([...ALL_BOOKING_KEYS, 'stats-overview', 'stats-revenue']);
    }
  };

  const handleChangeStatus = async (booking: Booking, status: BookingStatus) => {
    const previous = booking;
    const updated: Booking = { ...booking, status, updatedAt: new Date().toISOString() };
    upsertBookingInCache(updated, true);
    try {
      await apiFetch(`/api/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(`Cita ${STATUS_LABELS[status].toLowerCase()}`);
    } catch (err) {
      upsertBookingInCache(previous, true);
      toast.error(err instanceof ApiError ? err.message : 'No fue posible actualizar el estado');
    } finally {
      invalidateQuery([...ALL_BOOKING_KEYS, 'stats-overview', 'stats-revenue']);
    }
  };

  const handleDeleteBooking = async (booking: Booking) => {
    const previousList = bookings;
    setQueryData<Booking[]>(bookingsKey, (prev = []) => prev.filter((item) => item.id !== booking.id));
    try {
      await apiFetch(`/api/bookings/${booking.id}`, { method: 'DELETE' });
      toast.success('Cita eliminada');
    } catch (err) {
      setQueryData<Booking[]>(bookingsKey, () => previousList);
      toast.error(err instanceof ApiError ? err.message : 'No fue posible eliminar la cita');
    } finally {
      invalidateQuery([...ALL_BOOKING_KEYS, 'stats-overview', 'stats-revenue']);
    }
  };

  const isCreateValid =
    createForm.clientName.trim().length > 0 &&
    Boolean(createForm.serviceId) &&
    Boolean(localDateTimeToIso(createForm.startTime));

  const isEditValid =
    editForm.clientName.trim().length > 0 &&
    Boolean(editForm.serviceId) &&
    Boolean(localDateTimeToIso(editForm.startTime));

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
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

    if (bookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <Calendar className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay citas para este filtro</p>
            <p className="text-sm text-gray-500">Crea una nueva cita para comenzar</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {bookings.map((booking) => (
          <Card key={booking.id} className="border border-gray-200">
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-gray-500" />
                  <span>{booking.clientName}</span>
                </CardTitle>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDateOnly(booking.startTime)} · {formatTime(booking.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{booking.service?.name ?? 'Servicio'} · {booking.service?.duration ?? 0} min</span>
                  </div>
                  {booking.notes && (
                    <p className="text-xs text-gray-500">Notas: {booking.notes}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className={STATUS_VARIANTS[booking.status]}>
                  {STATUS_LABELS[booking.status]}
                </Badge>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(booking)} aria-label="Editar cita">
                    <PenSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteBooking(booking)}
                    aria-label="Eliminar cita"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="font-medium">Duración total:</span>
                <span>{Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000)} min</span>
                <span className="font-medium">Termina:</span>
                <span>{formatTime(booking.endTime)}</span>
                {booking.payments?.length ? (
                  <span className="font-medium text-green-600">
                    Pagado {formatCurrency(booking.payments.reduce((acc, payment) => acc + payment.amount, 0))}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {booking.status !== 'confirmed' && booking.status !== 'done' && (
                  <Button size="sm" variant="outline" onClick={() => handleChangeStatus(booking, 'confirmed')}>
                    <Check className="h-4 w-4 mr-2" /> Confirmar
                  </Button>
                )}
                {booking.status !== 'done' && booking.status !== 'canceled' && (
                  <Button size="sm" variant="outline" onClick={() => handleChangeStatus(booking, 'done')}>
                    <Check className="h-4 w-4 mr-2" /> Marcar realizada
                  </Button>
                )}
                {booking.status !== 'canceled' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleChangeStatus(booking, 'canceled')}
                  >
                    <X className="h-4 w-4 mr-2" /> Cancelar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {TIME_FILTERS.map((filter) => (
            <Button
              key={filter}
              variant={timeFilter === filter ? 'default' : 'outline'}
              onClick={() => setTimeFilter(filter)}
              className={timeFilter === filter ? 'bg-black text-white' : ''}
            >
              {filter === 'today' ? 'Hoy' : filter === 'week' ? 'Próxima semana' : 'Todas'}
            </Button>
          ))}
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {filter === 'all' ? 'Todos los estados' : STATUS_LABELS[filter as BookingStatus]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={createDialogOpen}
          onOpenChange={(open) => {
            setCreateDialogOpen(open);
            if (!open) {
              resetCreateForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-900">
              <Plus className="h-4 w-4 mr-2" /> Nueva cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar cita</DialogTitle>
              <DialogDescription>Configura la cita para agendarla con la hora de Tijuana.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="booking-client">Cliente</Label>
                <Input
                  id="booking-client"
                  value={createForm.clientName}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, clientName: event.target.value }))}
                  placeholder="Nombre de la clienta"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Servicio</Label>
                  <Select
                    value={createForm.serviceId}
                    onValueChange={(value) => setCreateForm((prev) => ({ ...prev, serviceId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicesOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking-start">Fecha y hora</Label>
                  <Input
                    id="booking-start"
                    type="datetime-local"
                    value={createForm.startTime}
                    onChange={(event) => setCreateForm((prev) => ({ ...prev, startTime: event.target.value }))}
                  />
                  {createEndPreview && (
                    <p className="text-xs text-gray-500">Termina a las {createEndPreview} hrs (zona Tijuana)</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-notes">Notas (opcional)</Label>
                <Textarea
                  id="booking-notes"
                  value={createForm.notes}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Preferencias, recordatorios, etc."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateBooking} disabled={!isCreateValid || isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetEditForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar cita</DialogTitle>
            <DialogDescription>Actualiza los datos de la cita seleccionada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-booking-client">Cliente</Label>
              <Input
                id="edit-booking-client"
                value={editForm.clientName}
                onChange={(event) => setEditForm((prev) => ({ ...prev, clientName: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Servicio</Label>
                <Select value={editForm.serviceId} onValueChange={(value) => setEditForm((prev) => ({ ...prev, serviceId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicesOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-booking-start">Fecha y hora</Label>
                <Input
                  id="edit-booking-start"
                  type="datetime-local"
                  value={editForm.startTime}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, startTime: event.target.value }))}
                />
                {editEndPreview && <p className="text-xs text-gray-500">Termina a las {editEndPreview} hrs</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-booking-notes">Notas</Label>
              <Textarea
                id="edit-booking-notes"
                value={editForm.notes}
                onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateBooking} disabled={!isEditValid || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderContent()}
    </div>
  );
}
