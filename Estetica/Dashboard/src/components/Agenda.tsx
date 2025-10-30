import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar, Clock, User, Plus, Filter } from 'lucide-react';

export default function Agenda() {
  const [especialistaSeleccionado, setEspecialistaSeleccionado] = useState('todos');
  const [fechaSeleccionada, setFechaSeleccionada] = useState('hoy');

  const especialistas = [
    { id: 'todos', nombre: 'Todos los Especialistas' },
    { id: 'ibeth', nombre: 'Ibeth Renteria' },
    { id: 'maria', nombre: 'María González' },
    { id: 'ana', nombre: 'Ana López' }
  ];

  const citas = [
    {
      id: 1,
      cliente: 'María Rodríguez',
      servicio: 'Manicura + Gel',
      especialista: 'Ibeth Renteria',
      hora: '09:30 - 11:00',
      estado: 'confirmada',
      telefono: '+57 300 123 4567',
      notas: 'Prefiere colores neutros'
    },
    {
      id: 2,
      cliente: 'Ana García',
      servicio: 'Extensión de Pestañas',
      especialista: 'María González',
      hora: '11:00 - 12:30',
      estado: 'en-proceso',
      telefono: '+57 300 234 5678',
      notas: 'Primera vez, explicar cuidados'
    },
    {
      id: 3,
      cliente: 'Laura Martínez',
      servicio: 'Pedicura Spa',
      especialista: 'Ibeth Renteria',
      hora: '14:30 - 16:00',
      estado: 'pendiente',
      telefono: '+57 300 345 6789',
      notas: 'Traer sus propios esmaltes'
    },
    {
      id: 4,
      cliente: 'Sofia López',
      servicio: 'Uñas Artísticas',
      especialista: 'Ana López',
      hora: '16:00 - 17:30',
      estado: 'confirmada',
      telefono: '+57 300 456 7890',
      notas: 'Diseño de flores'
    },
    {
      id: 5,
      cliente: 'Carmen Torres',
      servicio: 'Manicura Rusa',
      especialista: 'Ibeth Renteria',
      hora: '18:00 - 19:30',
      estado: 'pendiente',
      telefono: '+57 300 567 8901',
      notas: ''
    }
  ];

  const horasDisponibles = [
    '08:00', '09:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30'
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en-proceso':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const citasFiltradas = citas.filter(cita => {
    if (especialistaSeleccionado === 'todos') return true;
    return cita.especialista.toLowerCase().includes(especialistaSeleccionado);
  });

  return (
    <div className="space-y-6">
      {/* Filtros y Controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={especialistaSeleccionado} onValueChange={setEspecialistaSeleccionado}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Seleccionar especialista" />
            </SelectTrigger>
            <SelectContent>
              {especialistas.map((especialista) => (
                <SelectItem key={especialista.id} value={especialista.id}>
                  {especialista.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fechaSeleccionada} onValueChange={setFechaSeleccionada}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="manana">Mañana</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button className="bg-black hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Citas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Agenda del Día</span>
                <Badge variant="outline">{citasFiltradas.length} citas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {citasFiltradas.map((cita) => (
                  <div key={cita.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{cita.cliente}</h3>
                          <p className="text-sm text-gray-600">{cita.servicio}</p>
                          <p className="text-sm text-gray-500">con {cita.especialista}</p>
                        </div>
                      </div>
                      <Badge className={getEstadoColor(cita.estado)}>
                        {cita.estado.replace('-', ' ')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2" />
                        {cita.hora}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <span className="mr-2">📞</span>
                        {cita.telefono}
                      </div>
                    </div>

                    {cita.notas && (
                      <div className="mt-3 p-2 bg-yellow-50 rounded text-sm text-gray-700">
                        <strong>Notas:</strong> {cita.notas}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2 mt-3">
                      <Button variant="outline" size="sm">
                        Editar
                      </Button>
                      <Button variant="outline" size="sm">
                        Contactar
                      </Button>
                      {cita.estado === 'pendiente' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          Confirmar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel Lateral */}
        <div className="space-y-6">
          {/* Vista Rápida del Calendario */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Calendario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-black">04</div>
                <div className="text-sm text-gray-600">Septiembre 2025</div>
                <div className="text-sm text-gray-500">Jueves</div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Citas programadas</span>
                  <span className="font-medium">{citasFiltradas.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Horas ocupadas</span>
                  <span className="font-medium">7.5h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tiempo libre</span>
                  <span className="font-medium text-green-600">2.5h</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Horarios Disponibles */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {horasDisponibles.map((hora) => {
                  const ocupado = citas.some(cita => cita.hora.includes(hora));
                  return (
                    <Button
                      key={hora}
                      variant={ocupado ? "secondary" : "outline"}
                      size="sm"
                      disabled={ocupado}
                      className={ocupado ? "bg-gray-200 text-gray-500" : "hover:bg-black hover:text-white"}
                    >
                      {hora}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completadas</span>
                  <span className="font-medium text-green-600">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">En proceso</span>
                  <span className="font-medium text-blue-600">1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pendientes</span>
                  <span className="font-medium text-yellow-600">2</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-bold">{citasFiltradas.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}