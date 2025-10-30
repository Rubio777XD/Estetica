import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Menu, X } from "lucide-react";
import { MiniLoginModal } from "./MiniLoginModal";
import { fetchMe, logout as clearSession } from "../lib/auth";

const navigationItems = [
  { id: "home", label: "Home" },
  { id: "servicios", label: "Servicios" },
  { id: "agendar", label: "Agendar" },
  { id: "sobre-nosotros", label: "Sobre nosotros" },
  { id: "galeria", label: "Galería" },
  { id: "contacto", label: "Contacto" },
];

interface LuxuryHeaderProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

const DASHBOARD_BASE_URL =
  import.meta.env.VITE_PUBLIC_DASHBOARD_URL || "http://localhost:3003";
const DASHBOARD_URL = `${DASHBOARD_BASE_URL.replace(/\/$/, "")}/?auth=dev`;

export function LuxuryHeader({ activeSection, onNavigate }: LuxuryHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        await fetchMe();
        if (isMounted) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        clearSession();
        if (isMounted) {
          setIsLoggedIn(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleNavClick = (sectionId: string) => {
    onNavigate(sectionId);
    setMobileMenuOpen(false);
  };

  // CITA → ir directo a agendar (sin login)
  const handleCitaClick = () => {
    if (isLoggedIn) {
      handleNavClick("agendar");
    } else {
      setPendingSection("agendar");
      setShowLoginModal(true);
    }
  };

  // Avatar E → login empleados
  const handleAvatarClick = () => {
    if (!isLoggedIn) {
      setPendingSection(null);
      setShowLoginModal(true);
    }
  };

  // Al iniciar sesión: solo cerrar modal y mostrar botón Dashboard
  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowLoginModal(false);
    if (pendingSection) {
      handleNavClick(pendingSection);
    }
    setPendingSection(null);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    clearSession();
    setPendingSection(null);
    handleNavClick("home");
  };

  const goDashboard = () => {
    window.open(DASHBOARD_URL, "_self");
  };

  const handleCloseLoginModal = () => {
    setShowLoginModal(false);
    setPendingSection(null);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 solid-black-navbar content-layer">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo (imagen de /public/assets) */}
          <div
            className="flex items-center gap-2 cursor-pointer luxury-transition hover:scale-105"
            onClick={() => handleNavClick("home")}
            aria-label="Ir a inicio"
          >
            <img
              src="/assets/logo.jfif"
              alt="Studio AR"
              className="h-8 w-8 rounded-full object-cover"
            />
            <span className="sr-only">Studio AR</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`nav-link font-body text-sm ${
                  activeSection === item.id ? "active" : ""
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            {/* CITA → Agendar */}
            <button
              onClick={handleCitaClick}
              className="hidden sm:flex items-center justify-center px-6 py-2 text-sm font-medium transition-all duration-200 ease-out"
              style={{
                border: "1.5px solid #EADCC7",
                color: "#EADCC7",
                borderRadius: "50px",
                background: "transparent",
                minHeight: "40px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#EADCC7";
                e.currentTarget.style.color = "#000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#EADCC7";
              }}
            >
              CITA
            </button>

            {/* Botón Dashboard (solo si logueado) */}
            {isLoggedIn && (
              <button
                onClick={goDashboard}
                className="hidden sm:flex items-center justify-center px-4 py-2 text-xs font-medium rounded-full bg-[#EADCC7] text-black hover:opacity-90 transition"
              >
                Dashboard
              </button>
            )}

            {/* Avatar Empleado */}
            <div onClick={handleAvatarClick} className="cursor-pointer">
              <Avatar className="w-8 h-8 hover:ring-2 hover:ring-primary luxury-transition">
                <AvatarImage src="" alt={isLoggedIn ? "Usuario" : "Login empleados"} />
                <AvatarFallback className="bg-background text-primary text-xs">
                  {isLoggedIn ? "U" : "E"}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Logout (desktop) */}
            {isLoggedIn && (
              <button
                onClick={handleLogout}
                className="hidden sm:block text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Salir
              </button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden text-white hover:text-editorial-beige luxury-transition"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Menú"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 solid-black-navbar border-t border-luxury-gold/20">
            <nav className="container mx-auto px-4 py-4">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`block w-full text-left py-3 nav-link font-body text-sm ${
                    activeSection === item.id ? "active" : ""
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* CTA + Dashboard + Logout (móvil) */}
              <div className="pt-4 mt-4 border-t border-luxury-gold/20">
                <button
                  onClick={handleCitaClick}
                  className="w-full text-center py-3 text-sm font-medium transition-all duration-200 ease-out"
                  style={{
                    border: "1.5px solid #EADCC7",
                    color: "#EADCC7",
                    borderRadius: "50px",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#EADCC7";
                    e.currentTarget.style.color = "#000000";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#EADCC7";
                  }}
                >
                  PROGRAMAR
                </button>

                {isLoggedIn && (
                  <>
                    <button
                      onClick={goDashboard}
                      className="w-full text-center py-3 mt-3 text-sm font-medium rounded-full bg-[#EADCC7] text-black hover:opacity-90 transition"
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-center py-2 mt-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                    >
                      Cerrar Sesión
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Mini Login Modal */}
      <MiniLoginModal
        isOpen={showLoginModal}
        onClose={handleCloseLoginModal}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}
