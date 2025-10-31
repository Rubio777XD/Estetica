import { useMemo, useState } from 'react';
import { Calendar, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateOnly, toDateKey, addDays } from '../lib/format';
import { useApiQuery } from '../lib/data-store';
import type { StatsOverviewResponse, StatsRevenueResponse } from '../types/api';

const STATUS_LABELS = {
  scheduled: 'Programadas',
  confirmed: 'Confirmadas',
  done: 'Realizadas',
  canceled: 'Canceladas',
};

export default function Dashboard() {
  const { data: overview, status: overviewStatus, error: overviewError, refetch: refetchOverview } = useApiQuery<StatsOverviewResponse>(
    'stats-overview',
    async () => apiFetch<StatsOverviewResponse>('/api/stats/overview')
  );

  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = toDateKey(addDays(now, -14));
    const to = toDateKey(now);
    return { from, to };
  });

  const revenueKey = `stats-revenue:${range.from}:${range.to}`;
  const { data: revenue, status: revenueStatus, error: revenueError, refetch: refetchRevenue } = useApiQuery<StatsRevenueResponse>(
    revenueKey,
    async () => {
      const params = new URLSearchParams();
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);
      const query = params.toString();
      return apiFetch<StatsRevenueResponse>(`/api/stats/revenue${query ? `?${query}` : ''}`);
    }
  );

  const chartData = useMemo(
    () =>
      (revenue?.series ?? []).map((point) => ({
        date: formatDateOnly(point.date),
        amount: point.amount,
      })),
    [revenue]
  );

  const topServices = overview?.topServices ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-500" /> Citas de hoy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overviewStatus === 'loading' && <p className="text-sm text-gray-500">Cargando…</p>}
            {overviewStatus === 'error' && (
              <div className="text-sm text-red-600 space-y-2">
                <p>{overviewError instanceof Error ? overviewError.message : 'No se pudieron obtener las métricas.'}</p>
                <Button size="sm" variant="outline" onClick={() => refetchOverview()}>
                  Reintentar
                </Button>
              </div>
            )}
            {overviewStatus === 'success' && overview && (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(overview.todayBookings).map(([status, value]) => (
                  <div key={status} className="flex flex-col rounded-lg border border-gray-200 p-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</span>
                    <span className="text-lg font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-500" /> Ingresos del mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overviewStatus === 'loading' ? (
              <p className="text-sm text-gray-500">Cargando…</p>
            ) : overviewStatus === 'error' ? (
              <p className="text-sm text-red-600">No disponible</p>
            ) : (
              <p className="text-3xl font-semibold text-gray-900">{formatCurrency(overview?.monthlyRevenue ?? 0)}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Actualizado automáticamente con cada pago registrado.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-gray-500" /> Stock bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overviewStatus === 'loading' ? (
              <p className="text-sm text-gray-500">Cargando…</p>
            ) : overviewStatus === 'error' ? (
              <p className="text-sm text-red-600">No disponible</p>
            ) : (
              <p className="text-3xl font-semibold text-gray-900">{overview?.lowStockProducts ?? 0}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Productos que requieren reposición inmediata.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gray-500" /> Ingresos por día
            </CardTitle>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={range.from}
                onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
                max={range.to}
              />
              <Input
                type="date"
                value={range.to}
                onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
                min={range.from}
              />
              <Button variant="outline" size="sm" onClick={() => refetchRevenue()}>
                Actualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            {revenueStatus === 'loading' && <p className="text-sm text-gray-500">Cargando gráfica…</p>}
            {revenueStatus === 'error' && (
              <div className="text-sm text-red-600 space-y-2">
                <p>{revenueError instanceof Error ? revenueError.message : 'No fue posible generar la gráfica.'}</p>
                <Button size="sm" variant="outline" onClick={() => refetchRevenue()}>
                  Reintentar
                </Button>
              </div>
            )}
            {revenueStatus === 'success' && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" fontSize={12} angle={-25} textAnchor="end" height={60} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value).replace('$', '$')} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} labelFormatter={(label) => label} />
                  <Line type="monotone" dataKey="amount" stroke="#111827" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : revenueStatus === 'success' ? (
              <p className="text-sm text-gray-500">No hay ingresos registrados en este rango.</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Servicios más solicitados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overviewStatus === 'loading' && <p className="text-sm text-gray-500">Cargando…</p>}
            {overviewStatus === 'error' && <p className="text-sm text-red-600">No disponible</p>}
            {overviewStatus === 'success' && topServices.length === 0 && (
              <p className="text-sm text-gray-500">Sin datos suficientes todavía.</p>
            )}
            {overviewStatus === 'success' && topServices.length > 0 && (
              <div className="space-y-2">
                {topServices.map((service) => (
                  <div key={service.serviceId} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.count} citas</p>
                    </div>
                    <Badge variant="outline" className="bg-gray-50 text-gray-700">
                      #{service.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
