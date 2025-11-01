import { useState } from 'react';
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

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
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
  amount: string;
  commissionPercentage: string;
  method: PaymentMethod;
};

const computeCommissionAmount = (amount: number, percentage: number) =>
  Math.round(amount * (percentage / 100) * 100) / 100;

export default function CitasProximas() {
  const [priceDialog, setPriceDialog] = useState<PriceDialogState | null>(null);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState | null>(null);
  const [confirming, setConfirming] = useState<Record<string, boolean>>({});
  const [completing, setCompleting] = useState<Record<string, boolean>>({});
  const [cancelDialog, setCancelDialog] = useState<BookingWithRelations | null>(null);
  const [lastCommissionPct, setLastCommissionPct] = useState<number>(0);

  const { data: bookings = [], status, error, refetch, setData } = useApiQuery<BookingWithRelations[]>(
    UPCOMING_KEY,
    async () => {
      const response = await apiFetch<{ bookings: BookingWithRelations[] }>('/api/bookings/upcoming');
      return response.bookings.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }
  );

  const overrideCount = bookings.filter((booking) => typeof booking.amountOverride === 'number').length;

  const getAmountForBooking = (booking: BookingWithRelations) =>
    typeof booking.amountOverride === 'number' && booking.amountOverride > 0
      ? booking.amountOverride
      : booking.service.price;

  const updateBookingInState = (updated: BookingWithRelations) => {
    setData((prev = []) => prev.map((item) => (item.id === updated.id ? updated : item)));
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
      invalidateQuery('bookings:upcoming:summary');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible confirmar la cita';
      toast.error(message);
    } finally {
      setConfirming((prev) => ({ ...prev, [booking.id]: false }));
    }
  };

  const handleOpenPriceDialog = (booking: BookingWithRelations) => {
    const current = getAmountForBooking(booking);
    setPriceDialog({ booking, value: current.toString() });
  };

  const handleSavePriceOverride = async () => {
    if (!priceDialog) return;
    const amount = Number(priceDialog.value);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }
    setIsSavingPrice(true);
    try {
      const { booking: updated } = await apiFetch<{ booking: BookingWithRelations }>(
        `/api/bookings/${priceDialog.booking.id}/price`,
        {
          method: 'PATCH',
          body: JSON.stringify({ amount }),
        }
      );
      updateBookingInState(updated);
      toast.success('Monto personalizado guardado');
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:upcoming:summary');
      setPriceDialog(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible actualizar el precio';
      toast.error(message);
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleClearPriceOverride = async () => {
    if (!priceDialog) return;
    setIsSavingPrice(true);
    try {
      const { booking: updated } = await apiFetch<{ booking: BookingWithRelations }>(
        `/api/bookings/${priceDialog.booking.id}/price`,
        {
          method: 'PATCH',
          body: JSON.stringify({ amount: null }),
        }
      );
      updateBookingInState(updated);
      toast.success('Monto restablecido al precio del servicio');
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:upcoming:summary');
      setPriceDialog(null);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible restablecer el precio';
      toast.error(message);
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleOpenPaymentDialog = (booking: BookingWithRelations) => {
    const baseAmount = getAmountForBooking(booking);
    setPaymentDialog({
      booking,
      amount: baseAmount.toFixed(2),
      commissionPercentage: lastCommissionPct.toString(),
      method: 'cash',
    });
  };

  const handleConfirmPayment = async () => {
    if (!paymentDialog) return;
    const { booking, method } = paymentDialog;
    const amount = Number(paymentDialog.amount);
    const commissionPercentage = Number(paymentDialog.commissionPercentage);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido mayor a 0');
      return;
    }

    if (!Number.isFinite(commissionPercentage) || commissionPercentage < 0 || commissionPercentage > 100) {
      toast.error('Ingresa un porcentaje de comisión entre 0 y 100');
      return;
    }

    setCompleting((prev) => ({ ...prev, [booking.id]: true }));
    try {
      await apiFetch(`/api/bookings/${booking.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          amount,
          method,
          commissionPercentage,
        }),
      });
      toast.success('Cita marcada como realizada');
      removeBookingFromState(booking.id);
      setLastCommissionPct(commissionPercentage);
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:upcoming:summary');
      invalidateQuery('bookings:pending:summary');
      invalidateQueriesMatching('payments:');
      invalidateQueriesMatching('commissions:');
      invalidateQuery('bookings:done');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible completar la operación';
      toast.error(message);
    } finally {
      setCompleting((prev) => ({ ...prev, [booking.id]: false }));
      setPaymentDialog(null);
    }
  };

  const handleRequestCancel = (booking: BookingWithRelations) => {
    setCancelDialog(booking);
  };

  const handleConfirmCancel = async () => {
    if (!cancelDialog) return;
    const booking = cancelDialog;
    try {
      await apiFetch(`/api/bookings/${booking.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'canceled' }),
      });
      toast.success('Cita cancelada');
      removeBookingFromState(booking.id);
      invalidateQueriesMatching('bookings:');
      invalidateQuery('bookings:pending:summary');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible cancelar la cita';
      toast.error(message);
    } finally {
      setCancelDialog(null);
    }
  };

  const renderBooking = (booking: BookingWithRelations) => {
    const statusLabel = STATUS_LABELS[booking.status as 'scheduled' | 'confirmed'];
    const statusVariant = STATUS_VARIANTS[booking.status as 'scheduled' | 'confirmed'];
    const amount = getAmountForBooking(booking);
    const isConfirming = confirming[booking.id];
    const isCompleting = completing[booking.id];
    const hasOverride = typeof booking.amountOverride === 'number' && booking.amountOverride > 0;

    return (
      <Card key={booking.id} className="border border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" /> {booking.clientName}
            </CardTitle>
            <p className="text-sm text-gray-500 flex items-center gap-2">
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
              onClick={() => handleOpenPaymentDialog(booking)}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <BadgeCheck className="h-4 w-4 mr-2" />
              )}
              Marcar como realizada
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenPriceDialog(booking)}>
              <Pencil className="h-4 w-4 mr-2" /> Editar precio
            </Button>
            <Button variant="destructive" size="sm" onClick={() => handleRequestCancel(booking)}>
              <XCircle className="h-4 w-4 mr-2" /> Cancelar
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
            Las citas confirmadas o programadas aparecerán aquí cuando sean asignadas.
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
            Gestiona las citas asignadas y registra el cobro al completarlas. {overrideCount > 0 ? `${overrideCount} citas con monto editado.` : ''}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Actualizar
        </Button>
      </div>

      {renderContent()}

      <Dialog open={priceDialog !== null} onOpenChange={(open) => !open && !isSavingPrice && setPriceDialog(null)}>
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
                  disabled={isSavingPrice}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Precio del servicio: {formatCurrency(priceDialog.booking.service.price)}
                </p>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2">
                <Button variant="ghost" onClick={handleClearPriceOverride} disabled={isSavingPrice}>
                  Restablecer precio del servicio
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => !isSavingPrice && setPriceDialog(null)} disabled={isSavingPrice}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSavePriceOverride} disabled={isSavingPrice}>
                    {isSavingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentDialog !== null} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar cobro</DialogTitle>
            <DialogDescription>
              Confirma el pago, la comisión y marca la cita como realizada.
            </DialogDescription>
          </DialogHeader>
          {paymentDialog ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">Monto a cobrar</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min={1}
                    step="0.01"
                    value={paymentDialog.amount}
                    onChange={(event) =>
                      setPaymentDialog((prev) =>
                        prev ? { ...prev, amount: event.target.value } : prev
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission-percentage">% comisión</Label>
                  <Input
                    id="commission-percentage"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={paymentDialog.commissionPercentage}
                    onChange={(event) =>
                      setPaymentDialog((prev) =>
                        prev ? { ...prev, commissionPercentage: event.target.value } : prev
                      )
                    }
                  />
                </div>
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

              {(() => {
                const amountValue = Number(paymentDialog.amount);
                const commissionPct = Number(paymentDialog.commissionPercentage);
                if (!Number.isFinite(amountValue) || !Number.isFinite(commissionPct)) {
                  return null;
                }
                const commissionAmount = computeCommissionAmount(amountValue, commissionPct);
                return (
                  <p className="text-sm text-gray-600">
                    Esta cita se cobró {formatCurrency(amountValue)}. Comisión: {formatCurrency(commissionAmount)} ({commissionPct}%).
                  </p>
                );
              })()}

              <DialogFooter className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPaymentDialog(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmPayment}>
                  Completar cobro
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelDialog !== null} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Seguro que quieres cancelar? Esta acción no se puede deshacer.</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelDialog(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmCancel}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
