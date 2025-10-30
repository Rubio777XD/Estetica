import { Card, CardContent } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const testimonials = [
  {
    id: 1,
    name: "María González",
    service: "Manicure",
    text: "El servicio es excepcional, siempre salgo feliz con mis uñas. El ambiente es muy relajante y profesional.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b182?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGZhY2V8ZW58MXx8fHwxNzU3MDE3NzY5fDA&ixlib=rb-4.1.0&q=80&w=400"
  },
  {
    id: 2,
    name: "Ana Rodríguez", 
    service: "Pestañas",
    text: "Las extensiones de pestañas quedan perfectas y duran mucho tiempo. Ibeth es una verdadera artista.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHNtaWxpbmd8ZW58MXx8fHwxNzU3MDE3NzY5fDA&ixlib=rb-4.1.0&q=80&w=400"
  },
  {
    id: 3,
    name: "Carmen Silva",
    service: "Pedicure",
    text: "Me encanta venir aquí para relajarme. El pedicure es increíble y el trato es muy cálido y personalizado.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGJsb25kZXxlbnwxfHx8fDE3NTcwMTc3Njl8MA&ixlib=rb-4.1.0&q=80&w=400"
  }
];

export function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl text-black mb-6">
            Lo que dicen nuestras clientas
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            La satisfacción de nuestras clientas es nuestra mayor recompensa. 
            Lee lo que opinan sobre nuestros servicios.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <ImageWithFallback 
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <h4 className="text-black font-medium">
                      {testimonial.name}
                    </h4>
                    <p className="text-amber-600 text-sm">
                      {testimonial.service}
                    </p>
                  </div>
                </div>
                
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, index) => (
                    <span key={index} className="text-amber-400 text-lg">★</span>
                  ))}
                </div>
                
                <p className="text-gray-600 leading-relaxed">
                  "{testimonial.text}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}