import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Calendar, DollarSign, Clock, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function Dashboard() {
  const [emailInvitacion, setEmailInvitacion] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usuariosInvitados, setUsuariosInvitados] = useState<string[]>([]);

  const stats = [
    {
      title: 'Citas Hoy',
      value: '12',
      change: '+2 vs ayer',
      icon: Calendar,
      color: 'text-blue-600'
    },
    {
      title: 'Ingresos últimos 7 días',
      value: '$850,000',
      change: '+18% vs semana anterior',
      icon: DollarSign,
      color: 'text-green-600'
    }
  ];

  const proximasCitas = [
    { id: 1, cliente: 'María Rodríguez', servicio: 'Manicura + Gel', hora: '09:30', especialista: 'Ibeth' },
    { id: 2, cliente: 'Ana García', servicio: 'Pestañas', hora: '11:00', especialista: 'María' },
    { id: 3, cliente: 'Laura Martínez', servicio: 'Pedicura Spa', hora: '14:30', especialista: 'Ibeth' },
    { id: 4, cliente: 'Sofia López', servicio: 'Uñas Artísticas', hora: '16:00', especialista: 'Ana' },
  ];

  const handleEnviarInvitacion = () => {
    // Validar email
    if (!emailInvitacion || !emailInvitacion.includes('@')) {
      toast.error('Por favor ingresa un correo válido');
      return;
    }

    // Validar si ya fue invitado
    if (usuariosInvitados.includes(emailInvitacion)) {
      toast.error('Este correo ya tiene una invitación pendiente', {
        description: 'No puedes enviar invitaciones duplicadas.'
      });
      return;
    }

    // Simular envío de invitación
    setUsuariosInvitados([...usuariosInvitados, emailInvitacion]);
    
    toast.success('Invitación enviada exitosamente', {
      description: `Se envió un correo de invitación a ${emailInvitacion}`
    });

    setEmailInvitacion('');
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-50 ${stat.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximas Citas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Próximas Citas</span>
              <Badge variant="outline">{proximasCitas.length} citas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximasCitas.map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{cita.cliente}</p>
                      <p className="text-xs text-gray-600">{cita.servicio}</p>
                      <p className="text-xs text-gray-500">con {cita.especialista}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{cita.hora}</p>
                    <Badge variant="outline" className="text-xs">
                      Confirmada
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  toast.info('Redirigiendo a la sección de citas...');
                  // En una app real, esto navegaría a la sección de citas
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('navigate-to-citas'));
                  }, 500);
                }}
              >
                Ver todas las citas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agregar Usuarios */}
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              <span>Agregar Usuarios</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Invita a nuevas trabajadoras o personal administrativo a registrarse en el sistema.
              </p>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-black hover:bg-gray-800">
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Invitación
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invitar Nuevo Usuario</DialogTitle>
                    <DialogDescription>
                      Envía una invitación por correo para que un nuevo usuario se registre en el sistema
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">
                        Correo Electrónico
                      </label>
                      <Input
                        type="email"
                        placeholder="usuario@ejemplo.com"
                        value={emailInvitacion}
                        onChange={(e) => setEmailInvitacion(e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Se enviará un enlace de invitación para que el usuario pueda registrarse en la plataforma.
                      </p>
                    </div>

                    {usuariosInvitados.length > 0 && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          Invitaciones enviadas recientemente:
                        </p>
                        <div className="space-y-1">
                          {usuariosInvitados.slice(-3).map((email, index) => (
                            <p key={index} className="text-xs text-blue-700 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {email}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => {
                        setDialogOpen(false);
                        setEmailInvitacion('');
                      }}>
                        Cancelar
                      </Button>
                      <Button 
                        className="bg-black hover:bg-gray-800"
                        onClick={handleEnviarInvitacion}
                      >
                        Enviar Invitación
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {usuariosInvitados.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 mb-2">
                    Total de invitaciones enviadas: <span className="font-semibold">{usuariosInvitados.length}</span>
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {usuariosInvitados.map((email, index) => (
                      <div key={index} className="flex items-center justify-between text-xs p-2 bg-white rounded">
                        <span className="text-gray-600">{email}</span>
                        <Badge variant="outline" className="text-xs">Pendiente</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
