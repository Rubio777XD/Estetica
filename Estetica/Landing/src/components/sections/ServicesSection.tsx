import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { usePublicServices } from "../../lib/services-store";

interface ServicesSectionProps {
  onNavigateToBooking: (serviceId?: string) => void;
}

export function ServicesSection({ onNavigateToBooking }: ServicesSectionProps) {
  const { services, status, error, refresh } = usePublicServices();
  const currencyFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="luxury-card overflow-hidden rounded-2xl animate-pulse">
              <div className="relative h-72 bg-white/5" />
              <CardContent className="p-8 space-y-4">
                <div className="h-6 bg-white/10 rounded" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="space-y-2 pt-4">
                  <div className="h-3 bg-white/5 rounded" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
                <div className="h-10 bg-white/10 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="max-w-3xl mx-auto text-center py-16 space-y-6">
          <p className="font-body text-lg text-white/80">
            {error ?? "No fue posible cargar los servicios en este momento."}
          </p>
          <Button onClick={() => refresh()} variant="outline" className="border-white text-white hover:bg-white hover:text-black">
            Reintentar
          </Button>
        </div>
      );
    }

    if (!services.length) {
      return (
        <div className="max-w-3xl mx-auto text-center py-16 space-y-4">
          <h3 className="font-heading text-2xl text-white">Próximamente</h3>
          <p className="font-body text-white/70">
            Nuestro equipo está preparando un nuevo catálogo de servicios. Vuelve más tarde para descubrirlo.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {services.map((service, index) => {
          const highlights = service.highlights && service.highlights.length > 0 ? service.highlights : [];
          const heroImage = service.imageUrl && service.imageUrl.length > 0 ? service.imageUrl : "/assets/unas3.jfif";
          return (
            <Card
              key={service.id}
              className="group luxury-card luxury-hover overflow-hidden rounded-2xl"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="relative h-72 overflow-hidden">
                <ImageWithFallback
                  src={heroImage}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  loading="lazy"
                  decoding="async"
                  sizes="(min-width: 1024px) 320px, 90vw"
                  width={640}
                  height={640}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="absolute top-4 right-4 bg-[#D4AF37]/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="font-sans text-sm text-black font-medium">
                    {currencyFormatter.format(service.price)} · {service.duration} min
                  </span>
                </div>
              </div>

              <CardContent className="p-8 space-y-4">
                <div>
                  <h3 className="font-serif text-2xl text-white mb-2">{service.name}</h3>
                  {service.description ? (
                    <p className="font-sans text-white/80 leading-relaxed">{service.description}</p>
                  ) : (
                    <p className="font-sans text-white/60 leading-relaxed">
                      Experimenta una sesión personalizada con los mejores productos del estudio.
                    </p>
                  )}
                </div>

                {highlights.length > 0 && (
                  <ul className="space-y-2">
                    {highlights.map((feature, idx) => (
                      <li key={idx} className="flex items-center font-sans text-sm text-white/70">
                        <div className="w-1.5 h-1.5 bg-[#D4AF37] rounded-full mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}

                <Button
                  onClick={() => onNavigateToBooking(service.id)}
                  className="w-full bg-transparent border border-white text-white hover:bg-white hover:text-black font-sans py-3 rounded-md transition-all duration-300"
                >
                  Agendar este servicio
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

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
        {renderContent()}

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