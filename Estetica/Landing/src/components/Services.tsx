import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Card, CardContent } from "./ui/card";

const services = [
  {
    id: 1,
    name: "Manicure",
    description: "Cuidado completo de tus manos con técnicas profesionales y productos de alta calidad.",
    priceFrom: "$25.000",
    image: "https://images.unsplash.com/photo-1720086196723-a1e0656a90a5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYWlsJTIwbWFuaWN1cmUlMjBzYWxvbiUyMGVsZWdhbnR8ZW58MXx8fHwxNzU3MDQ0MDkwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 2,
    name: "Pedicure",
    description: "Relájate mientras cuidamos tus pies con tratamientos especializados y relajantes.",
    priceFrom: "$30.000",
    image: "https://images.unsplash.com/photo-1655656724704-59c4021ee726?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZWRpY3VyZSUyMGZlZXQlMjBzcGElMjBsdXh1cnl8ZW58MXx8fHwxNzU3MDQ0MDkyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  },
  {
    id: 3,
    name: "Pestañas",
    description: "Extensiones y tratamientos de pestañas para una mirada impactante y natural.",
    priceFrom: "$45.000",
    image: "https://images.unsplash.com/photo-1718720410628-6aa1b860ea78?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWVsYXNoJTIwZXh0ZW5zaW9uJTIwYmVhdXR5JTIwc2Fsb258ZW58MXx8fHwxNzU3MDQ0MDkzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
  }
];

export function Services() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl text-black mb-6">
            Nuestros Servicios Destacados
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Ofrecemos tratamientos de belleza especializados con la más alta calidad 
            y atención personalizada para cada cliente.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card key={service.id} className="group hover:shadow-2xl transition-all duration-300 border-0 bg-white overflow-hidden">
              <div className="relative h-64 overflow-hidden">
                <ImageWithFallback 
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              <CardContent className="p-6">
                <h3 className="text-xl mb-3 text-black">
                  {service.name}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {service.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-amber-600 font-medium">
                    Desde {service.priceFrom}
                  </span>
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                    <span className="text-black text-xs">→</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}