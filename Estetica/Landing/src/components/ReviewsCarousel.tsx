import { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  date: string;
  comment: string;
}

const mockReviews: Review[] = [
  {
    id: '1',
    name: 'María González',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b38671d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHBvcnRyYWl0JTIwc21pbGV8ZW58MXx8fHwxNzU3Mjg0MTI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 5,
    date: 'Hace 2 semanas',
    comment: 'Ibeth es increíble! Sus extensiones de pestañas duran muchísimo y se ven súper naturales. El ambiente del salón es muy relajante.'
  },
  {
    id: '2',
    name: 'Ana Sofia Torres',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHx3b21hbiUyMHBvcnRyYWl0JTIwc21pbGV8ZW58MXx8fHwxNzU3Mjg0MTI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 5,
    date: 'Hace 1 mes',
    comment: 'El mejor pedicure que me han hecho en mi vida. Ibeth tiene una técnica impecable y usa productos de excelente calidad. 100% recomendado.'
  },
  {
    id: '3',
    name: 'Carolina Ruiz',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHx3b21hbiUyMHBvcnRyYWl0JTIwc21pbGV8ZW58MXx8fHwxNzU3Mjg0MTI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 5,
    date: 'Hace 3 semanas',
    comment: 'Las manicures de Ibeth son arte puro. Siempre salgo feliz y mis uñas se ven perfectas. Es mi lugar favorito para consentirme.'
  },
  {
    id: '4',
    name: 'Isabella Vargas',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHx3b21hbiUyMHBvcnRyYWl0JTIwc21pbGV8ZW58MXx8fHwxNzU3Mjg0MTI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 5,
    date: 'Hace 5 días',
    comment: 'Profesionalismo y calidad excepcional. Ibeth es muy detallista y siempre logra exactamente lo que quiero. El salón es hermoso y muy limpio.'
  },
  {
    id: '5',
    name: 'Valentina Mora',
    avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHx3b21hbiUyMHBvcnRyYWl0JTIwc21pbGV8ZW58MXx8fHwxNzU3Mjg0MTI5fDA&ixlib=rb-4.1.0&q=80&w=1080',
    rating: 5,
    date: 'Hace 1 semana',
    comment: 'Experiencia 5 estrellas! Ibeth no solo es experta en su trabajo, sino que también te hace sentir como en casa. Volveré sin duda.'
  }
];

interface ReviewsCarouselProps {
  className?: string;
}

export function ReviewsCarousel({ className = '' }: ReviewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying || isLoading) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mockReviews.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [isAutoPlaying, isLoading]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      setCurrentIndex((prev) => (prev + 1) % mockReviews.length);
    } else if (isRightSwipe) {
      setCurrentIndex((prev) => (prev - 1 + mockReviews.length) % mockReviews.length);
    }

    setTouchStart(0);
    setTouchEnd(0);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + mockReviews.length) % mockReviews.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mockReviews.length);
  };

  // Skeleton component
  const ReviewSkeleton = () => (
    <div className="review-card p-6 animate-pulse">
      <div className="flex items-start space-x-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full flex-shrink-0"></div>
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 bg-gray-700 rounded w-32"></div>
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-4 h-4 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
          <div className="h-3 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
    </div>
  );

  // Empty state
  if (!mockReviews.length && !isLoading) {
    return (
      <div className={`${className}`}>
        <div className="text-center py-12">
          <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="font-heading text-xl text-gray-400 mb-2">
            Próximamente
          </h3>
          <p className="text-gray-500">
            Las reseñas de nuestras clientas aparecerán aquí.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="font-heading text-2xl md:text-3xl text-white mb-4">
          Lo que dicen nuestras clientas
        </h3>
        <div className="w-16 h-0.5 bg-editorial-beige mx-auto mb-4 opacity-80"></div>
        <p className="font-body text-editorial-gray max-w-lg mx-auto opacity-90">
          Experiencias reales de mujeres que confían en nuestra expertise
        </p>
      </div>

      {/* Carousel Container */}
      <div 
        className="relative overflow-hidden"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Reviews Track */}
        <div 
          className="flex transition-transform duration-400 ease-out"
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`,
            transitionTimingFunction: 'cubic-bezier(0.2, 0.6, 0.16, 1)'
          }}
        >
          {isLoading ? (
            // Loading skeletons
            [...Array(3)].map((_, i) => (
              <div key={i} className="w-full flex-shrink-0 px-4">
                <ReviewSkeleton />
              </div>
            ))
          ) : (
            // Actual reviews
            mockReviews.map((review) => (
              <div key={review.id} className="w-full flex-shrink-0 px-4">
                <div className="review-card p-6 h-full">
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <ImageWithFallback
                        src={review.avatar}
                        alt={review.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-body font-medium text-white truncate">
                          {review.name}
                        </h4>
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-4">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating 
                                  ? 'text-editorial-beige fill-current' 
                                  : 'text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {/* Comment */}
                      <p className="font-body text-sm text-editorial-gray leading-relaxed mb-3 line-clamp-3">
                        "{review.comment}"
                      </p>
                      
                      {/* Date */}
                      <p className="font-body text-xs text-gray-500">
                        {review.date}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Navigation Arrows */}
        {!isLoading && mockReviews.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-editorial-beige/30 flex items-center justify-center text-editorial-beige hover:bg-editorial-beige/10 hover:border-editorial-beige transition-all duration-200"
              aria-label="Reseña anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 border border-editorial-beige/30 flex items-center justify-center text-editorial-beige hover:bg-editorial-beige/10 hover:border-editorial-beige transition-all duration-200"
              aria-label="Siguiente reseña"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {!isLoading && mockReviews.length > 1 && (
        <div className="flex justify-center space-x-2 mt-6">
          {mockReviews.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`slider-dot ${index === currentIndex ? 'active' : 'inactive'}`}
              aria-label={`Ir a reseña ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}