import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Calendar, Clock, User, Phone, Plus, Mail, Send, Check, Package } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// Componente para cada cita pendiente con estado independiente
function CitaPendienteItem({ cita, onAsignar, onContactar }: any) {
  const [correo, setCorreo] = useState('');

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{cita.cliente.nombre}</h3>
            <p className="text-sm text-gray-600">{cita.servicio}</p>
            <p className="text-sm text-gray-500">
              {new Date(cita.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })} a las {cita.hora}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-green-600">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cita.costo)}</p>
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Sin asignar
          </Badge>
        </div>
      </div>

      <div className="bg-gray-50 p-3 rounded-lg mb-3">
        <p className="text-sm text-gray-600 mb-1">
          <Phone className="h-3 w-3 inline mr-1" />
          {cita.cliente.telefono}
        </p>
        <p className="text-sm text-gray-600">
          <Mail className="h-3 w-3 inline mr-1" />
          {cita.cliente.email}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="correo@trabajadora.com"
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="flex-1"
          />
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              onAsignar(cita.id, correo);
              setCorreo('');
            }}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Asignación
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onContactar(cita.cliente.telefono, cita.cliente.nombre)}
        >
          <Phone className="h-4 w-4 mr-2" />
          Contactar Cliente por WhatsApp
        </Button>
      </div>
    </div>
  );
}

// Componente para citas próximas con modales de edición
function CitaProximaItem({ cita, productosInventario, onEditarPrecio, onAgregarProductos, onMarcarRealizada }: any) {
  const [dialogPrecioOpen, setDialogPrecioOpen] = useState(false);
  const [dialogProductosOpen, setDialogProductosOpen] = useState(false);
  const [nuevoPrecio, setNuevoPrecio] = useState(cita.costo);
  const [productosSeleccionados, setProductosSeleccionados] = useState<any[]>([]);

  const handleGuardarPrecio = () => {
    onEditarPrecio(cita.id, nuevoPrecio);
    setDialogPrecioOpen(false);
    toast.success('Precio actualizado', {
      description: `Nuevo precio: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(nuevoPrecio)}`
    });
  };

  const handleAgregarProducto = (producto: any) => {
    const existe = productosSeleccionados.find(p => p.id === producto.id);
    if (existe) {
      setProductosSeleccionados(productosSeleccionados.map(p => 
        p.id === producto.id ? { ...p, cantidad: p.cantidad + 1 } : p
      ));
    } else {
      setProductosSeleccionados([...productosSeleccionados, { ...producto, cantidad: 1 }]);
    }
  };

  const handleQuitarProducto = (productoId: number) => {
    setProductosSeleccionados(productosSeleccionados.filter(p => p.id !== productoId));
  };

  const handleCambiarCantidad = (productoId: number, cantidad: number) => {
    if (cantidad <= 0) {
      handleQuitarProducto(productoId);
    } else {
      setProductosSeleccionados(productosSeleccionados.map(p => 
        p.id === productoId ? { ...p, cantidad } : p
      ));
    }
  };

  const handleGuardarProductos = () => {
    onAgregarProductos(cita.id, productosSeleccionados);
    setDialogProductosOpen(false);
    setProductosSeleccionados([]);
    toast.success('Productos registrados', {
      description: `Se descontaron ${productosSeleccionados.length} productos del inventario`
    });
  };

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{cita.cliente.nombre}</h3>
            <p className="text-sm text-gray-600">{cita.servicio}</p>
            <p className="text-sm text-gray-500">
              {new Date(cita.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })} a las {cita.hora}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-green-600">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cita.costo)}</p>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Confirmada
          </Badge>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg mb-3">
        <p className="text-sm font-medium text-blue-900">Trabajadora Asignada:</p>
        <p className="text-sm text-blue-700">{cita.trabajadora}</p>
      </div>

      <div className="flex justify-end space-x-2">
        <Dialog open={dialogPrecioOpen} onOpenChange={setDialogPrecioOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Editar Precio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Precio de la Cita</DialogTitle>
              <DialogDescription>
                Modifica el costo final del servicio
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Cliente</label>
                <p className="text-sm text-gray-600">{cita.cliente.nombre}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Servicio</label>
                <p className="text-sm text-gray-600">{cita.servicio}</p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Nuevo Precio (COP)</label>
                <Input
                  type="number"
                  value={nuevoPrecio}
                  onChange={(e) => setNuevoPrecio(parseInt(e.target.value))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogPrecioOpen(false)}>
                  Cancelar
                </Button>
                <Button className="bg-black hover:bg-gray-800" onClick={handleGuardarPrecio}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogProductosOpen} onOpenChange={setDialogProductosOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Package className="h-4 w-4 mr-1" />
              Agregar Productos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Agregar Productos Usados</DialogTitle>
              <DialogDescription>
                Selecciona los productos del inventario utilizados en esta cita
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Productos Seleccionados</h4>
                {productosSeleccionados.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay productos seleccionados</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {productosSeleccionados.map((producto) => (
                      <div key={producto.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm">{producto.nombre}</span>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={producto.cantidad}
                            onChange={(e) => handleCambiarCantidad(producto.id, parseInt(e.target.value))}
                            className="w-20"
                            min="1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuitarProducto(producto.id)}
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Inventario Disponible</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {productosInventario.map((producto: any) => (
                    <div
                      key={producto.id}
                      className="flex items-center justify-between border p-2 rounded hover:bg-gray-50"
                    >
                      <div>
                        <p className="text-sm font-medium">{producto.nombre}</p>
                        <p className="text-xs text-gray-500">Stock: {producto.cantidad}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAgregarProducto(producto)}
                        disabled={producto.cantidad === 0}
                      >
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setDialogProductosOpen(false);
                  setProductosSeleccionados([]);
                }}>
                  Cancelar
                </Button>
                <Button 
                  className="bg-black hover:bg-gray-800" 
                  onClick={handleGuardarProductos}
                  disabled={productosSeleccionados.length === 0}
                >
                  Guardar Productos
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button 
          size="sm" 
          className="bg-green-600 hover:bg-green-700"
          onClick={() => onMarcarRealizada(cita.id)}
        >
          Marcar como Realizada
        </Button>
      </div>
    </div>
  );
}

export default function Citas() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState('2025-10-13');

  const serviciosDisponibles = [
    { id: 'manicura-basica', nombre: 'Manicura Básica', precio: 25000 },
    { id: 'manicura-gel', nombre: 'Manicura con Gel', precio: 35000 },
    { id: 'manicura-rusa', nombre: 'Manicura Rusa', precio: 45000 },
    { id: 'unas-artisticas', nombre: 'Uñas Artísticas', precio: 55000 },
    { id: 'pedicura-basica', nombre: 'Pedicura Básica', precio: 30000 },
    { id: 'pedicura-spa', nombre: 'Pedicura Spa', precio: 45000 },
    { id: 'pestanas-clasicas', nombre: 'Extensión de Pestañas Clásica', precio: 80000 },
    { id: 'pestanas-volumen', nombre: 'Extensión de Pestañas Volumen', precio: 120000 },
    { id: 'retoque-pestanas', nombre: 'Retoque de Pestañas', precio: 50000 },
    { id: 'lifting-pestanas', nombre: 'Lifting de Pestañas', precio: 60000 }
  ];

  // Productos del inventario para usar en citas
  const productosInventario = [
    { id: 1, nombre: 'Esmalte OPI Classic Red', cantidad: 12, categoria: 'esmaltes' },
    { id: 2, nombre: 'Gel Semipermanente CND Shellac', cantidad: 3, categoria: 'geles' },
    { id: 3, nombre: 'Lima de Uñas Professional', cantidad: 25, categoria: 'herramientas' },
    { id: 4, nombre: 'Acetona Pura 500ml', cantidad: 0, categoria: 'quimicos' },
    { id: 5, nombre: 'Pestañas Individuales Volumen', cantidad: 8, categoria: 'pestanas' },
    { id: 6, nombre: 'Pegamento para Pestañas Premium', cantidad: 2, categoria: 'pestanas' },
    { id: 7, nombre: 'Crema Hidratante para Cutículas', cantidad: 15, categoria: 'cuidado' },
    { id: 8, nombre: 'Decoraciones Strass Mix', cantidad: 50, categoria: 'decoraciones' }
  ];

  const citasPendientes = [
    {
      id: 'PEND-001',
      cliente: { nombre: 'Carolina Pérez', telefono: '+57 300 111 2222', email: 'carolina@email.com' },
      servicio: 'Manicura con Gel',
      fecha: '2025-10-15',
      hora: '10:00',
      costo: 35000,
      estado: 'sin-asignar'
    },
    {
      id: 'PEND-002',
      cliente: { nombre: 'Valentina Torres', telefono: '+57 300 333 4444', email: 'valentina@email.com' },
      servicio: 'Pestañas Volumen',
      fecha: '2025-10-16',
      hora: '14:00',
      costo: 120000,
      estado: 'sin-asignar'
    },
    {
      id: 'PEND-003',
      cliente: { nombre: 'Daniela Ruiz', telefono: '+57 300 555 6666', email: 'daniela@email.com' },
      servicio: 'Pedicura Spa',
      fecha: '2025-10-14',
      hora: '16:30',
      costo: 45000,
      estado: 'sin-asignar'
    }
  ];

  const citasProximas = [
    {
      id: 'CONF-001',
      cliente: { nombre: 'María Rodríguez', telefono: '+57 300 123 4567', email: 'maria.rodriguez@email.com' },
      servicio: 'Manicura + Gel',
      trabajadora: 'ibeth.renteria@jr.com',
      fecha: '2025-10-13',
      hora: '15:00',
      costo: 35000,
      estado: 'confirmada'
    },
    {
      id: 'CONF-002',
      cliente: { nombre: 'Ana García', telefono: '+57 300 234 5678', email: 'ana.garcia@email.com' },
      servicio: 'Extensión de Pestañas',
      trabajadora: 'maria.gonzalez@jr.com',
      fecha: '2025-10-14',
      hora: '11:00',
      costo: 80000,
      estado: 'confirmada'
    },
    {
      id: 'CONF-003',
      cliente: { nombre: 'Laura Martínez', telefono: '+57 300 345 6789', email: 'laura.martinez@email.com' },
      servicio: 'Uñas Artísticas',
      trabajadora: 'ana.lopez@jr.com',
      fecha: '2025-10-14',
      hora: '14:30',
      costo: 55000,
      estado: 'confirmada'
    }
  ];

  const citasHoy = [
    {
      id: 'HOY-001',
      cliente: { nombre: 'Sofía López', telefono: '+57 300 456 7890', email: 'sofia.lopez@email.com' },
      servicio: 'Manicura Rusa',
      trabajadora: 'ibeth.renteria@jr.com',
      fecha: '2025-10-13',
      hora: '09:30',
      costo: 45000,
      estado: 'en-progreso'
    },
    {
      id: 'HOY-002',
      cliente: { nombre: 'Carmen Torres', telefono: '+57 300 567 8901', email: 'carmen.torres@email.com' },
      servicio: 'Pedicura Básica',
      trabajadora: 'maria.gonzalez@jr.com',
      fecha: '2025-10-13',
      hora: '11:00',
      costo: 30000,
      estado: 'realizada'
    },
    {
      id: 'HOY-003',
      cliente: { nombre: 'Patricia Díaz', telefono: '+57 300 678 9012', email: 'patricia.diaz@email.com' },
      servicio: 'Lifting de Pestañas',
      trabajadora: 'ana.lopez@jr.com',
      fecha: '2025-10-13',
      hora: '13:00',
      costo: 60000,
      estado: 'confirmada'
    }
  ];

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'sin-asignar':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmada':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'en-progreso':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'realizada':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAsignarTrabajadora = (citaId: string, correo: string) => {
    if (!correo || !correo.includes('@')) {
      toast.error('Por favor ingresa un correo válido');
      return;
    }
    
    toast.success('Correo enviado a la trabajadora', {
      description: `Se envió la asignación a ${correo}. La trabajadora tiene 24 horas para confirmar.`
    });
  };

  const handleContactarCliente = (telefono: string, nombre: string) => {
    const whatsappUrl = `https://wa.me/${telefono.replace(/[^0-9]/g, '')}?text=Hola ${nombre}, te contactamos desde JR Studio de Belleza...`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEditarPrecio = (citaId: string, nuevoPrecio: number) => {
    console.log(`Editando precio de cita ${citaId} a ${nuevoPrecio}`);
  };

  const handleAgregarProductos = (citaId: string, productos: any[]) => {
    console.log(`Agregando productos a cita ${citaId}:`, productos);
  };

  const handleMarcarRealizada = (citaId: string) => {
    toast.success('Cita marcada como realizada', {
      description: 'Se actualizó el estado y se registró en el sistema de pagos.'
    });
  };

  const handleCrearCita = () => {
    toast.success('Cita creada exitosamente', {
      description: 'La nueva cita se agregó al sistema.'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Seleccionar Fecha</label>
          <Input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="w-44"
          />
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Nueva Cita
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Programar Nueva Cita</DialogTitle>
              <DialogDescription>
                Completa la información para crear una nueva cita en el sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre del Cliente</label>
                  <Input placeholder="Nombre completo" />
                </div>
                <div>
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input placeholder="+57 300 123 4567" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Email (opcional)</label>
                <Input placeholder="cliente@email.com" type="email" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Servicio</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar servicio" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviciosDisponibles.map((servicio) => (
                        <SelectItem key={servicio.id} value={servicio.id}>
                          {servicio.nombre} - {formatearPrecio(servicio.precio)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Costo Estimado</label>
                  <Input placeholder="35000" type="number" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium">Hora</label>
                  <Input type="time" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Correo de la Trabajadora (opcional)</label>
                <Input placeholder="trabajadora@email.com" type="email" />
                <p className="text-xs text-gray-500 mt-1">Si asignas una trabajadora, se enviará correo de confirmación automáticamente</p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-black hover:bg-gray-800" onClick={handleCrearCita}>
                  Crear Cita
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pendientes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pendientes">Citas Pendientes</TabsTrigger>
          <TabsTrigger value="proximas">Citas Próximas</TabsTrigger>
          <TabsTrigger value="hoy">Citas del Día</TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Citas Sin Asignar</span>
                <Badge variant="outline" className="bg-yellow-50">{citasPendientes.length} pendientes</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {citasPendientes.map((cita) => (
                  <CitaPendienteItem
                    key={cita.id}
                    cita={cita}
                    onAsignar={handleAsignarTrabajadora}
                    onContactar={handleContactarCliente}
                  />
                ))}

                {citasPendientes.length === 0 && (
                  <div className="text-center py-8">
                    <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                      No hay citas pendientes
                    </h3>
                    <p className="text-gray-600">
                      Todas las citas están asignadas a trabajadoras
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proximas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Citas Confirmadas y Asignadas</span>
                <Badge variant="outline" className="bg-green-50">{citasProximas.length} confirmadas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {citasProximas.map((cita) => (
                  <CitaProximaItem
                    key={cita.id}
                    cita={cita}
                    productosInventario={productosInventario}
                    onEditarPrecio={handleEditarPrecio}
                    onAgregarProductos={handleAgregarProductos}
                    onMarcarRealizada={handleMarcarRealizada}
                  />
                ))}

                {citasProximas.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                      No hay citas próximas
                    </h3>
                    <p className="text-gray-600">
                      Las citas confirmadas aparecerán aquí
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hoy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Citas de Hoy - {formatearFecha('2025-10-13')}</span>
                <Badge variant="outline" className="bg-blue-50">{citasHoy.length} citas</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {citasHoy.map((cita) => (
                  <div 
                    key={cita.id} 
                    className={`border rounded-lg p-4 ${cita.estado === 'realizada' ? 'bg-gray-50 opacity-75' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          cita.estado === 'realizada' 
                            ? 'bg-gray-200 text-gray-600' 
                            : cita.estado === 'en-progreso'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium">{cita.cliente.nombre}</h3>
                          <p className="text-sm text-gray-600">{cita.servicio}</p>
                          <p className="text-sm text-gray-500">Hora: {cita.hora}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">{formatearPrecio(cita.costo)}</p>
                        <Badge className={getEstadoColor(cita.estado)}>
                          {cita.estado === 'realizada' ? 'Realizada' : cita.estado === 'en-progreso' ? 'En Progreso' : 'Confirmada'}
                        </Badge>
                      </div>
                    </div>

                    <div className="bg-purple-50 p-3 rounded-lg mb-3">
                      <p className="text-sm font-medium text-purple-900">Trabajadora:</p>
                      <p className="text-sm text-purple-700">{cita.trabajadora}</p>
                    </div>

                    {cita.estado !== 'realizada' && (
                      <div className="flex justify-end space-x-2">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleMarcarRealizada(cita.id)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Marcar como Realizada
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {citasHoy.length === 0 && (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">
                      No hay citas para hoy
                    </h3>
                    <p className="text-gray-600">
                      Las citas del día aparecerán aquí
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
