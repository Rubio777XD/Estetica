import { MapPin, Phone, Mail, Instagram } from "lucide-react";

export function Contact() {
  const address =
    "Av. Miguel Hidalgo 281, Local 2, Zona Centro, 21400 Tecate, B.C.";
  const mapsUrl =
    "https://www.google.com/maps/search/?api=1&query=Av.+Miguel+Hidalgo+281,+Local+2,+Zona+Centro,+21400+Tecate,+B.C.";
  const phone = "+52 1 665 110 5558";
  const telHref = "tel:+5216651105558";
  const whatsappHref = "https://wa.me/526651105558";
  const email = "ibeth.zare30@gmail.com";
  const mailHref = `mailto:${email}`;
  const igHandle = "@studio__arrr";
  const igUrl = "https://www.instagram.com/studio__arrr/";

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl text-black mb-6">
            Contacto y Ubicación
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Encuéntranos fácilmente y ponte en contacto con nosotros. Estamos
            aquí para atenderte.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info */}
          <div className="space-y-8">
            {/* Dirección */}
            <div className="flex items-start gap-4 bg-black/5 rounded-2xl p-6">
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl text-black mb-2">Dirección</h3>
                <p className="text-gray-700 leading-relaxed">
                  {address}
                  <br />
                  <span className="text-gray-600">
                    Studio de Belleza AR: Ibeth Rentería
                  </span>
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                >
                  Ver en mapa →
                </a>
              </div>
            </div>

            {/* Teléfono */}
            <div className="flex items-start gap-4 bg-black/5 rounded-2xl p-6">
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl text-black mb-2">Teléfono</h3>
                <p className="text-gray-700">{phone}</p>
                <div className="flex gap-4 mt-3">
                  <a
                    href={telHref}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Llamar ahora →
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    WhatsApp →
                  </a>
                </div>
              </div>
            </div>

            {/* Correo */}
            <div className="flex items-start gap-4 bg-black/5 rounded-2xl p-6">
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl text-black mb-2">Correo</h3>
                <p className="text-gray-700">{email}</p>
                <a
                  href={mailHref}
                  className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                >
                  Enviar email →
                </a>
              </div>
            </div>

            {/* Redes */}
            <div className="flex items-start gap-4 bg-black/5 rounded-2xl p-6">
              <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Instagram className="w-6 h-6 text-black" />
              </div>
              <div>
                <h3 className="text-xl text-black mb-2">Redes Sociales</h3>
                <p className="text-gray-700">{igHandle}</p>
                <a
                  href={igUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-3 text-amber-600 hover:text-amber-700 font-medium"
                >
                  Seguir →
                </a>
              </div>
            </div>

            {/* Horarios (puedes ajustar si quieres otros) */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl text-black mb-4">Horarios de Atención</h3>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span>Lunes - Viernes:</span>
                  <span>9:00 AM - 7:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sábado:</span>
                  <span>9:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Domingo:</span>
                  <span>Cerrado</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa embebido */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <iframe
              title="Mapa Studio AR"
              className="w-full h-96"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyDUMMY-KEY-REEMPLAZA-AQUI&q=${encodeURIComponent(
                address
              )}`}
            />
            {/* Si no tienes API key, quita el iframe y deja este bloque: */}
            {/* 
            <div className="h-96 bg-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-4" />
                <p>Mapa de ubicación</p>
                <p className="text-sm">Integra aquí tu mapa de Google Maps</p>
              </div>
            </div>
            */}
          </div>
        </div>
      </div>
    </section>
  );
}
