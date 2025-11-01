import { useState } from 'react';
import { Download, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { API_BASE_URL, apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime, toDateKey } from '../lib/format';
import { useApiQuery } from '../lib/data-store';
import type { CommissionsResponse, PaymentMethod } from '../types/api';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
};

const today = new Date();
const initialFrom = toDateKey(new Date(today.getFullYear(), today.getMonth(), 1));
const initialTo = toDateKey(today);

const COMMISSIONS_KEY = (from?: string, to?: string) => `commissions:${from ?? 'all'}:${to ?? 'all'}`;

export default function Pagos() {
  const [dateFrom, setDateFrom] = useState<string>(initialFrom);
  const [dateTo, setDateTo] = useState<string>(initialTo);

  const key = COMMISSIONS_KEY(dateFrom, dateTo);
  const {
    data: commissionsResponse,
    status,
    error,
    refetch,
  } = useApiQuery<CommissionsResponse>(key, async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const query = params.toString();
    return apiFetch<CommissionsResponse>(`/api/commissions${query ? `?${query}` : ''}`);
  });

  const rows = commissionsResponse?.rows ?? [];
  const totalAmount = commissionsResponse?.totalAmount ?? 0;
  const totalCommission = commissionsResponse?.totalCommission ?? 0;

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const query = params.toString();
    try {
      const response = await fetch(`${API_BASE_URL}/api/commissions/export${query ? `?${query}` : ''}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const filename = `pagos_comisiones_${dateFrom || 'inicio'}_${dateTo || 'hoy'}.csv`;
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No fue posible exportar los datos';
      toast.error(message);
    }
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border border-gray-200 animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
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
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'No fue posible cargar la información.'}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <Filter className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay pagos registrados en este rango</p>
            <p className="text-sm text-gray-500">Ajusta los filtros para consultar otro periodo.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Total de la cita</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Colaboradora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.bookingId}>
                <TableCell className="text-gray-600">{formatDateTime(row.startTime)}</TableCell>
                <TableCell className="font-medium text-gray-900">{row.clientName}</TableCell>
                <TableCell className="text-gray-700">{row.serviceName}</TableCell>
                <TableCell className="text-gray-900">{formatCurrency(row.amount)}</TableCell>
                <TableCell className="text-gray-900">{formatCurrency(row.commissionAmount)}</TableCell>
                <TableCell className="text-gray-600">
                  {row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] : '—'}
                </TableCell>
                <TableCell className="text-gray-600">{row.assignedEmail ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Pagos y comisiones</h2>
          <p className="text-sm text-gray-500">
            Consulta los pagos registrados y la comisión correspondiente para cada cita realizada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            max={dateTo}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            min={dateFrom}
          />
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <Loader2 className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            Aplicar filtros
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl border border-gray-100 shadow-lg">
          <CardHeader>
            <CardTitle>Total del periodo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">{formatCurrency(totalAmount)}</p>
            <p className="text-sm text-gray-500 mt-2">Pagos registrados entre las fechas seleccionadas.</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-100 shadow-lg">
          <CardHeader>
            <CardTitle>Total comisiones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-gray-900">{formatCurrency(totalCommission)}</p>
            <p className="text-sm text-gray-500 mt-2">Monto acumulado de comisiones del periodo.</p>
          </CardContent>
        </Card>
      </div>

      {renderContent()}
    </div>
  );
}
