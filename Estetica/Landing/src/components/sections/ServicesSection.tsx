import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const services = [
  {
    id: 'manicure',
    name: 'Manicure',
    description: 'Tratamiento completo de manos con técnicas especializadas, productos de lujo y acabados impecables.',
    features: ['Limado y forma perfecta', 'Cutícula especializada', 'Esmaltado de larga duración'],
    priceFrom: '$200',
    duration: '45-60 min',
    image: "/assets/unas3.jfif"
  },
  {
    id: 'pedicure',
    name: 'Pedicure',
    description: 'Experiencia relajante completa para tus pies con tratamientos hidratantes y técnicas de relajación.',
    features: ['Exfoliación profunda', 'Masaje terapéutico', 'Hidratación intensiva'],
    priceFrom: '$200',
    duration: '60-75 min',
    image: "https://images.unsplash.com/photo-1675034743433-bdc9aee1cafc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwZWRpY3VyZSUyMHNwYSUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NTcwNDUyMzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 'pestanas',
    name: 'Pestañas',
    description: 'Mirada impactante con extensiones de pestañas de alta calidad, técnicas 3D y resultados naturales.',
    features: ['Técnica volumen ruso', 'Pestañas premium', 'Duración 3-4 semanas'],
    priceFrom: '$200',
    duration: '90-120 min',
    image: "https://images.unsplash.com/photo-1645735123314-d11fcfdd0000?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWVsYXNoJTIwZXh0ZW5zaW9uJTIwYmVhdXR5JTIwbHV4dXJ5fGVufDF8fHx8MTc1NzA0NTIzOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  }
];

interface ServicesSectionProps {
  onNavigateToBooking: (serviceId?: string) => void;
}

export function ServicesSection({ onNavigateToBooking }: ServicesSectionProps) {
  return (
    <section className="py-20 content-layer">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-block">
            <h2 className="font-heading text-4xl md:text-5xl mb-4 luxury-text-shadow" style={{ color: '#ffffff' }}>
              Nuestros Servicios
            </h2>
            <div className="w-24 h-0.5 bg-primary mx-auto mb-6"></div>
          </div>
          <p className="font-body text-lg text-luxury-secondary max-w-2xl mx-auto leading-relaxed">
            Tratamientos de belleza de clase mundial, diseñados para realzar tu elegancia natural 
            con la más alta calidad y atención personalizada.
          </p>
        </div>
        
        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {services.map((service, index) => (
            <Card 
              key={service.id} 
              className="group luxury-card luxury-hover overflow-hidden rounded-2xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Service Image */}
              <div className="relative h-72 overflow-hidden">
                <ImageWithFallback 
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Price Badge */}
                <div className="absolute top-4 right-4 bg-[#D4AF37]/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="font-sans text-sm text-black font-medium">
                    Desde {service.priceFrom}
                  </span>
                </div>
              </div>
              
              <CardContent className="p-8">
                {/* Service Title & Duration */}
                <div className="mb-4">
                  <h3 className="font-serif text-2xl text-white mb-2">
                    {service.name}
                  </h3>
                  <p className="font-sans text-sm text-[#D4AF37] font-medium">
                    Duración: {service.duration}
                  </p>
                </div>
                
                {/* Description */}
                <p className="font-sans text-white/80 mb-6 leading-relaxed">
                  {service.description}
                </p>
                
                {/* Features */}
                <div className="mb-6">
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center font-sans text-sm text-white/70">
                        <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Book Button */}
                <Button
                  onClick={() => onNavigateToBooking(service.id)}
                  className="w-full bg-transparent border border-white text-white hover:bg-white hover:text-black font-sans py-3 rounded-md transition-all duration-300"
                >
                  Agendar este servicio
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="max-w-2xl mx-auto">
            <p className="font-sans text-white/80 mb-6">
              ¿No estás segura de qué servicio elegir? Nuestro equipo te ayudará a encontrar 
              el tratamiento perfecto para ti.
            </p>
            <Button
              onClick={() => onNavigateToBooking()}
              variant="outline"
              className="border-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black font-sans px-8 py-3 rounded-md transition-all duration-300"
            >
              Consulta personalizada
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}