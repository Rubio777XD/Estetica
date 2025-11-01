import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent } from "../ui/card";
import { CheckCircle, Clock, User, Phone, Mail, Calendar as CalendarIcon } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { usePublicServices } from "../../lib/services-store";
import { formatLocalDateTime, getLocalDateTimeInputValue, isoToLocalInputValue, localDateTimeToIso } from "../../lib/datetime";

interface BookingSectionProps {
  preSelectedService?: string;
}

type AvailabilitySlot = {
  start: string;
  end: string;
  available: boolean;
  conflicted?: boolean;
};

const slotTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Tijuana",
});

export function BookingSection({ preSelectedService }: BookingSectionProps) {
  const {
    services,
    status: serviceStatus,
    error: serviceError,
    refresh: refreshServices,
  } = usePublicServices();
  const currencyFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState(preSelectedService || '');
  const [dateTimeValue, setDateTimeValue] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsStatus, setSlotsStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });
  const [minDateTimeValue] = useState(() => getLocalDateTimeInputValue());
  const minDateValue = minDateTimeValue ? minDateTimeValue.slice(0, 10) : '';

  const progress = ((currentStep - 1) / 2) * 100;

  const formatDuration = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return 'Duración variable';
    }
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    if (hours > 0) {
      return `${hours} h${minutes > 0 ? ` ${minutes} min` : ''}`;
    }
    return `${minutes} min`;
  };

  useEffect(() => {
    if (!selectedService) {
      return;
    }
    if (!services.some((service) => service.id === selectedService)) {
      setSelectedService('');
      setCurrentStep(1);
      setDateTimeValue('');
      setSelectedDate('');
      setSelectedSlot('');
      setAvailableSlots([]);
      setSlotsStatus('idle');
      setSlotsError(null);
      setNotes('');
      setSubmitError(null);
    }
  }, [services, selectedService]);

  useEffect(() => {
    if (!preSelectedService) {
      return;
    }
    if (services.some((service) => service.id === preSelectedService)) {
      setSelectedService(preSelectedService);
      setDateTimeValue('');
      setSelectedDate('');
      setSelectedSlot('');
      setAvailableSlots([]);
      setSlotsStatus('idle');
      setSlotsError(null);
      setNotes('');
      setSubmitError(null);
      setCurrentStep(2);
    }
  }, [preSelectedService, services]);

  useEffect(() => {
    if ((currentStep === 2 || currentStep === 3) && !selectedDate) {
      const fallback = getLocalDateTimeInputValue().slice(0, 10);
      setSelectedDate(minDateValue || fallback);
    }
  }, [currentStep, selectedDate, minDateValue]);

  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      setSlotsStatus('idle');
      setSlotsError(null);
      setSelectedSlot('');
      setDateTimeValue('');
      return;
    }

    let cancelled = false;
    setSlotsStatus('loading');
    setSlotsError(null);
    setSelectedSlot('');
    setDateTimeValue('');

    void apiFetch<{ slots?: AvailabilitySlot[]; message?: string }>(
      `/api/public/bookings/availability?date=${selectedDate}`
    )
      .then((response) => {
        if (cancelled) {
          return;
        }
        setAvailableSlots(response.slots ?? []);
        setSlotsStatus('success');
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'No fue posible cargar la disponibilidad.';
        setSlotsError(message);
        setSlotsStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const handleServiceSelect = (serviceId: string) => {
    if (!services.some((service) => service.id === serviceId)) {
      return;
    }
    setSelectedService(serviceId);
    setDateTimeValue('');
    setSelectedDate('');
    setSelectedSlot('');
    setAvailableSlots([]);
    setSlotsStatus('idle');
    setSlotsError(null);
    setNotes('');
    setSubmitError(null);
    setCurrentStep(2);
  };

  const handleDateTimeSelect = () => {
    if (!dateTimeValue || !selectedSlot) {
      setSubmitError('Selecciona un horario disponible.');
      return;
    }

    if (!localDateTimeToIso(dateTimeValue)) {
      setSubmitError('Selecciona una fecha y hora válidas.');
      return;
    }

    setSubmitError(null);
    setCurrentStep(3);
  };

  const handleSlotSelect = (slotStart: string) => {
    const inputValue = isoToLocalInputValue(slotStart);
    if (!inputValue) {
      setSubmitError('No fue posible interpretar el horario seleccionado.');
      return;
    }
    setSelectedSlot(slotStart);
    setDateTimeValue(inputValue);
    setSubmitError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedService) {
      setSubmitError('Selecciona un servicio antes de continuar.');
      setCurrentStep(1);
      return;
    }

    const startIso = localDateTimeToIso(dateTimeValue);
    if (!startIso) {
      setSubmitError('Selecciona una fecha y hora válidas.');
      setCurrentStep(2);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const extraNotes: string[] = [];
    if (notes.trim().length > 0) {
      extraNotes.push(notes.trim());
    }
    if (formData.phone.trim().length > 0) {
      extraNotes.push(`Tel: ${formData.phone.trim()}`);
    }
    if (formData.email.trim().length > 0) {
      extraNotes.push(`Email: ${formData.email.trim()}`);
    }

    try {
      await apiFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          clientName: formData.name.trim(),
          clientEmail: formData.email.trim() || undefined,
          serviceId: selectedService,
          startTime: startIso,
          notes: extraNotes.join(' | '),
        }),
        credentials: 'include',
      });
      setIsCompleted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible crear la cita. Intenta nuevamente.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (submitError) {
      setSubmitError(null);
    }
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const selectedServiceData = services.find((service) => service.id === selectedService) || null;
  const formattedDateTime = dateTimeValue ? formatLocalDateTime(dateTimeValue) : '';

  const generateCalendarFile = () => {
    if (!selectedServiceData || (!dateTimeValue && !selectedSlot)) return;

    const startIso = selectedSlot || localDateTimeToIso(dateTimeValue);
    if (!startIso) return;

    const startDate = new Date(startIso);
    const durationMinutes = selectedServiceData?.duration ?? 90;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const calendarContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Salon AR//Ibeth Renteria//EN',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(startDate)}`,
      `DTEND:${formatDate(endDate)}`,
      `SUMMARY:${selectedServiceData.name} - Salón AR`,
      `DESCRIPTION:Cita agendada en Salón de Belleza AR con Ibeth Rentería`,
      'LOCATION:Salón de Belleza AR - Ibeth Rentería',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    
    const blob = new Blob([calendarContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cita-salon-ar.ics';
    link.click();
  };

  if (isCompleted) {
    return (
      <section className="py-20 min-h-screen flex items-center content-layer">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto dark-card">
            <div className="p-12 text-center">
              <div className="mb-8">
                <CheckCircle className="w-20 h-20 text-editorial-beige mx-auto mb-6" style={{ filter: 'drop-shadow(0 0 10px rgba(234, 220, 199, 0.4))' }} />
                <h2 className="font-heading landing-title-md mb-4" style={{ color: '#ffffff' }}>
                  ¡Cita Agendada Exitosamente!
                </h2>
                <div className="w-24 h-0.5 bg-editorial-beige mx-auto mb-6" style={{ boxShadow: '0 0 8px rgba(234, 220, 199, 0.4)' }}></div>
              </div>
              
              <div className="dark-card p-6 mb-8">
                <h3 className="font-body font-medium text-high-contrast mb-4">Resumen de tu cita</h3>
                <div className="space-y-3 text-left">
                  <div className="flex justify-between">
                    <span className="text-medium-contrast">Servicio:</span>
                    <span className="font-medium text-high-contrast">{selectedServiceData?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-medium-contrast">Fecha y hora:</span>
                    <span className="font-medium text-high-contrast">{formattedDateTime || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-medium-contrast">Duración:</span>
                    <span className="font-medium text-high-contrast">{formatDuration(selectedServiceData?.duration)}</span>
                  </div>
                  <div className="flex justify-between border-t border-editorial-beige/30 pt-3">
                    <span className="text-medium-contrast">Precio:</span>
                    <span className="font-medium text-editorial-beige">
                      {selectedServiceData ? currencyFormatter.format(selectedServiceData.price) : '—'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={generateCalendarFile}
                  className="btn-primary w-full"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Añadir al calendario
                </button>
                
                <div className="flex gap-4">
                  <button
                    className="btn-secondary flex-1"
                    onClick={() => {
                      setIsCompleted(false);
                      setCurrentStep(2);
                      setSubmitError(null);
                    }}
                  >
                    Reprogramar
                  </button>
                  <button
                    className="btn-secondary flex-1"
                    onClick={() => window.open('https://wa.me/573001234567', '_blank')}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
              
              <p className="text-luxury-muted mt-6">
                Te hemos enviado un email de confirmación. Si necesitas hacer cambios, 
                contáctanos por WhatsApp o teléfono.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 min-h-screen content-layer">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-heading landing-title-lg mb-4" style={{ color: '#ffffff' }}>
            Agenda tu Cita
          </h2>
          <div className="w-24 h-0.5 bg-editorial-beige mx-auto mb-6" style={{ boxShadow: '0 0 8px rgba(234, 220, 199, 0.4)' }}></div>
          <p className="font-body text-medium-contrast max-w-2xl mx-auto">
            Reserva tu momento de belleza en solo 3 pasos sencillos
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-editorial-beige' : 'text-luxury-muted'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center step-indicator ${currentStep >= 1 ? 'active' : 'inactive'}`}>
                1
              </div>
              <span className="ml-2 font-body text-sm">Servicio</span>
            </div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-editorial-beige' : 'text-luxury-muted'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center step-indicator ${currentStep >= 2 ? 'active' : 'inactive'}`}>
                2
              </div>
              <span className="ml-2 font-body text-sm">Fecha & Hora</span>
            </div>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-editorial-beige' : 'text-luxury-muted'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center step-indicator ${currentStep >= 3 ? 'active' : 'inactive'}`}>
                3
              </div>
              <span className="ml-2 font-body text-sm">Datos</span>
            </div>
          </div>
          <div className="w-full bg-luxury-muted/20 rounded-full h-2 overflow-hidden">
            <div 
              className="h-2 bg-editorial-beige luxury-transition duration-500"
              style={{ 
                width: `${progress}%`,
                boxShadow: '0 0 8px rgba(234, 220, 199, 0.4)'
              }}
            ></div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Service Selection */}
          {currentStep === 1 && (
            <div className="dark-card">
              <div className="text-center pb-6 pt-8 px-8">
                <h3 className="font-heading text-high-contrast">
                  Selecciona tu servicio
                </h3>
              </div>
              <div className="p-8 pt-0">
                {serviceStatus === 'loading' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="p-6 rounded-xl border-2 border-editorial-beige/20 animate-pulse space-y-4">
                        <div className="h-5 bg-editorial-beige/20 rounded w-2/3" />
                        <div className="h-4 bg-editorial-beige/10 rounded w-1/2" />
                        <div className="h-4 bg-editorial-beige/10 rounded w-1/3" />
                      </div>
                    ))}
                  </div>
                )}

                {serviceStatus === 'error' && (
                  <div className="text-center space-y-4">
                    <p className="font-body text-medium-contrast">
                      {serviceError ?? 'No pudimos cargar el catálogo de servicios.'}
                    </p>
                    <Button onClick={() => refreshServices()} variant="outline" className="border-editorial-beige text-editorial-beige hover:bg-editorial-beige hover:text-black">
                      Reintentar
                    </Button>
                  </div>
                )}

                {serviceStatus === 'success' && services.length === 0 && (
                  <div className="text-center space-y-3">
                    <p className="font-body text-medium-contrast">
                      Aún no hay servicios disponibles para reserva online. Escríbenos para recibir asistencia personalizada.
                    </p>
                    <Button
                      variant="outline"
                      className="border-editorial-beige text-editorial-beige hover:bg-editorial-beige hover:text-black"
                      onClick={() => window.open('https://wa.me/573001234567', '_blank')}
                    >
                      Contactar por WhatsApp
                    </Button>
                  </div>
                )}

                {serviceStatus === 'success' && services.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service.id)}
                        className={`p-6 rounded-xl border-2 text-left luxury-transition luxury-hover ${
                          selectedService === service.id
                            ? 'border-editorial-beige bg-editorial-beige/10'
                            : 'border-editorial-beige/30 hover:border-editorial-beige'
                        }`}
                        style={{
                          boxShadow:
                            selectedService === service.id
                              ? '0 0 20px rgba(234, 220, 199, 0.2)'
                              : undefined,
                        }}
                        type="button"
                      >
                        <h4 className="font-heading text-high-contrast mb-2">{service.name}</h4>
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-medium-contrast">
                            <Clock className="w-4 h-4 mr-2" />
                            {service.duration} min
                          </div>
                          <div className="flex items-center text-sm text-editorial-beige font-medium">
                            {currencyFormatter.format(service.price)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {submitError && currentStep === 1 ? (
                  <p className="text-sm text-red-400 text-center mt-6">{submitError}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {currentStep === 2 && (
            <div className="dark-card">
              <div className="text-center pb-6 pt-8 px-8">
                <h3 className="font-heading text-high-contrast">
                  Elige fecha y hora
                </h3>
                <div className="mt-2 inline-flex px-3 py-1 bg-editorial-beige/20 text-editorial-beige rounded-full text-sm">
                  {selectedServiceData?.name}
                </div>
              </div>
              <div className="p-8 pt-0">
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3">
                      <Label htmlFor="booking-date" className="text-high-contrast font-body">
                        Selecciona la fecha
                      </Label>
                      <Input
                        id="booking-date"
                        type="date"
                        value={selectedDate}
                        min={minDateValue || undefined}
                        onChange={(event) => {
                          setSelectedDate(event.target.value);
                          setSubmitError(null);
                        }}
                        className="h-12 rounded-xl"
                      />
                      <p className="text-xs text-medium-contrast">
                        Horario local: America/Tijuana. Selecciona el día que prefieras.
                      </p>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-medium-contrast">Horarios disponibles</p>
                      {slotsStatus === 'loading' ? (
                        <p className="text-sm text-medium-contrast">Cargando horarios…</p>
                      ) : slotsStatus === 'error' ? (
                        <div className="text-sm text-red-400">
                          {slotsError ?? 'No fue posible cargar la disponibilidad.'}
                        </div>
                      ) : slotsStatus === 'success' ? (
                        availableSlots.length === 0 ? (
                          <p className="text-sm text-medium-contrast">
                            No hay horarios disponibles para esta fecha. Prueba con otro día.
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {availableSlots.map((slot) => {
                              const isSelected = selectedSlot === slot.start;
                              const hasConflict = slot.conflicted === true;
                              const isDisabled = !slot.available;
                              return (
                                <button
                                  key={slot.start}
                                  type="button"
                                  onClick={() => handleSlotSelect(slot.start)}
                                  disabled={isDisabled}
                                  className={`rounded-xl border px-4 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-editorial-beige/40 ${
                                    isSelected
                                      ? 'border-editorial-beige bg-editorial-beige/10 text-editorial-beige shadow-lg'
                                      : isDisabled
                                      ? 'cursor-not-allowed border-white/10 text-white/30'
                                      : 'border-editorial-beige/40 text-high-contrast hover:border-editorial-beige'
                                  }`}
                                  title={
                                    hasConflict
                                      ? 'Hay otra cita en este horario, pero puedes continuar.'
                                      : isDisabled
                                      ? 'Este horario ya no está disponible.'
                                      : undefined
                                  }
                                >
                                  <span className="block">
                                    {slotTimeFormatter.format(new Date(slot.start))}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )
                      ) : (
                        <p className="text-sm text-medium-contrast">Elige una fecha para consultar los horarios.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    className="btn-secondary"
                    onClick={() => setCurrentStep(1)}
                    type="button"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleDateTimeSelect}
                    disabled={!selectedSlot}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    Continuar
                  </button>
                </div>
                {submitError && currentStep === 2 ? (
                  <p className="text-sm text-red-400 mt-4">{submitError}</p>
                ) : null}
              </div>
            </div>
          )}

          {/* Step 3: Contact Information */}
          {currentStep === 3 && (
            <div className="dark-card">
              <div className="text-center pb-6 pt-8 px-8">
                <h3 className="font-heading text-high-contrast">
                  Confirma tu información
                </h3>
              </div>
              <div className="p-8 pt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Form */}
                  <div>
                    <form onSubmit={handleFormSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-high-contrast flex items-center font-body">
                          <User className="w-4 h-4 mr-2" />
                          Nombre completo
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="Tu nombre completo"
                          value={formData.name}
                          onChange={handleFormChange}
                          required
                          className="h-12 rounded-xl"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-high-contrast flex items-center font-body">
                          <Phone className="w-4 h-4 mr-2" />
                          Teléfono
                        </Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+57 300 123 4567"
                          value={formData.phone}
                          onChange={handleFormChange}
                          required
                          className="h-12 rounded-xl"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-high-contrast flex items-center font-body">
                          <Mail className="w-4 h-4 mr-2" />
                          Correo electrónico
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="tu@correo.com"
                          value={formData.email}
                          onChange={handleFormChange}
                          required
                          className="h-12 rounded-xl"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes" className="text-high-contrast font-body">
                          Notas adicionales (opcional)
                        </Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          value={notes}
                          onChange={(event) => {
                            if (submitError) {
                              setSubmitError(null);
                            }
                            setNotes(event.target.value);
                          }}
                          rows={4}
                          maxLength={500}
                          placeholder="Cuéntanos si tienes alguna preferencia, alergia o detalle que debamos considerar."
                          className="rounded-xl"
                        />
                        <p className="text-xs text-medium-contrast">
                          También puedes indicar si prefieres contacto vía WhatsApp.
                        </p>
                      </div>

                      {submitError ? (
                        <p className="text-sm text-red-400">{submitError}</p>
                      ) : null}

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setCurrentStep(2)}
                        >
                          Atrás
                        </button>
                        <button
                          type="submit"
                          className="btn-primary disabled:opacity-60"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? 'Agendando…' : 'Agendar ahora'}
                        </button>
                      </div>
                    </form>
                  </div>
                  
                  {/* Summary */}
                  <div className="dark-card p-6">
                    <h4 className="font-body font-medium text-high-contrast mb-4">Resumen de tu cita</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-medium-contrast">Servicio:</span>
                        <span className="font-medium text-high-contrast">{selectedServiceData?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-medium-contrast">Fecha y hora:</span>
                        <span className="font-medium text-high-contrast">{formattedDateTime || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-medium-contrast">Duración:</span>
                        <span className="font-medium text-high-contrast">{formatDuration(selectedServiceData?.duration)}</span>
                      </div>
                      <div className="border-t border-editorial-beige/30 pt-3">
                        <div className="flex justify-between">
                          <span className="text-medium-contrast">Total:</span>
                          <span className="font-medium text-editorial-beige text-lg">
                            {selectedServiceData ? currencyFormatter.format(selectedServiceData.price) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}