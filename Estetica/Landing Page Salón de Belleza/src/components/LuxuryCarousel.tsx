import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";

interface CarouselItem {
  id: number;
  image: string;
  title: string;
  category: string;
}

interface LuxuryCarouselProps {
  items: CarouselItem[];
  autoplay?: boolean;
  autoplayInterval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  itemsPerView?: number;
}

export function LuxuryCarousel({ 
  items, 
  autoplay = true, 
  autoplayInterval = 4000,
  showDots = true,
  showArrows = true,
  itemsPerView = 1
}: LuxuryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const totalSlides = Math.ceil(items.length / itemsPerView);

  // Autoplay functionality
  useEffect(() => {
    if (autoplay && !isDragging) {
      autoplayRef.current = setInterval(() => {
        nextSlide();
      }, autoplayInterval);
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [autoplay, autoplayInterval, isDragging, currentIndex]);

  const nextSlide = () => {
    if (isTransitioning) return;
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning) return;
    setCurrentIndex(index);
  };

  // Touch/Mouse drag handlers
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    setDragStart(clientX);
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
    }
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - dragStart;
    setDragOffset(offset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 50;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
    
    setDragOffset(0);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleMouseLeave = () => {
    handleDragEnd();
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Carousel Container */}
      <div 
        ref={containerRef}
        className="relative h-80 cursor-grab active:cursor-grabbing"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={isDragging ? handleMouseMove : undefined}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="flex luxury-transition"
          style={{ 
            transform: `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`,
            transitionDuration: isDragging ? '0ms' : '250ms'
          }}
        >
          {Array.from({ length: totalSlides }).map((_, slideIndex) => (
            <div 
              key={slideIndex}
              className="w-full flex-shrink-0"
            >
              <div className={`grid gap-6 ${
                itemsPerView === 1 ? 'grid-cols-1' : 
                itemsPerView === 2 ? 'grid-cols-1 md:grid-cols-2' :
                itemsPerView === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                {items.slice(slideIndex * itemsPerView, (slideIndex + 1) * itemsPerView).map((item) => (
                  <div 
                    key={item.id}
                    className="group relative overflow-hidden rounded-lg luxury-border luxury-transition luxury-hover"
                  >
                    <img 
                      src={item.image}
                      alt={item.title}
                      className="w-full h-64 object-cover group-hover:scale-110 luxury-transition"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 luxury-transition">
                      <div className="absolute bottom-4 left-4 right-4">
                        <span className="inline-block px-3 py-1 bg-[#D4AF37] text-[#0B0B0B] rounded-full text-xs font-medium mb-2">
                          {item.category}
                        </span>
                        <h4 className="font-serif text-white text-lg luxury-text-shadow">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && totalSlides > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0B] luxury-border luxury-transition z-10"
            onClick={prevSlide}
            disabled={isTransitioning}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#0B0B0B] luxury-border luxury-transition z-10"
            onClick={nextSlide}
            disabled={isTransitioning}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && totalSlides > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full luxury-transition ${
                currentIndex === index
                  ? 'bg-[#D4AF37] scale-125 luxury-glow'
                  : 'bg-[#D9C7A1] hover:bg-[#D4AF37] hover:scale-110'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}