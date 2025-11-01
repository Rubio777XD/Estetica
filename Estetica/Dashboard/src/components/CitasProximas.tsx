import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  Clock,
  DollarSign,
  Loader2,
  Pencil,
  ShieldCheck,
  User,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { apiFetch, ApiError } from '../lib/api';
import { formatCurrency, formatDateTime } from '../lib/format';
import { invalidateQuery, invalidateQueriesMatching, useApiQuery } from '../lib/data-store';
import type { Booking, BookingStatus, PaymentMethod, Service } from '../types/api';

const UPCOMING_KEY = 'bookings:upcoming';

const STATUS_LABELS: Record<Extract<BookingStatus, 'scheduled' | 'confirmed'>, string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
};

const STATUS_VARIANTS: Record<Extract<BookingStatus, 'scheduled' | 'confirmed'>, string> = {
  scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

type BookingWithRelations = Booking & { service: Service };

type PriceDialogState = {
  booking: BookingWithRelations;
  value: string;
};

type PaymentDialogState = {
  booking: BookingWithRelations;
  method: PaymentMethod;
};

function mergeBookings(values: BookingWithRelations[][]) {
  const map = new Map<string, BookingWithRelations>();
  for (const list of values) {
    for (const booking of list) {
      map.set(booking.id, booking);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
}

export default function CitasProximas() {
  const [priceDialog, setPriceDialog] = useState<PriceDialogState | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});
  const [markingDone, setMarkingDone] = useState<Record<string, boolean>>({});
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});

  const { data: bookings = [], status, error, refetch, setData } = useApiQuery<BookingWithRelations[]>(
    UPCOMING_KEY,
    async () => {
      const today = new Date();
      const pad = (num: number) => String(num).padStart(2, '0');
      const from = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      const buildParams = (status: 'scheduled' | 'confirmed') => {
        const params = new URLSearchParams({ status, from, limit: '200' });
        return params.toString();
      };

      const [scheduled, confirmed] = await Promise.all([
        apiFetch<{ bookings: BookingWithRelations[] }>(`/api/bookings?${buildParams('scheduled')}`),
        apiFetch<{ bookings: BookingWithRelations[] }>(`/api/bookings?${buildParams('confirmed')}`),
      ]);

      return mergeBookings([scheduled.bookings, confirmed.bookings]);
    }
  );

  const totalOverrideCount = useMemo(
    () => Object.values(overrides).filter((value) => Number.isFinite(value)).length,
    [overrides]
  );

  const getAmountForBooking = (booking: BookingWithRelations) => {
    const override = overrides[booking.id];
    if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
      return override;
    }
    return booking.service.price;
  };

  const updateBookingInState = (updated: BookingWithRelations | null) => {
    setData((prev = []) => {
      if (!updated) {
        return prev;
      }
      return prev.map((item) => (item.id === updated.id ? updated : item));
    });
  };

  const removeBookingFromState = (bookingId: string) => {
    setData((prev = []) => prev.filter((item) => item.id !== bookingId));
  };

  const handleConfirm = async (booking: BookingWithRelations) => {
    if (booking.status === 'confirmed') {
      toast.info('La cita ya está confirmada');
      return;
    }
    setConfirming((prev) => ({ ...prev, [booking.id]: true }));
    try {
      const { booking: updated } = await apiFetch<{ booking: BookingWithRelations }>(
        `/api/bookings/${booking.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: 'confirmed' }),
        }
      );
      updateBookingInState(updated);
      toast.success('Cita confirmada');
      invalidateQueriesMatching('bookings:');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible confirmar la cita';
      toast.error(message);
    } finally {
      setConfirming((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  const handleOpenPriceDialog = (booking: BookingWithRelations) => {
    const existing = overrides[booking.id] ?? booking.service.price;
    setPriceDialog({ booking, value: existing.toString() });
  };

  const handleSavePriceOverride = () => {
    if (!priceDialog) return;
    const amount = Number(priceDialog.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }
    setOverrides((prev) => ({ ...prev, [priceDialog.booking.id]: amount }));
    toast.success('Monto personalizado guardado');
    setPriceDialog(null);
  };

  const handleClearPriceOverride = () => {
    if (!priceDialog) return;
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[priceDialog.booking.id];
      return next;
    });
    toast.success('Monto restablecido al precio del servicio');
    setPriceDialog(null);
  };

  const handleMarkAsDone = (booking: BookingWithRelations) => {
    setPaymentDialog({ booking, method: 'cash' });
  };

  const handleConfirmPayment = async () => {
    if (!paymentDialog) return;
    const { booking, method } = paymentDialog;
    const amount = getAmountForBooking(booking);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('El monto a cobrar debe ser mayor a 0');
      return;
    }

    setMarkingDone((prev) => ({ ...prev, [booking.id]: true }));
    try {
      await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ bookingId: booking.id, amount, method }),
      });
      await apiFetch(`/api/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'done' }),
      });
      toast.success('Cita marcada como realizada');
      removeBookingFromState(booking.id);
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:done');
      invalidateQueriesMatching('payments:');
      invalidateQuery('bookings:for-payments');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible completar la operación';
      toast.error(message);
    } finally {
      setMarkingDone((prev) => ({ ...prev, [booking.id]: false }));
      setPaymentDialog(null);
    }
  };

  const handleCancelBooking = async (booking: BookingWithRelations) => {
    setCancelling((prev) => ({ ...prev, [booking.id]: true }));
    try {
      await apiFetch(`/api/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'canceled' }),
      });
      removeBookingFromState(booking.id);
      toast.success('Cita cancelada');
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:pending');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible cancelar la cita';
      toast.error(message);
    } finally {
      setCancelling((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  const renderBooking = (booking: BookingWithRelations) => {
    const statusLabel = STATUS_LABELS[booking.status as 'scheduled' | 'confirmed'];
    const statusVariant = STATUS_VARIANTS[booking.status as 'scheduled' | 'confirmed'];
    const amount = getAmountForBooking(booking);
    const isConfirming = confirming[booking.id];
    const isMarking = markingDone[booking.id];
    const isCancelling = cancelling[booking.id];
    const hasOverride = overrides[booking.id] !== undefined;

    return (
      <Card key={booking.id} className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" /> {booking.clientName}
            </CardTitle>
            <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4" /> {formatDateTime(booking.startTime)}
            </p>
          </div>
          <Badge className={statusVariant}>{statusLabel}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase">Servicio</span>
              <p className="text-sm font-medium text-gray-900">{booking.service.name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" /> {booking.service.duration} minutos
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase">Monto a cobrar</span>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> {formatCurrency(amount)}
                {hasOverride ? (
                  <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                    Monto editado
                  </Badge>
                ) : null}
              </p>
            </div>
          </div>

          {booking.notes ? (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
              <p className="font-medium text-gray-800 mb-1">Notas</p>
              <p>{booking.notes}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleConfirm(booking)}
              disabled={isConfirming || booking.status === 'confirmed'}
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ShieldCheck className="h-4 w-4 mr-2" />
              )}
              Confirmar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAsDone(booking)}
              disabled={isMarking}
            >
              {isMarking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BadgeCheck className="h-4 w-4 mr-2" />
              )}
              Marcar como realizada
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenPriceDialog(booking)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar precio
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleCancelBooking(booking)}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border border-gray-200 animate-pulse">
              <CardContent className="p-6 space-y-4">
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
        <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
          <p className="text-sm text-gray-600">
            {error instanceof Error ? error.message : 'No fue posible cargar las citas.'}
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
          <p className="text-base font-medium text-gray-800">No hay citas próximas</p>
          <p className="text-sm text-gray-500">
            Las citas confirmadas o programadas aparecerán aquí para facilitar su seguimiento.
          </p>
        </div>
      );
    }

    return <div className="grid gap-4">{bookings.map(renderBooking)}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Citas próximas</h2>
          <p className="text-sm text-gray-500">
            Gestiona las citas programadas y confirma el pago una vez finalizadas. {totalOverrideCount > 0 ? `${totalOverrideCount} citas con monto editado.` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Actualizar
        </Button>
      </div>

      {renderContent()}

      <Dialog open={priceDialog !== null} onOpenChange={(open) => !open && setPriceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar precio</DialogTitle>
            <DialogDescription>
              Ajusta el monto a cobrar para esta cita sin modificar el precio del servicio.
            </DialogDescription>
          </DialogHeader>
          {priceDialog ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="override-amount">Monto personalizado (MXN)</Label>
                <Input
                  id="override-amount"
                  type="number"
                  min={1}
                  step="0.01"
                  value={priceDialog.value}
                  onChange={(event) =>
                    setPriceDialog((prev) =>
                      prev ? { ...prev, value: event.target.value } : prev
                    )
                  }
                />
                <p className="mt-1 text-xs text-gray-500">
                  Precio del servicio: {formatCurrency(priceDialog.booking.service.price)}
                </p>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <Button variant="ghost" onClick={handleClearPriceOverride}>
                  Restablecer precio del servicio
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPriceDialog(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePriceOverride}>Guardar</Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialog !== null} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar pago</DialogTitle>
            <DialogDescription>
              Confirma el pago y marca la cita como realizada. Podrás elegir el método de pago utilizado.
            </DialogDescription>
          </DialogHeader>
          {paymentDialog ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto a registrar</Label>
                <Input
                  id="payment-amount"
                  value={formatCurrency(getAmountForBooking(paymentDialog.booking))}
                  readOnly
                  className="bg-gray-50"
                />
                {overrides[paymentDialog.booking.id] !== undefined ? (
                  <p className="text-xs text-amber-600">
                    Se usará el monto personalizado definido para esta cita.
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">
                    Se usará el precio configurado en el servicio.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={paymentDialog.method}
                  onValueChange={(value: PaymentMethod) =>
                    setPaymentDialog((prev) => (prev ? { ...prev, method: value } : prev))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    {(['cash', 'transfer'] as PaymentMethod[]).map((method) => (
                      <SelectItem key={method} value={method}>
                        {PAYMENT_METHOD_LABEL[method]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPaymentDialog(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmPayment}>
                  Registrar pago y completar cita
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
