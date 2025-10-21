import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { CheckCircle, Clock, User, Phone, Mail, Calendar as CalendarIcon } from "lucide-react";

const services = [
  { id: 'manicure', name: 'Manicure', price: 200, duration: '45-60 min' },
  { id: 'pedicure', name: 'Pedicure', price: 450, duration: '60-75 min' },
  { id: 'pestanas', name: 'Extensiones', price: 650, duration: '90-120 min' },
];

const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
];

interface BookingSectionProps {
  preSelectedService?: string;
}

export function BookingSection({ preSelectedService }: BookingSectionProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedService, setSelectedService] = useState(preSelectedService || '');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const progress = ((currentStep - 1) / 2) * 100;

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setCurrentStep(2);
  };

  const handleDateTimeSelect = () => {
    if (selectedDate && selectedTime) {
      setCurrentStep(3);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCompleted(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const selectedServiceData = services.find(s => s.id === selectedService);

  const generateCalendarFile = () => {
    if (!selectedServiceData || !selectedDate || !selectedTime) return;
    
    const startDate = new Date(selectedDate);
    const [time, period] = selectedTime.split(' ');
    const [hours, minutes] = time.split(':');
    let hour = parseInt(hours);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    startDate.setHours(hour, parseInt(minutes || '0'));
    
    const endDate = new Date(startDate.getTime() + 90 * 60000); // 90 minutes
    
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
                <h2 className="font-heading mb-4" style={{ color: '#ffffff' }}>
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
                    <span className="text-medium-contrast">Fecha:</span>
                    <span className="font-medium text-high-contrast">
                      {selectedDate?.toLocaleDateString('es-ES', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-medium-contrast">Hora:</span>
                    <span className="font-medium text-high-contrast">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-medium-contrast">Duración:</span>
                    <span className="font-medium text-high-contrast">{selectedServiceData?.duration}</span>
                  </div>
                  <div className="flex justify-between border-t border-editorial-beige/30 pt-3">
                    <span className="text-medium-contrast">Precio:</span>
                    <span className="font-medium text-editorial-beige">${selectedServiceData?.price.toLocaleString()}</span>
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
          <h2 className="font-heading mb-4" style={{ color: '#ffffff' }}>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleServiceSelect(service.id)}
                      className={`p-6 rounded-xl border-2 cursor-pointer luxury-transition luxury-hover ${
                        selectedService === service.id 
                          ? 'border-editorial-beige bg-editorial-beige/10' 
                          : 'border-editorial-beige/30 hover:border-editorial-beige'
                      }`}
                      style={{
                        boxShadow: selectedService === service.id 
                          ? '0 0 20px rgba(234, 220, 199, 0.2)'
                          : undefined
                      }}
                    >
                      <h4 className="font-heading text-high-contrast mb-2">{service.name}</h4>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-medium-contrast">
                          <Clock className="w-4 h-4 mr-2" />
                          {service.duration}
                        </div>
                        <div className="flex items-center text-sm text-editorial-beige font-medium">
                          Desde ${service.price.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar */}
                  <div>
                    <Label className="text-high-contrast mb-4 block font-body">Selecciona la fecha</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date.getDay() === 0} // Disable past dates and Sundays
                      className="rounded-xl border border-editorial-beige/30"
                    />
                  </div>
                  
                  {/* Time Slots */}
                  <div>
                    <Label className="text-high-contrast mb-4 block font-body">Horarios disponibles</Label>
                    <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          disabled={!selectedDate}
                          className={`p-3 rounded-lg border text-sm luxury-transition ${
                            selectedTime === time 
                              ? 'bg-editorial-beige text-white border-editorial-beige' 
                              : 'border-editorial-beige/30 hover:border-editorial-beige hover:bg-editorial-beige/10 disabled:opacity-50 disabled:cursor-not-allowed text-medium-contrast'
                          }`}
                          style={{
                            boxShadow: selectedTime === time 
                              ? '0 0 12px rgba(234, 220, 199, 0.3)'
                              : undefined
                          }}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-8">
                  <button
                    className="btn-secondary"
                    onClick={() => setCurrentStep(1)}
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleDateTimeSelect}
                    disabled={!selectedDate || !selectedTime}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuar
                  </button>
                </div>
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
                          className="btn-primary"
                        >
                          Agendar ahora
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
                        <span className="text-medium-contrast">Fecha:</span>
                        <span className="font-medium text-high-contrast">
                          {selectedDate?.toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-medium-contrast">Hora:</span>
                        <span className="font-medium text-high-contrast">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-medium-contrast">Duración:</span>
                        <span className="font-medium text-high-contrast">{selectedServiceData?.duration}</span>
                      </div>
                      <div className="border-t border-editorial-beige/30 pt-3">
                        <div className="flex justify-between">
                          <span className="text-medium-contrast">Total:</span>
                          <span className="font-medium text-editorial-beige text-lg">
                            ${selectedServiceData?.price.toLocaleString()}
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