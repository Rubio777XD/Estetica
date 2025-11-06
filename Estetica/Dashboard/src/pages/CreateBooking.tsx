import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

import { apiFetch } from '../lib/api';
import { invalidateQueriesMatching, useApiQuery } from '../lib/data-store';
import { formatCurrency, formatDateTime } from '../lib/format';
import { generateSalonSlots, getSalonDateKey, type SalonSlot } from '../lib/time-slots';
import type { Service } from '../types/api';

interface BookingSummary {
  clientName: string;
  serviceName: string;
  servicePrice: number;
  startTime: string;
}

export default function CreateBooking() {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(() => getSalonDateKey());
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BookingSummary | null>(null);

  const { data: services = [], status: servicesStatus, error: servicesError } = useApiQuery<Service[]>(
    'services',
    async () => {
      const response = await apiFetch<{ services: Service[] }>('/api/services');
      return response.services;
    }
  );

  useEffect(() => {
    if (!serviceId && services.length > 0) {
      setServiceId(services[0].id);
    }
  }, [serviceId, services]);

  const slots = useMemo<SalonSlot[]>(() => {
    if (!date) {
      return [];
    }
    return generateSalonSlots(date);
  }, [date]);

  useEffect(() => {
    if (slots.length === 0) {
      setStartTime('');
      return;
    }
    setStartTime((current) => (slots.some((slot) => slot.start === current) ? current : slots[0].start));
  }, [slots]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedName = clientName.trim();
    if (!trimmedName) {
      setSubmitError('Ingresa el nombre completo del cliente.');
      return;
    }

    if (!serviceId) {
      setSubmitError('Selecciona un servicio.');
      return;
    }

    if (!date) {
      setSubmitError('Selecciona una fecha.');
      return;
    }

    if (!startTime) {
      setSubmitError('Selecciona un horario.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const trimmedEmail = clientEmail.trim();
    const trimmedNotes = notes.trim();
    const trimmedPhone = clientPhone.trim();
    const extraNotes: string[] = [];

    if (trimmedNotes) {
      extraNotes.push(trimmedNotes);
    }
    if (trimmedPhone) {
      extraNotes.push(`Tel: ${trimmedPhone}`);
    }

    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          clientName: trimmedName,
          clientEmail: trimmedEmail ? trimmedEmail : undefined,
          serviceId,
          startTime,
          notes: extraNotes.length > 0 ? extraNotes.join(' | ') : undefined,
        }),
      });

      invalidateQueriesMatching('bookings:');
      toast.success('Cita creada correctamente');
      setSummary({
        clientName: trimmedName,
        serviceName: selectedService?.name ?? 'Servicio registrado',
        servicePrice: selectedService?.price ?? 0,
        startTime,
      });
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setNotes('');
      setServiceId(services[0]?.id ?? '');
      setDate(getSalonDateKey());
      setStartTime('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible crear la cita. Intenta nuevamente.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <p className="text-sm text-gray-600 max-w-3xl">
        Registra una cita manualmente desde el salón. Todas las citas permiten horarios simultáneos y usan la zona horaria local.
      </p>
      <form className="grid gap-8" onSubmit={handleSubmit}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nombre completo*</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder="Nombre y apellidos"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-email">Correo electrónico</Label>
              <Input
                id="client-email"
                type="email"
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
                placeholder="cliente@correo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Teléfono</Label>
              <Input
                id="client-phone"
                type="tel"
                value={clientPhone}
                onChange={(event) => setClientPhone(event.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-notes">Notas internas</Label>
              <Textarea
                id="booking-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Detalles adicionales para el equipo (opcional)"
                rows={5}
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Servicio*</Label>
              <Select value={serviceId} onValueChange={setServiceId} disabled={servicesStatus === 'loading'}>
                <SelectTrigger id="service">
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
              {servicesStatus === 'error' ? (
                <p className="text-sm text-red-500">
                  {servicesError instanceof Error
                    ? servicesError.message
                    : 'No fue posible cargar los servicios. Intenta más tarde.'}
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="booking-date">Fecha*</Label>
                <Input
                  id="booking-date"
                  type="date"
                  min={getSalonDateKey()}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hora*</Label>
                <Select value={startTime} onValueChange={setStartTime} disabled={slots.length === 0}>
                  <SelectTrigger id="booking-time">
                    <SelectValue placeholder={slots.length === 0 ? 'Sin horarios disponibles' : 'Selecciona un horario'} />
                  </SelectTrigger>
                  <SelectContent>
                    {slots.map((slot) => (
                      <SelectItem key={slot.start} value={slot.start}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Horarios en zona local. Los horarios pasados del día actual se ocultan automáticamente.
                </p>
              </div>
            </div>

            {selectedService ? (
              <div className="rounded-xl border border-gray-200 bg-white/60 p-4 text-sm text-gray-600">
                <p className="font-medium text-gray-900">Resumen del servicio</p>
                <p>{selectedService.name}</p>
                <p className="text-gray-500">Precio base: {formatCurrency(selectedService.price)}</p>
              </div>
            ) : null}
          </div>
        </div>

        {submitError ? <p className="text-sm text-red-500">{submitError}</p> : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || services.length === 0 || slots.length === 0}>
            {isSubmitting ? 'Creando cita…' : 'Crear cita'}
          </Button>
        </div>
      </form>

      {summary ? (
        <Card className="border border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-900">Cita creada con éxito</CardTitle>
            <CardDescription>
              Cita creada para {summary.clientName} el {formatDateTime(summary.startTime)} para {summary.serviceName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-green-900">
            <p>Precio estimado: {formatCurrency(summary.servicePrice)}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
