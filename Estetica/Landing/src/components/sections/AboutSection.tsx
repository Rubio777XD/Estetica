import { ImageWithFallback } from "../figma/ImageWithFallback";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";
import { Award, Users, Clock, Heart } from "lucide-react";

const achievements = [
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Master Trainer desde 2021",
    description: "Formación y especialización continua en extensiones de pestañas",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "Certificación Profesional",
    description:
      "Acreditada por el Consejo Nacional de Normalización y Certificación de Competencias Laborales",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "193 Alumnas Formadas",
    description:
      "Entrenamientos diseñados para destacar en un mercado competitivo",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    title: "Excelencia y Calidad",
    description:
      "Compromiso permanente con seguridad, técnica y atención a cada cliente",
  },
];

export function AboutSection() {
  return (
    <section className="py-20 content-layer">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2
            className="font-serif text-4xl md:text-5xl mb-4"
            style={{ color: "#ffffff" }}
          >
            Sobre Nosotros
          </h2>
          <div className="w-24 h-0.5 bg-[#D4AF37] mx-auto mb-6"></div>
          <p className="font-sans text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            Formación de alto nivel y servicios especializados en extensiones de
            pestañas para elevar el estándar de la industria.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto mb-20">
          {/* Content */}
          <div className="space-y-6">
            <div>
              <Badge
                variant="secondary"
                className="mb-4 bg-[#D4AF37]/20 text-[#D4AF37]"
              >
                Fundadora de Studio AR • Master Trainer
              </Badge>
              <h3 className="font-serif text-3xl text-[#EADCC7] mb-4">
                Ibeth Rentería
              </h3>
              <div className="w-16 h-0.5 bg-[#D4AF37] mb-6"></div>
            </div>

            <p className="font-sans text-white/80 leading-relaxed text-lg">
              Soy lashista profesional y <span className="font-semibold">Master Trainer</span> desde
              el año 2021, fundadora de <span className="font-semibold">Studio AR</span>. Estoy
              especializada en la aplicación de extensiones de pestañas y en la
              capacitación de nuevas artistas dentro de la industria de la
              belleza.
            </p>

            <p className="font-sans text-white/80 leading-relaxed">
              <span className="font-semibold">Mi misión</span> es elevar el nivel profesional de
              cada alumna, brindando técnicas actualizadas, bases sólidas y un
              enfoque en la seguridad y el cuidado de cada cliente. Con
              experiencia en el área y pasión por el detalle, he desarrollado
              entrenamientos pensados para formar lashistas listas para
              destacar en un mercado competitivo.
            </p>

            <p className="font-sans text-white/80 leading-relaxed">
              A la fecha he formado <span className="font-semibold">193 alumnas</span>. Mi
              compromiso es siempre{" "}
              <span className="uppercase tracking-wide text-[#D4AF37]">
                excelencia y calidad
              </span>
              , impulsando tanto el crecimiento personal como el profesional de
              cada una de mis alumnas.
            </p>

            <p className="font-sans text-white/80 leading-relaxed">
              Certificada por el{" "}
              <span className="font-semibold">
                Consejo Nacional de Normalización y Certificación de
                Competencias Laborales
              </span>
              .
            </p>
          </div>

          {/* Image */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <ImageWithFallback
                src="/assets/ibeth1.png"
                alt="Ibeth Rentería - Fundadora de Studio AR"
                className="w-full rounded-2xl object-cover object-top lg:h-[520px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#D4AF37] rounded-full opacity-20"></div>
            <div className="absolute -bottom-6 -left-6 w-16 h-16 bg-[#D4AF37] rounded-full opacity-30"></div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {achievements.map((achievement, index) => (
            <Card
              key={index}
              className="group hover:shadow-xl transition-all duration-300 border border-white/10 bg-white/5 backdrop-blur-sm rounded-2xl"
            >
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4 text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-colors duration-300">
                  {achievement.icon}
                </div>
                <h4 className="font-serif text-lg text-white mb-3 group-hover:text-[#D4AF37] transition-colors duration-300">
                  {achievement.title}
                </h4>
                <p className="font-sans text-sm text-white/70 leading-relaxed">
                  {achievement.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mission (breve) */}
        <div className="mt-20 max-w-4xl mx-auto text-center">
          <h3 className="font-serif text-3xl text-[#EADCC7] mb-4">Nuestra Misión</h3>
          <div className="w-16 h-0.5 bg-[#D4AF37] mx-auto mb-8"></div>
          <p className="font-sans text-lg text-white/80 leading-relaxed">
            Elevar el estándar de la industria con entrenamientos y servicios
            responsables, seguros y de alto impacto, para que cada profesional
            y cada clienta vivan una experiencia basada en{" "}
            <span className="text-[#D4AF37] font-semibold">excelencia y calidad</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
