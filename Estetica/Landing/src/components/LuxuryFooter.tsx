import { Instagram, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "./ui/button";

export function LuxuryFooter() {
  const YEAR = new Date().getFullYear();

  // Datos reales
  const BRAND = "Studio AR";
  const OWNER = "Ibeth Rentería";
  const PHONE_DISPLAY = "+52 1 665 110 5558";
  const PHONE_TEL = "tel:+5216651105558";
  const WHATSAPP = "https://wa.me/526651105558";
  const EMAIL = "ibeth.zare30@gmail.com";
  const MAILTO = `mailto:${EMAIL}`;
  const ADDRESS =
    "Av. Miguel Hidalgo 281, Local 2, Zona Centro, 21400 Tecate, B.C.";
  const MAPS =
    "https://www.google.com/maps/search/?api=1&query=Av.+Miguel+Hidalgo+281,+Local+2,+Zona+Centro,+21400+Tecate,+B.C.";
  const IG_HANDLE = "@studio__arrr";
  const IG_URL = "https://www.instagram.com/studio__arrr/";

  return (
    <footer className="bg-black text-white py-16 relative overflow-hidden">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23D4AF37' fill-opacity='0.6'%3E%3Cpath d='M20 20c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10zm10 0c0-5.5-4.5-10-10-10s-10 4.5-10 10 4.5 10 10 10 10-4.5 10-10z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-serif text-2xl text-amber-400 mb-2">
                {BRAND}
              </h3>
              <p className="font-serif text-lg text-amber-200 italic mb-4">
                {OWNER}
              </p>
              <div className="w-24 h-0.5 bg-amber-400 mb-6" />
            </div>

            <p className="font-sans text-gray-300 leading-relaxed max-w-md">
              Lashista profesional y <span className="font-semibold">Master Trainer</span> desde 2021.
              Formación y servicios especializados en extensiones de pestañas, con
              compromiso en <span className="text-amber-400">excelencia y calidad</span>.
            </p>

            <div className="flex space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full border border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black transition-all duration-300"
                onClick={() => window.open(IG_URL, "_blank")}
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-full border border-amber-400 text-amber-400 hover:bg-amber-400 hover:text-black transition-all duration-300"
                onClick={() => window.open(WHATSAPP, "_blank")}
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347M12.051 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26C2.167 6.443 6.602 2.009 12.054 2.009c2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                </svg>
              </Button>
            </div>
          </div>

          {/* Services Column */}
          <div>
            <h4 className="font-serif text-lg text-white mb-6">
              Nuestros Servicios
            </h4>
            <ul className="space-y-3 font-sans text-gray-300">
              <li className="hover:text-amber-400 transition-colors cursor-pointer">
                Extensiones de Pestañas
              </li>
              <li className="hover:text-amber-400 transition-colors cursor-pointer">
                Capacitaciones Profesionales
              </li>
              <li className="hover:text-amber-400 transition-colors cursor-pointer">
                Diseño y Cuidado de Pestañas
              </li>
              <li className="hover:text-amber-400 transition-colors cursor-pointer">
                Asesorías Personalizadas
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="font-serif text-lg text-white mb-6">
              Contacto Directo
            </h4>
            <div className="space-y-4 font-sans text-gray-300">
              {/* Teléfono */}
              <div className="flex items-start space-x-3">
                <Phone className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                <div>
                  <a
                    href={PHONE_TEL}
                    className="hover:text-amber-400 transition-colors"
                  >
                    {PHONE_DISPLAY}
                  </a>
                  <p className="text-xs text-gray-400">
                    <a
                      href={WHATSAPP}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-amber-400 transition-colors"
                    >
                      WhatsApp disponible
                    </a>
                  </p>
                </div>
              </div>

              {/* Correo */}
              <div className="flex items-start space-x-3">
                <Mail className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                <div>
                  <a href={MAILTO} className="hover:text-amber-400 transition-colors">
                    {EMAIL}
                  </a>
                  <p className="text-xs text-gray-400">Respuesta en 24h</p>
                </div>
              </div>

              {/* Dirección */}
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                <div>
                  <a
                    href={MAPS}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-amber-400 transition-colors"
                  >
                    {ADDRESS}
                  </a>
                  <p className="text-xs text-gray-400">Tecate, Baja California</p>
                </div>
              </div>

              {/* Instagram */}
              <div className="flex items-start space-x-3">
                <Instagram className="w-4 h-4 text-amber-400 mt-1 flex-shrink-0" />
                <div>
                  <a
                    href={IG_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-amber-400 transition-colors"
                  >
                    {IG_HANDLE}
                  </a>
                  <p className="text-xs text-gray-400">Instagram oficial</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mb-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 font-sans text-gray-400 text-sm">
            <p>
              © {YEAR} {BRAND} — {OWNER}. Todos los derechos reservados.
            </p>
            <div className="flex space-x-4">
              <button className="hover:text-amber-400 transition-colors">
                Política de Privacidad
              </button>
              <button className="hover:text-amber-400 transition-colors">
                Términos de Servicio
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-sans text-gray-400 text-xs">
            <span>Certificada por el CONOCER</span>
            <div className="w-1 h-1 bg-amber-400 rounded-full" />
            <span>Hecho con ♥</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
