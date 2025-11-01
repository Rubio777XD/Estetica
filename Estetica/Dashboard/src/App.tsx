import { PropsWithChildren, useEffect, useState } from 'react';
import {
  Calendar,
  CalendarClock,
  Users,
  Scissors,
  CreditCard,
  Package,
  Home,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import logoImage from 'figma:asset/91221a42731ea6d22d48bae9140b3e7361797c30.png';

import Dashboard from './components/Dashboard';
import Servicios from './components/Servicios';
import Pagos from './components/Pagos';
import Inventario from './components/Inventario';
import CitasProximas from './components/CitasProximas';
import CitasTerminadas from './components/CitasTerminadas';
import CitasPendientes from './components/CitasPendientes';
import Usuarios from './components/Usuarios';
import { ensureSession, logout as remoteLogout } from './lib/auth';
import { API_BASE_URL } from './lib/api';
import { invalidateQuery, invalidateQueriesMatching } from './lib/data-store';

const LANDING_FALLBACK = (
  import.meta.env.VITE_PUBLIC_LANDING_URL as string | undefined || 'http://localhost:3001/'
).replace(/\/$/, '') + '/';

function AuthGuard({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<'checking' | 'ready'>('checking');

  useEffect(() => {
    let isActive = true;

    const validate = async () => {
      try {
        await ensureSession();
        if (isActive) {
          setStatus('ready');
        }
      } catch (error) {
        await remoteLogout();
        if (typeof window !== 'undefined') {
          window.location.replace(LANDING_FALLBACK);
        }
      }
    };

    validate();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await remoteLogout().catch(() => undefined);
      if (typeof window !== 'undefined') {
        window.location.replace(LANDING_FALLBACK);
      }
    };
    window.addEventListener('dashboard:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('dashboard:unauthorized', handleUnauthorized);
    };
  }, []);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-2 border-white/60 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm tracking-wide uppercase text-white/70">Cargando…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'citas-proximas', label: 'Citas próximas', icon: Calendar },
  { id: 'citas-terminadas', label: 'Citas terminadas', icon: CheckCircle2 },
  { id: 'citas-pendientes', label: 'Citas pendientes', icon: CalendarClock },
  { id: 'servicios', label: 'Servicios', icon: Scissors },
  { id: 'pagos', label: 'Pagos & Comisiones', icon: CreditCard },
  { id: 'inventario', label: 'Inventario', icon: Package },
];

function AppShell() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name?: string | null; role?: string | null } | null>(null);
  const isAdmin = currentUser?.role === 'ADMIN';
  const navigationItems = isAdmin
    ? [...menuItems, { id: 'usuarios', label: 'Usuarios', icon: Users }]
    : menuItems;

  useEffect(() => {
    let mounted = true;
    ensureSession()
      .then((user) => {
        if (mounted) {
          setCurrentUser(user);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdmin && activeSection === 'usuarios') {
      setActiveSection('dashboard');
    }
  }, [activeSection, isAdmin]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let attempts = 0;
    let isMounted = true;

    const handleStats = () => {
      invalidateQuery('stats-overview');
      invalidateQueriesMatching('stats-revenue');
    };

    const cleanupSource = () => {
      if (source) {
        source.close();
        source = null;
      }
    };

    const scheduleReconnect = () => {
      if (!isMounted) return;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      const delay = Math.min(30000, 2000 * Math.max(1, attempts));
      retryTimer = window.setTimeout(() => {
        attempts += 1;
        connect();
      }, delay);
    };

    const connect = () => {
      if (!isMounted) {
        return;
      }

      cleanupSource();

      const eventSource = new EventSource(`${API_BASE_URL}/api/events`, { withCredentials: true });
      source = eventSource;

      const handleServiceChange = () => {
        invalidateQuery('services');
        invalidateQueriesMatching('bookings:');
        handleStats();
      };

      const handleBookingChange = () => {
        invalidateQueriesMatching('bookings:');
        invalidateQuery('bookings:for-payments');
        handleStats();
      };

      const handleAssignmentChange = () => {
        invalidateQuery('bookings:pending');
        invalidateQueriesMatching('bookings:');
      };

    const handlePaymentChange = () => {
      invalidateQueriesMatching('payments:');
      invalidateQuery('bookings:for-payments');
      invalidateQueriesMatching('commissions:');
      handleStats();
    };

    const handleCommissionChange = () => {
      invalidateQueriesMatching('commissions:');
      handlePaymentChange();
    };

      const handleProductChange = () => {
        invalidateQuery('products');
        handleStats();
      };

      eventSource.addEventListener('open', () => {
        attempts = 0;
      });

      eventSource.addEventListener('service:created', handleServiceChange);
      eventSource.addEventListener('service:updated', handleServiceChange);
      eventSource.addEventListener('service:deleted', handleServiceChange);

      eventSource.addEventListener('booking:created', handleBookingChange);
      eventSource.addEventListener('booking:updated', handleBookingChange);
      eventSource.addEventListener('booking:deleted', handleBookingChange);
      eventSource.addEventListener('booking:status', handleBookingChange);
      eventSource.addEventListener('booking:assignment:sent', handleAssignmentChange);
      eventSource.addEventListener('booking:assignment:accepted', handleAssignmentChange);
      eventSource.addEventListener('booking:assignment:expired', handleAssignmentChange);
      eventSource.addEventListener('booking:assignment:cancelled', handleAssignmentChange);

      eventSource.addEventListener('payment:created', handlePaymentChange);
      eventSource.addEventListener('payments:invalidate', handlePaymentChange);
      eventSource.addEventListener('commission:created', handleCommissionChange);

      eventSource.addEventListener('product:created', handleProductChange);
      eventSource.addEventListener('product:updated', handleProductChange);
      eventSource.addEventListener('product:deleted', handleProductChange);

      eventSource.addEventListener('stats:invalidate', handleStats as EventListener);

      eventSource.onerror = () => {
        if (!isMounted) {
          return;
        }
        attempts = Math.max(1, attempts);
        cleanupSource();
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      cleanupSource();
    };
  }, []);

  // Escuchar evento personalizado para navegar a citas
  useEffect(() => {
    const handleNavigateToCitas = () => {
      setActiveSection('citas-proximas');
    };
    window.addEventListener('navigate-to-citas', handleNavigateToCitas);
    return () => window.removeEventListener('navigate-to-citas', handleNavigateToCitas);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await remoteLogout();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('No fue posible cerrar la sesión desde el panel', error);
      }
    } finally {
      setIsLoggingOut(false);
      if (typeof window !== 'undefined') {
        window.location.replace(LANDING_FALLBACK);
      }
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'citas-proximas':
        return <CitasProximas />;
      case 'citas-terminadas':
        return <CitasTerminadas />;
      case 'citas-pendientes':
        return <CitasPendientes />;
      case 'servicios':
        return <Servicios />;
      case 'pagos':
        return <Pagos />;
      case 'inventario':
        return <Inventario />;
      case 'usuarios':
        return <Usuarios isAdmin={isAdmin} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <>
      <Toaster />
      <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-black text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="JR Studio de Belleza" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === item.id
                        ? 'bg-white text-black'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
              <span className="text-sm">
                {currentUser?.name?.[0]?.toUpperCase() ?? currentUser?.email?.[0]?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{currentUser?.name ?? currentUser?.email ?? 'Equipo'}</p>
              <p className="text-xs text-gray-400">{currentUser?.role ?? 'Sesión activa'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">
              {navigationItems.find((item) => item.id === activeSection)?.label ||
                menuItems.find((item) => item.id === activeSection)?.label ||
                'Dashboard'}
            </h1>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Sistema Activo
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isLoggingOut ? 'Cerrando…' : 'Cerrar sesión'}
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>

    </div>
    </>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <AppShell />
    </AuthGuard>
  );
}

