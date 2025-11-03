import { useState } from "react";
import { MapPin, Phone, Mail, Instagram, Clock, MessageCircle, Send, User } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";

const contactInfo = [
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Dirección",
    content: ["Av. Miguel Hidalgo 281, Local 2", "Zona Centro, 21400 Tecate, B.C.", "Studio de Belleza AR: Ibeth Rentería"],
    action: { label: "Ver en mapa", link: "https://maps.google.com/maps?q=Studio+de+Belleza+AR%3A+Ibeth+Rentería%2C+Pliego%2C+21400+Tecate%2C+B.C.+Local+2%2C+Av.+Miguel+Hidalgo+281%2C+Zona+Centro%2C+21400+Tecate%2C+B.C." }
  },
  {
    icon: <Phone className="w-5 h-5" />,
    title: "Teléfono",
    content: ["+52 1 665 110 5558", "+52 1 665 110 5558"],
    action: { label: "Llamar ahora", link: "tel:+52 1 665 110 5558" }
  },
  {
    icon: <Mail className="w-5 h-5" />,
    title: "Correo",
    content: ["ibeth.zare30@gmail.com", "ibeth.zare30@gmail.com"],
    action: { label: "Enviar email", link: "mailto:ibeth.zare30@gmail.com" }
  },
  {
    icon: <Instagram className="w-5 h-5" />,
    title: "Redes Sociales",
    content: ["@studio__arrr", "Instagram oficial"],
    action: { label: "Seguir", link: "https://www.instagram.com/studio__arrr/" }
  }
];

const schedule = [
  { day: "Lunes - Viernes", hours: "9:00 AM - 8:00 PM", available: true },
  { day: "Sábado", hours: "9:00 AM - 9:00 PM", available: true },
  { day: "Domingo", hours: "9:00 AM - 9:00 PM", available: true }
];

export function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <section className="py-20 min-h-screen content-layer">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-heading text-4xl md:text-5xl mb-4" style={{ color: '#ffffff' }}>
            Contacto & Ubicación
          </h2>
          <div className="w-24 h-0.5 bg-luxury-gold mx-auto mb-6 luxury-glow"></div>
          <p className="font-body text-luxury-secondary max-w-2xl mx-auto leading-relaxed">
            Estamos aquí para ti. Encuéntranos, contáctanos y agenda tu cita de la manera que prefieras.
          </p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 max-w-7xl mx-auto">
          {/* Contact Information */}
          <div className="xl:col-span-2 space-y-8">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-4 mb-8">
              <button
                className="btn-primary"
                onClick={() => window.open('https://wa.me/5216651105558', '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.open('tel:+5216651105558')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.open('https://www.instagram.com/studio__arrr/', '_blank')}
              >
                <Instagram className="w-4 h-4 mr-2" />
                Instagram
              </button>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contactInfo.map((info, index) => (
                <div key={index} className="luxury-card luxury-hover">
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-luxury-gold/20 rounded-full flex items-center justify-center text-luxury-gold group-hover:bg-luxury-gold group-hover:text-black luxury-transition">
                        {info.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-luxury-primary mb-2">
                          {info.title}
                        </h3>
                        <div className="space-y-1 mb-4">
                          {info.content.map((line, idx) => (
                            <p key={idx} className="font-body text-luxury-secondary text-sm">
                              {line}
                            </p>
                          ))}
                        </div>
                        <button
                          className="btn-ghost text-luxury-gold hover:text-luxury-primary"
                          onClick={() => window.open(info.action.link, info.action.link.startsWith('http') ? '_blank' : '_self')}
                        >
                          {info.action.label} →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Form */}
            <div className="luxury-card luxury-glow">
              <div className="p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-luxury-gold/20 rounded-full flex items-center justify-center mr-4">
                    <Send className="w-5 h-5 text-luxury-gold" />
                  </div>
                  <h3 className="font-heading text-luxury-primary">
                    Envíanos un mensaje
                  </h3>
                </div>
                
                {isSubmitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-luxury-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send className="w-8 h-8 text-luxury-gold" />
                    </div>
                    <h4 className="font-heading text-luxury-primary mb-2">
                      ¡Mensaje enviado exitosamente!
                    </h4>
                    <p className="text-luxury-secondary">
                      Te contactaremos pronto. Gracias por escribirnos.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="contact-name" className="text-luxury-primary flex items-center font-body">
                          <User className="w-4 h-4 mr-2" />
                          Nombre completo
                        </Label>
                        <Input
                          id="contact-name"
                          name="name"
                          type="text"
                          placeholder="Tu nombre completo"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="h-12 luxury-border bg-transparent text-luxury-primary placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-luxury-gold rounded-xl"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-luxury-primary flex items-center font-body">
                          <Mail className="w-4 h-4 mr-2" />
                          Correo electrónico
                        </Label>
                        <Input
                          id="contact-email"
                          name="email"
                          type="email"
                          placeholder="tu@correo.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="h-12 luxury-border bg-transparent text-luxury-primary placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-luxury-gold rounded-xl"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="contact-message" className="text-luxury-primary font-body">
                        Mensaje
                      </Label>
                      <Textarea
                        id="contact-message"
                        name="message"
                        placeholder="Cuéntanos en qué podemos ayudarte..."
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="luxury-border bg-transparent text-luxury-primary placeholder:text-luxury-muted focus:border-luxury-gold focus:ring-luxury-gold rounded-xl resize-none"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar mensaje
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Google Maps Embed */}
            <div className="luxury-card overflow-hidden">
              <div className="google-maps-container h-80">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3341.8234567890123!2d-116.62345678901234!3d32.57654321098765!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzLCsDM0JzM1LjYiTiAxMTbCsDM3JzI0LjQiVw!5e0!3m2!1sen!2smx!4v1234567890123!5m2!1sen!2smx&q=Av.+Miguel+Hidalgo+281,+Zona+Centro,+Tecate,+Baja+California,+Mexico"
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Studio de Belleza AR: Ibeth Rentería - Ubicación"
                ></iframe>
              </div>
              <div className="p-4 bg-luxury-card border-t border-luxury-gold/20">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-heading text-white text-sm mb-1">
                      Studio de Belleza AR: Ibeth Rentería
                    </h4>
                    <p className="font-body text-xs text-luxury-secondary">
                      Av. Miguel Hidalgo 281, Local 2, Zona Centro, Tecate, B.C.
                    </p>
                  </div>
                  <button
                    className="btn-secondary text-xs px-4 py-2 min-h-8"
                    onClick={() => window.open('https://maps.google.com/maps?q=Studio+de+Belleza+AR%3A+Ibeth+Rentería%2C+Av.+Miguel+Hidalgo+281%2C+Zona+Centro%2C+21400+Tecate%2C+B.C.', '_blank')}
                  >
                    Abrir en Maps
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule & Additional Info */}
          <div className="space-y-8">
            {/* Schedule Card */}
            <div className="luxury-card">
              <div className="p-6">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-luxury-gold/20 rounded-full flex items-center justify-center mr-4">
                    <Clock className="w-5 h-5 text-luxury-gold" />
                  </div>
                  <h3 className="font-heading text-luxury-primary">
                    Horarios de Atención
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {schedule.map((item, index) => (
                    <div key={index} className={`flex justify-between items-center py-2 ${index < schedule.length - 1 ? 'border-b border-luxury-gold/20' : ''}`}>
                      <span className="font-body text-luxury-secondary">
                        {item.day}
                      </span>
                      <div className="flex items-center">
                        <span className={`font-body text-sm mr-2 ${item.available ? 'text-luxury-secondary' : 'text-red-400'}`}>
                          {item.hours}
                        </span>
                        <Badge 
                          variant={item.available ? "secondary" : "destructive"} 
                          className={`text-xs ${item.available ? 'bg-luxury-gold/20 text-luxury-gold border-luxury-gold/30' : 'bg-red-400/20 text-red-400 border-red-400/30'}`}
                        >
                          {item.available ? "Abierto" : "Cerrado"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t border-luxury-gold/20">
                  <p className="font-body text-xs text-luxury-muted text-center">
                    * Los horarios pueden variar en días festivos
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="luxury-card" style={{ background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%)' }}>
              <div className="p-6 text-center">
                <h4 className="font-heading text-luxury-primary mb-3">
                  ¿Necesitas agendar urgente?
                </h4>
                <p className="font-body text-sm text-luxury-secondary mb-4">
                  Para citas de última hora o consultas especiales
                </p>
                <button
                  className="btn-primary w-full"
                  onClick={() => window.open('https://wa.me/5216651105558?text=Hola, necesito agendar una cita urgente', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contactar por WhatsApp
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="luxury-card">
              <div className="p-6">
                <h4 className="font-heading text-luxury-primary mb-4">
                  Tips para tu visita
                </h4>
                <ul className="space-y-2 font-body text-sm text-luxury-secondary">
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full mr-3 mt-2 flex-shrink-0 luxury-glow"></span>
                    Llega 10 minutos antes de tu cita
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full mr-3 mt-2 flex-shrink-0 luxury-glow"></span>
                    Trae sandalias abiertas para pedicure
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full mr-3 mt-2 flex-shrink-0 luxury-glow"></span>
                    Sin maquillaje en los ojos para pestañas
                  </li>
                  <li className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-luxury-gold rounded-full mr-3 mt-2 flex-shrink-0 luxury-glow"></span>
                    Confirma 24h antes por WhatsApp
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}