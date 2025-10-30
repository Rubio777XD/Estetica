const steps = [
  {
    number: "01",
    title: "Elige tu servicio",
    description: "Selecciona entre nuestros servicios de manicure, pedicure o pestañas según tus necesidades."
  },
  {
    number: "02", 
    title: "Selecciona hora disponible",
    description: "Escoge el día y la hora que mejor se ajuste a tu horario desde nuestro calendario."
  },
  {
    number: "03",
    title: "Confirma con tu celular y correo",
    description: "Proporciona tus datos de contacto para confirmar tu cita y recibir recordatorios."
  }
];

export function HowItWorks() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl text-black mb-6">
            ¿Cómo funciona?
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Agenda tu cita de manera fácil y rápida en solo 3 simples pasos.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="text-center group">
              <div className="relative mb-8">
                <div className="w-20 h-20 mx-auto bg-amber-400 rounded-full flex items-center justify-center text-black text-xl font-medium mb-6 group-hover:bg-amber-500 transition-colors duration-300">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-gray-300 transform translate-x-full -translate-y-1/2"></div>
                )}
              </div>
              
              <h3 className="text-xl text-black mb-4">
                {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}