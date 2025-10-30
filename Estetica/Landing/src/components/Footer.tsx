export function Footer() {
  return (
    <footer className="bg-black text-white py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Información principal */}
          <div>
            <h3 className="text-xl text-amber-400 mb-4">
              Studio AR
            </h3>
            <p className="text-gray-300 mb-4">
              Fundado por <span className="text-amber-400 font-semibold">Ibeth Rentería</span> — Lashista Profesional y Master Trainer desde 2021.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              Especialista en extensiones de pestañas y formación de nuevas artistas dentro de la industria de la belleza.
              Comprometida con la excelencia, calidad y crecimiento personal y profesional de cada alumna.
            </p>
          </div>

          {/* Servicios */}
          <div>
            <h4 className="text-white mb-4">
              Servicios
            </h4>
            <ul className="space-y-2 text-gray-300">
              <li>Extensiones de Pestañas</li>
              <li>Capacitaciones Profesionales</li>
              <li>Diseño y Cuidado de Pestañas</li>
              <li>Entrenamientos para Lashistas</li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h4 className="text-white mb-4">
              Contacto
            </h4>
            <ul className="space-y-2 text-gray-300">
              <li>+52 664 000 0000</li>
              <li>studioar.ibeth@gmail.com</li>
              <li>@studioar_ibeth</li>
              <li>Tijuana, Baja California</li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400">
            © {new Date().getFullYear()} Studio AR — Ibeth Rentería. Todos los derechos reservados.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Certificada por el Consejo Nacional de Normalización y Certificación de Competencias Laborales.
          </p>
        </div>
      </div>
    </footer>
  );
}
