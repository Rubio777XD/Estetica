import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader } from "./ui/card";

export function BookingForm() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí se manejaría el envío del formulario
    console.log("Datos del formulario:", formData);
    alert("¡Gracias! Te contactaremos pronto para confirmar tu cita.");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section className="py-20 bg-black">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl text-white mb-6">
              Agenda tu Cita
            </h2>
            <p className="text-gray-300 text-lg">
              Completa el formulario y nos pondremos en contacto contigo para confirmar tu cita.
            </p>
          </div>
          
          <Card className="bg-white border-0 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <h3 className="text-xl text-black">
                Información de Contacto
              </h3>
            </CardHeader>
            
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-black">
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Tu nombre completo"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="h-12 border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-black">
                    Número de celular
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Tu número de celular"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="h-12 border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-black">
                    Correo electrónico
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="h-12 border-gray-200 focus:border-amber-400 focus:ring-amber-400"
                  />
                </div>
                
                <Button 
                  type="submit"
                  className="w-full h-12 bg-amber-400 hover:bg-amber-500 text-black rounded-full text-lg font-medium transform hover:scale-105 transition-all duration-300"
                >
                  Confirmar Cita
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}