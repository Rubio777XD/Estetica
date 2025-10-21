import { useState, useEffect } from "react";
import { LuxuryHeader } from "./components/LuxuryHeader";
import { HomeSection } from "./components/sections/HomeSection";
import { ServicesSection } from "./components/sections/ServicesSection";
import { BookingSection } from "./components/sections/BookingSection";
import { AboutSection } from "./components/sections/AboutSection";
import { GallerySection } from "./components/sections/GallerySection";
import { ContactSection } from "./components/sections/ContactSection";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { LuxuryFooter } from "./components/LuxuryFooter";

const sections = [
  { id: 'home', component: 'home' },
  { id: 'servicios', component: 'servicios' },
  { id: 'agendar', component: 'agendar' },
  { id: 'sobre-nosotros', component: 'sobre-nosotros' },
  { id: 'galeria', component: 'galeria' },
  { id: 'contacto', component: 'contacto' }
];

export default function App() {
  const [activeSection, setActiveSection] = useState('home');
  const [preSelectedService, setPreSelectedService] = useState<string | undefined>();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleNavigation = (sectionId: string, serviceId?: string) => {
    if (sectionId === activeSection) return;
    
    setIsTransitioning(true);
    
    // Set pre-selected service for booking
    if (sectionId === 'agendar' && serviceId) {
      setPreSelectedService(serviceId);
    } else {
      setPreSelectedService(undefined);
    }
    
    setTimeout(() => {
      setActiveSection(sectionId);
      setIsTransitioning(false);
      
      // Scroll to top on section change
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  const handleServiceBooking = (serviceId?: string) => {
    handleNavigation('agendar', serviceId);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentIndex = sections.findIndex(s => s.id === activeSection);
      
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        handleNavigation(sections[currentIndex - 1].id);
      } else if (e.key === 'ArrowRight' && currentIndex < sections.length - 1) {
        handleNavigation(sections[currentIndex + 1].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection]);

  // Handle touch gestures for mobile swipe
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeDistance = touchStartX - touchEndX;
      const minSwipeDistance = 50;
      const currentIndex = sections.findIndex(s => s.id === activeSection);

      if (Math.abs(swipeDistance) > minSwipeDistance) {
        if (swipeDistance > 0 && currentIndex < sections.length - 1) {
          // Swipe left - next section
          handleNavigation(sections[currentIndex + 1].id);
        } else if (swipeDistance < 0 && currentIndex > 0) {
          // Swipe right - previous section
          handleNavigation(sections[currentIndex - 1].id);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeSection]);

  const renderSection = () => {
    const wrapperClassName = `transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`;

    switch (activeSection) {
      case 'home':
        return (
          <div key={activeSection} className={wrapperClassName}>
            <HomeSection onNavigate={handleNavigation} />
          </div>
        );
      case 'servicios':
        return (
          <div key={activeSection} className={wrapperClassName}>
            <ServicesSection onNavigateToBooking={handleServiceBooking} />
          </div>
        );
      case 'agendar':
        return (
          <div key={activeSection} className={wrapperClassName}>
            <BookingSection preSelectedService={preSelectedService} />
          </div>
        );
      case 'sobre-nosotros':
        return (
          <div key={activeSection} className={wrapperClassName}>
            <AboutSection />
          </div>
        );
      case 'galeria':
        return (
          <div key={activeSection} className={wrapperClassName}>
            <GallerySection />
          </div>
        );
      case 'contacto':
        return (
          <div key={activeSection} className={wrapperClassName}>
            <ContactSection />
          </div>
        );
      default:
        return (
          <div key={activeSection} className={wrapperClassName}>
            <HomeSection onNavigate={handleNavigation} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen text-luxury-primary font-sans content-layer">
      {/* Header */}
      <LuxuryHeader 
        activeSection={activeSection} 
        onNavigate={handleNavigation}
      />
      
      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        {renderSection()}
      </main>
      
      {/* Footer - only show on contact section or desktop */}
      {activeSection === 'contacto' && (
        <LuxuryFooter />
      )}
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        activeSection={activeSection}
        onNavigate={handleNavigation}
      />
      
      {/* Section Navigation Hints */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 z-30 hidden lg:block">
        <div className="flex flex-col space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleNavigation(section.id)}
              className={`w-3 h-3 rounded-full luxury-transition ${
                activeSection === section.id
                  ? 'bg-[#D4AF37] scale-125 luxury-glow'
                  : 'bg-[#D9C7A1] hover:bg-[#D4AF37] hover:scale-110'
              }`}
              title={section.id.replace('-', ' ')}
            />
          ))}
        </div>
      </div>

      {/* Loading Overlay */}
      {isTransitioning && (
        <div className="fixed inset-0 bg-[#0B0B0B]/90 luxury-backdrop z-50 flex items-center justify-center">
          <div className="flex space-x-2">
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-[#D4AF37] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      )}
    </div>
  );
}