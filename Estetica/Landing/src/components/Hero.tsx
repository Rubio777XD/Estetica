import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="absolute inset-0 bg-black/50 z-10"></div>
      <ImageWithFallback 
        src="https://images.unsplash.com/photo-1611211235015-e2e3a7d09e97?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMGludGVyaW9yJTIwbW9kZXJufGVufDF8fHx8MTc1NzAxNzc2OXww&ixlib=rb-4.1.0&q=80&w=1080"
        alt="Salón de belleza elegante"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      <div className="relative z-20 text-center text-white max-w-4xl mx-auto px-6">
        <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 tracking-wide">
          <span className="block text-white">Salón de Belleza AR</span>
          <span className="block text-amber-400 mt-2">Ibeth Rentería</span>
        </h1>
        
        <p className="text-xl md:text-2xl mb-12 text-gray-200 max-w-2xl mx-auto leading-relaxed">
          Donde la elegancia se encuentra con la perfección. 
          Tu belleza es nuestra pasión.
        </p>
        
        <Button 
          size="lg" 
          className="bg-amber-400 hover:bg-amber-500 text-black px-12 py-6 text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
        >
          Agendar tu cita
        </Button>
      </div>
      
      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="w-6 h-10 border-2 border-amber-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-amber-400 rounded-full mt-2 animate-bounce"></div>
        </div>
      </div>
    </section>
  );
}