import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { usePublicServices } from "../lib/services-store";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
});

const formatDuration = (duration?: number | null) => {
  if (typeof duration !== "number" || Number.isNaN(duration) || duration <= 0) {
    return "Duración variable";
  }
  if (duration >= 60) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return `${hours}h${minutes > 0 ? ` ${minutes} min` : ""}`.trim();
  }
  return `${duration} min`;
};

export function Services() {
  const { services, status, error, refresh } = usePublicServices();

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl text-black mb-6">
            Nuestros Servicios Destacados
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Conoce los servicios disponibles y elige la experiencia perfecta para ti.
          </p>
        </div>

        {status === "error" ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              {error ?? "No pudimos cargar el catálogo de servicios. Intenta nuevamente."}
            </p>
            <Button variant="outline" onClick={() => refresh()}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {status === "loading" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse space-y-4">
                <div className="h-48 bg-gray-200 rounded-2xl" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            ))}
          </div>
        ) : null}

        {status === "success" && services.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Aún no hay servicios publicados. Muy pronto podrás reservar una experiencia única.
            </p>
          </div>
        ) : null}

        {services.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service) => (
              <Card
                key={service.id}
                className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden"
              >
                <div className="relative h-64 overflow-hidden">
                  <ImageWithFallback
                    src={service.imageUrl ?? "/assets/logo.jfif"}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                <CardContent className="p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl text-black font-semibold">{service.name}</h3>
                    <span className="text-amber-600 font-medium">
                      {currencyFormatter.format(service.price)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600">
                    {service.description?.length ? service.description : "Pronto añadiremos más detalles de este servicio."}
                  </p>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{formatDuration(service.duration)}</span>
                    {service.highlights && service.highlights.length > 0 ? (
                      <span>{service.highlights[0]}</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
