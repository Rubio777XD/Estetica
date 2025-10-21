import { useState, useEffect } from 'react';
import { Calendar, Users, Scissors, CreditCard, Package, BookOpen, Home, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/dialog';
import { toast } from 'sonner@2.0.3';
import logoImage from 'figma:asset/91221a42731ea6d22d48bae9140b3e7361797c30.png';

import Dashboard from './components/Dashboard';
import Servicios from './components/Servicios';
import Pagos from './components/Pagos';
import Inventario from './components/Inventario';
import Citas from './components/Citas';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'citas', label: 'Citas', icon: Calendar },
  { id: 'servicios', label: 'Servicios', icon: Scissors },
  { id: 'pagos', label: 'Pagos & Comisiones', icon: CreditCard },
  { id: 'inventario', label: 'Inventario', icon: Package },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  // Escuchar evento personalizado para navegar a citas
  useEffect(() => {
    const handleNavigateToCitas = () => {
      setActiveSection('citas');
    };
    window.addEventListener('navigate-to-citas', handleNavigateToCitas);
    return () => window.removeEventListener('navigate-to-citas', handleNavigateToCitas);
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'citas':
        return <Citas />;
      case 'servicios':
        return <Servicios />;
      case 'pagos':
        return <Pagos />;
      case 'inventario':
        return <Inventario />;
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
            {menuItems.map((item) => {
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
              <span className="text-sm">IR</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Ibeth Renteria</p>
              <p className="text-xs text-gray-400">Administradora</p>
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
              {menuItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
            </h1>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Sistema Activo
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setConfigDialogOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent()}
        </main>
      </div>

      {/* Modal de Configuración */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración del Sistema</DialogTitle>
            <DialogDescription>
              Administra las opciones y configuración del sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Información del Negocio</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Nombre:</strong> JR Studio de Belleza</p>
                <p><strong>Administradora:</strong> Ibeth Renteria</p>
                <p><strong>Estado:</strong> <Badge className="bg-green-100 text-green-700 border-green-200">Activo</Badge></p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Opciones</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast.info('Función en desarrollo', {
                      description: 'Esta característica estará disponible próximamente'
                    });
                  }}
                >
                  Gestionar Notificaciones
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast.info('Función en desarrollo', {
                      description: 'Esta característica estará disponible próximamente'
                    });
                  }}
                >
                  Exportar Datos
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    toast.info('Función en desarrollo', {
                      description: 'Esta característica estará disponible próximamente'
                    });
                  }}
                >
                  Configurar Horarios
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setConfigDialogOpen(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}