import { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

import { apiFetch } from '../lib/api';
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

const FILTER_STORAGE_KEY = 'dashboard:payments:filters';
const COMMISSIONS_KEY = (from?: string, to?: string, collaborator?: string) =>
  `commissions:${from ?? 'all'}:${to ?? 'all'}:${collaborator ?? 'all'}`;
type StoredFilters = {
  from?: string;
  to?: string;
  collaborator?: string;
};

function getStoredFilters(): StoredFilters | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredFilters;
    return {
      from: typeof parsed.from === 'string' ? parsed.from : undefined,
      to: typeof parsed.to === 'string' ? parsed.to : undefined,
      collaborator: typeof parsed.collaborator === 'string' ? parsed.collaborator : undefined,
    };
  } catch {
    return null;
  }
}

export default function Pagos() {
  const storedFilters = getStoredFilters();
  const [dateFrom, setDateFrom] = useState<string>(storedFilters?.from ?? initialFrom);
  const [dateTo, setDateTo] = useState<string>(storedFilters?.to ?? initialTo);
  const [collaboratorInput, setCollaboratorInput] = useState<string>(storedFilters?.collaborator ?? '');
  const [collaboratorFilter, setCollaboratorFilter] = useState<string>(storedFilters?.collaborator ?? '');

  const key = COMMISSIONS_KEY(dateFrom, dateTo, collaboratorFilter);
  const {
    data: commissionsResponse,
    status,
    error,
    refetch,
  } = useApiQuery<CommissionsResponse>(key, async () => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (collaboratorFilter) params.set('collaboratorEmail', collaboratorFilter);
    const query = params.toString();
    return apiFetch<CommissionsResponse>(`/api/commissions${query ? `?${query}` : ''}`);
  });

  const rows = commissionsResponse?.rows ?? [];
  const totalAmount = commissionsResponse?.totalAmount ?? 0;
  const totalCommission = commissionsResponse?.totalCommission ?? 0;
  const collaboratorOptions = useMemo(() => {
    const rawList = commissionsResponse?.collaborators ?? [];
    const fromRows = rows
      .map((row) => row.assignedEmail || row.commissionAssigneeEmail || null)
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set([...rawList, ...fromRows])).sort((a, b) => a.localeCompare(b));
  }, [commissionsResponse, rows]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const payload: StoredFilters = {
      from: dateFrom || undefined,
      to: dateTo || undefined,
      collaborator: collaboratorFilter || undefined,
    };
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload));
  }, [dateFrom, dateTo, collaboratorFilter]);

  const handleExport = () => {
    if (rows.length === 0) {
      toast.info('No hay datos para exportar.');
      return;
    }

    const escape = (value: string | number) => {
      const stringValue = typeof value === 'number' ? value.toString() : value;
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const visibleRows = rows;
    const lines = [
      ['Fecha', 'Cliente', 'Servicio', 'Total de la cita', 'Comisión', 'Método', 'Colaboradora'],
      ...visibleRows.map((row) => {
        const collaborator = row.assignedEmail ?? row.commissionAssigneeEmail ?? '';
        const methodLabel = row.paymentMethod ? PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod : '—';
        return [
          formatDateTime(row.startTime),
          row.clientName,
          row.serviceName,
          formatCurrency(row.amount),
          formatCurrency(row.commissionAmount),
          methodLabel,
          collaborator,
        ];
      }),
    ];

    const csvContent = '\ufeff' + lines.map((line) => line.map(escape).join(',')).join('\n');
    const filename = `pagos_comisiones_${dateFrom || 'inicio'}_${dateTo || 'hoy'}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const handleApplyFilters = () => {
    const normalized = collaboratorInput.trim().toLowerCase();
    setCollaboratorInput(normalized);
    if (collaboratorFilter === normalized) {
      void refetch();
    } else {
      setCollaboratorFilter(normalized);
    }
  };

  const handleClearFilters = () => {
    setDateFrom(initialFrom);
    setDateTo(initialTo);
    setCollaboratorInput('');
    setCollaboratorFilter('');
    void refetch();
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
                <TableCell className="text-gray-600">
                  {row.assignedEmail ?? row.commissionAssigneeEmail ?? '—'}
                </TableCell>
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
        <p className="text-sm text-gray-500 max-w-2xl">
          Consulta los pagos registrados y la comisión correspondiente para cada cita realizada.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="payments-from" className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Desde
            </Label>
            <Input
              id="payments-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              max={dateTo}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <Label htmlFor="payments-to" className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Hasta
            </Label>
            <Input
              id="payments-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              min={dateFrom}
            />
          </div>
          <div className="flex flex-col space-y-1 min-w-[220px]">
            <Label htmlFor="collaborator-filter" className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Filtrar por correo de colaboradora
            </Label>
            <Input
              id="collaborator-filter"
              type="email"
              value={collaboratorInput}
              onChange={(event) => setCollaboratorInput(event.target.value)}
              placeholder="colaboradora@correo.com"
              list="payments-collaborators"
            />
            <datalist id="payments-collaborators">
              {collaboratorOptions.map((email) => (
                <option key={email} value={email} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap items-center gap-y-2 -ml-2">
            <Button variant="outline" onClick={handleApplyFilters} className="gap-2 ml-2">
              <Loader2 className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
              Aplicar filtros
            </Button>
            <Button variant="outline" onClick={handleClearFilters} className="ml-2">
              Limpiar
            </Button>
            <Button onClick={handleExport} className="gap-2 ml-2" disabled={rows.length === 0}>
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
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
