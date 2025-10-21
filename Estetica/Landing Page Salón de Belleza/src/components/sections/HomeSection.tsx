import { useState, useEffect } from "react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { ReviewsCarousel } from "../ReviewsCarousel";

interface HomeSectionProps {
  onNavigate: (sectionId: string) => void;
}

export function HomeSection({ onNavigate }: HomeSectionProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const slides = [
    {
      title: "Belleza que transforma con",
      highlight: "Salón AR",
      subtitle:
        "Servicios de manicure, pedicure y pestañas de la más alta calidad por Ibeth Rentería.",
      image: "/assets/unas1.jfif",
    },
    {
      title: "Experiencia única con",
      highlight: "Salón AR",
      subtitle:
        "Técnicas avanzadas y productos premium para realzar tu belleza natural.",
      image: "/assets/unas3.jfif",
    },
    {
      title: "Elegancia definida en",
      highlight: "Salón AR",
      subtitle:
        "Donde cada detalle cuenta para crear la versión más radiante de ti.",
      image: "/assets/unas2.jfif",
    },
  ];

  // Auto-advance slides with transition effect
  useEffect(() => {
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setIsTransitioning(false);
      }, 250); // mitad de la duración de crossfade
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Animation trigger on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const currentData = slides[currentSlide];

  return (
    <section className="min-h-screen relative flex flex-col overflow-hidden content-layer">
      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8 lg:order-1 order-2">
              {/* Main Title with Crossfade */}
              <div className="relative">
                <h1
                  className={`hero-title font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl leading-tight ${
                    isLoaded && !isTransitioning
                      ? "stagger-1"
                      : isTransitioning
                      ? "crossfade-exit"
                      : "opacity-0"
                  }`}
                  style={{
                    letterSpacing: "-0.02em",
                    lineHeight: "1.04",
                    color: "#ffffff",
                  }}
                >
                  <span className="block sm:inline" style={{ color: "#ffffff" }}>
                    {currentData.title}
                  </span>
                  <br className="hidden sm:block" />
                  <span className="block sm:inline" style={{ color: "#EADCC7" }}>
                    {currentData.highlight}
                  </span>
                </h1>
              </div>

              {/* Subtitle with Crossfade */}
              <div className="relative">
                <p
                  className={`font-body text-lg md:text-xl leading-relaxed text-medium-contrast ${
                    isLoaded && !isTransitioning
                      ? "stagger-2"
                      : isTransitioning
                      ? "crossfade-exit"
                      : "opacity-0"
                  }`}
                  style={{
                    maxWidth: "720px",
                    color: "#E2E2E2",
                    fontWeight: 300,
                  }}
                >
                  {currentData.subtitle}
                </p>
              </div>

              {/* CTA Buttons */}
              <div
                className={`flex flex-col sm:flex-row gap-4 mobile-stack ${
                  isLoaded ? "stagger-3" : "opacity-0"
                }`}
              >
                <button onClick={() => onNavigate("agendar")} className="btn-primary">
                  Agendar Cita →
                </button>

                <button onClick={() => onNavigate("servicios")} className="btn-secondary">
                  Ver Servicios
                </button>
              </div>
            </div>

            {/* Right Content - Model Image with Crossfade */}
            <div className="relative lg:order-2 order-1">
              <div className="relative w-full max-w-lg mx-auto">
                {/* Background Blur Effect */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(231, 208, 150, 0.08) 0%, transparent 70%)",
                    filter: "blur(40px)",
                    transform: "scale(1.2)",
                  }}
                />

                {/* Decorative Element */}
                <div className="absolute -top-8 -right-8 w-16 h-16 luxury-border rounded-full opacity-60 luxury-glow">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-primary rounded-full animate-pulse" />
                  </div>
                </div>

                {/* Model Image with Crossfade and Glow Ring */}
                <div
                  className={`image-glow-ring relative rounded-full overflow-hidden aspect-square ${
                    isLoaded && !isTransitioning
                      ? "stagger-4"
                      : isTransitioning
                      ? "crossfade-exit"
                      : "opacity-0"
                  }`}
                  style={{
                    border: "4px solid rgba(234, 220, 199, 0.3)",
                    boxShadow: "0 0 40px rgba(231, 208, 150, 0.15)",
                  }}
                >
                  <ImageWithFallback
                    src={currentData.image}
                    alt="Salón de Belleza AR - Ibeth Rentería"
                    className="w-full h-full object-cover transition-all duration-[350ms] ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>

                {/* Starburst decoration */}
                <div className="absolute top-1/4 -left-12 w-24 h-24 opacity-50">
                  <div className="w-full h-full relative">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-0.5 h-6 bg-primary origin-bottom"
                        style={{
                          transform: `rotate(${i * 45}deg) translateY(-12px)`,
                          left: "50%",
                          bottom: "50%",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slider Dots */}
          <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex space-x-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setCurrentSlide(index);
                      setIsTransitioning(false);
                    }, 250);
                  }}
                  className={`slider-dot ${
                    index === currentSlide ? "active" : "inactive"
                  }`}
                  aria-label={`Slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Carousel Section */}
      <div className="relative z-10 py-16 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className={isLoaded ? "stagger-5" : "opacity-0"}>
            <ReviewsCarousel />
          </div>
        </div>
      </div>

      {/* Elegant Scroll Indicator - No text */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex flex-col items-center">
          <div className="w-6 h-10 luxury-border rounded-full flex justify-center opacity-70">
            <div className="w-1 h-3 bg-primary rounded-full mt-2 animate-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
