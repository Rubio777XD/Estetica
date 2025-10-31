import { useMemo, useState } from 'react';
import { CreditCard, Calendar, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

import { apiFetch, ApiError } from '../lib/api';
import { formatCurrency, formatDateOnly, formatDateTime, toDateKey } from '../lib/format';
import { invalidateQuery, setQueryData, useApiQuery } from '../lib/data-store';
import type { Booking, BookingsResponse, Payment, PaymentMethod, PaymentsResponse } from '../types/api';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

const today = new Date();
const initialFrom = toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
const initialTo = toDateKey(today);

const PAYMENT_KEY = (from?: string, to?: string) => `payments:${from ?? 'all'}:${to ?? 'all'}`;

function uniqueBookings(bookings: Booking[]) {
  const map = new Map<string, Booking>();
  for (const booking of bookings) {
    map.set(booking.id, booking);
  }
  return Array.from(map.values());
}

function sortBookings(bookings: Booking[]) {
  return [...bookings].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export default function Pagos() {
  const [dateFrom, setDateFrom] = useState<string>(initialFrom);
  const [dateTo, setDateTo] = useState<string>(initialTo);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ bookingId: string; amount: string; method: PaymentMethod }>({
    bookingId: '',
    amount: '',
    method: 'cash',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentsKey = PAYMENT_KEY(dateFrom, dateTo);

  const { data: paymentsResponse, status, error, refetch } = useApiQuery<PaymentsResponse>(
    paymentsKey,
    async () => {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const search = params.toString();
      return apiFetch<PaymentsResponse>(`/api/payments${search ? `?${search}` : ''}`);
    }
  );

  const payments = paymentsResponse?.payments ?? [];
  const totalAmount = paymentsResponse?.totalAmount ?? 0;

  const { data: selectableBookings = [] } = useApiQuery<Booking[]>(
    'bookings:for-payments',
    async () => {
      const [confirmed, done] = await Promise.all([
        apiFetch<BookingsResponse>('/api/bookings?status=confirmed&limit=100'),
        apiFetch<BookingsResponse>('/api/bookings?status=done&limit=100'),
      ]);
      return sortBookings(uniqueBookings([...confirmed.bookings, ...done.bookings]));
    }
  );

  const bookingOptions = useMemo(
    () =>
      selectableBookings.map((booking) => ({
        value: booking.id,
        label: `${booking.clientName} · ${booking.service?.name ?? ''} (${formatDateOnly(booking.startTime)})`,
      })),
    [selectableBookings]
  );

  const selectedBooking = selectableBookings.find((booking) => booking.id === form.bookingId) ?? null;

  const handleRegisterPayment = async () => {
    if (isSubmitting) return;
    if (!selectedBooking) {
      toast.error('Selecciona una cita');
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }

    setIsSubmitting(true);
    const optimisticId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimisticPayment: Payment & { booking: Booking } = {
      id: optimisticId,
      bookingId: selectedBooking.id,
      amount,
      method: form.method,
      createdAt: nowIso,
      booking: selectedBooking,
    };

    const isWithinRange = (!dateFrom || toDateKey(new Date(nowIso)) >= dateFrom) && (!dateTo || toDateKey(new Date(nowIso)) <= dateTo);

    const addedOptimistic = isWithinRange;
    if (addedOptimistic) {
      setQueryData<PaymentsResponse>(paymentsKey, (prev) => {
        const base = prev ?? { payments: [], totalAmount: 0 };
        return {
          payments: [optimisticPayment, ...base.payments],
          totalAmount: base.totalAmount + amount,
        };
      });
    }

    try {
      const { payment } = await apiFetch<{ payment: Payment & { booking: Booking } }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          amount,
          method: form.method,
        }),
      });
      setQueryData<PaymentsResponse>(paymentsKey, (prev) => {
        const base = prev ?? { payments: [], totalAmount: 0 };
        const hasOptimistic = base.payments.some((item) => item.id === optimisticId);
        if (!hasOptimistic) {
          return {
            payments: [payment, ...base.payments],
            totalAmount: base.totalAmount + payment.amount,
          };
        }
        return {
          payments: base.payments.map((item) => (item.id === optimisticId ? payment : item)),
          totalAmount: base.totalAmount - amount + payment.amount,
        };
      });
      toast.success('Pago registrado');
      setDialogOpen(false);
      setForm({ bookingId: '', amount: '', method: form.method });
    } catch (err) {
      if (addedOptimistic) {
        setQueryData<PaymentsResponse>(paymentsKey, (prev) => {
          if (!prev) return prev;
          const hasOptimistic = prev.payments.some((item) => item.id === optimisticId);
          if (!hasOptimistic) return prev;
          return {
            payments: prev.payments.filter((item) => item.id !== optimisticId),
            totalAmount: prev.totalAmount - amount,
          };
        });
      }
      toast.error(err instanceof ApiError ? err.message : 'No fue posible registrar el pago');
    } finally {
      setIsSubmitting(false);
      invalidateQuery([paymentsKey, 'stats-overview', 'stats-revenue']);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'No fue posible cargar los pagos.'}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (payments.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <CreditCard className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay pagos en este rango</p>
            <p className="text-sm text-gray-500">Registra un nuevo pago para comenzar</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {payments.map((payment) => (
          <Card key={payment.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{payment.booking?.clientName ?? 'Cliente'}</CardTitle>
                <p className="text-sm text-gray-500">{payment.booking?.service?.name ?? 'Servicio'} · {formatDateTime(payment.booking?.startTime ?? payment.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(payment.amount)}</p>
                <p className="text-xs text-gray-500 capitalize">{PAYMENT_METHOD_LABELS[payment.method]}</p>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Total del periodo</CardTitle>
            <Calendar className="h-5 w-5 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
            <p className="text-sm text-gray-500 mt-2">Pagos registrados entre las fechas seleccionadas.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payments-from">Desde</Label>
              <Input
                id="payments-from"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="payments-to">Hasta</Label>
              <Input
                id="payments-to"
                type="date"
                value={dateTo}
                min={dateFrom}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setForm({ bookingId: '', amount: '', method: 'cash' });
          }
        }}
      >
        <DialogTrigger asChild>
          <Button className="bg-black hover:bg-gray-900">
            <Plus className="h-4 w-4 mr-2" /> Registrar pago
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo pago</DialogTitle>
            <DialogDescription>Registra un pago recibido para actualizar el balance y las métricas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cita</Label>
              <Select value={form.bookingId} onValueChange={(value) => setForm((prev) => ({ ...prev, bookingId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cita" />
                </SelectTrigger>
                <SelectContent>
                  {bookingOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Monto</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="10"
                  value={form.amount}
                  onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Método</Label>
                <Select value={form.method} onValueChange={(value) => setForm((prev) => ({ ...prev, method: value as PaymentMethod }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedBooking && (
              <p className="text-sm text-gray-500">
                {selectedBooking.clientName} · {selectedBooking.service?.name ?? 'Servicio'} ({formatDateTime(selectedBooking.startTime)})
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleRegisterPayment} disabled={isSubmitting || !form.bookingId || !Number(form.amount)}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderContent()}
    </div>
  );
}
