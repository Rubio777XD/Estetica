import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Scissors, Clock, DollarSign, Plus, Edit, Search, Filter } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function Servicios() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todos');
  const [dialogNuevoOpen, setDialogNuevoOpen] = useState(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<any>(null);

  const servicios = [
    {
      id: 1,
      nombre: 'Manicura Básica',
      categoria: 'manicura',
      precio: 25000,
      duracion: 45,
      descripcion: 'Limpieza, corte, limado y esmaltado básico',
      popular: true,
      activo: true
    },
    {
      id: 2,
      nombre: 'Manicura con Gel',
      categoria: 'manicura',
      precio: 35000,
      duracion: 60,
      descripcion: 'Manicura completa con aplicación de gel semipermanente',
      popular: true,
      activo: true
    },
    {
      id: 3,
      nombre: 'Manicura Rusa',
      categoria: 'manicura',
      precio: 45000,
      duracion: 90,
      descripcion: 'Técnica especializada con fresa para cutículas perfectas',
      popular: false,
      activo: true
    },
    {
      id: 4,
      nombre: 'Uñas Artísticas',
      categoria: 'arte',
      precio: 55000,
      duracion: 120,
      descripcion: 'Diseños personalizados con técnicas avanzadas',
      popular: true,
      activo: true
    },
    {
      id: 5,
      nombre: 'Pedicura Básica',
      categoria: 'pedicura',
      precio: 30000,
      duracion: 60,
      descripcion: 'Limpieza, exfoliación y esmaltado de pies',
      popular: true,
      activo: true
    },
    {
      id: 6,
      nombre: 'Pedicura Spa',
      categoria: 'pedicura',
      precio: 45000,
      duracion: 90,
      descripcion: 'Tratamiento completo con mascarilla y masaje relajante',
      popular: false,
      activo: true
    },
    {
      id: 7,
      nombre: 'Extensión de Pestañas Clásica',
      categoria: 'pestanas',
      precio: 80000,
      duracion: 120,
      descripción: 'Extensiones clásicas 1:1 para look natural',
      popular: true,
      activo: true
    },
    {
      id: 8,
      nombre: 'Extensión de Pestañas Volumen',
      categoria: 'pestanas',
      precio: 120000,
      duracion: 150,
      descripcion: 'Técnica de volumen para pestañas más densas',
      popular: false,
      activo: true
    },
    {
      id: 9,
      nombre: 'Retoque de Pestañas',
      categoria: 'pestanas',
      precio: 50000,
      duracion: 90,
      descripcion: 'Mantenimiento y retoque de extensiones existentes',
      popular: true,
      activo: true
    },
    {
      id: 10,
      nombre: 'Lifting de Pestañas',
      categoria: 'pestanas',
      precio: 60000,
      duracion: 75,
      descripcion: 'Curvado natural de pestañas con tratamiento nutritivo',
      popular: false,
      activo: true
    }
  ];

  const categorias = [
    { id: 'todos', nombre: 'Todos los Servicios' },
    { id: 'manicura', nombre: 'Manicura' },
    { id: 'pedicura', nombre: 'Pedicura' },
    { id: 'pestanas', nombre: 'Pestañas' },
    { id: 'arte', nombre: 'Arte en Uñas' }
  ];

  const serviciosFiltrados = servicios.filter(servicio => {
    const coincideBusqueda = servicio.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'todos' || servicio.categoria === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  const formatearDuracion = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    if (horas > 0) {
      return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
    }
    return `${mins}min`;
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'manicura':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'pedicura':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pestanas':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'arte':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles Superiores */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar servicios..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((categoria) => (
                <SelectItem key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogNuevoOpen} onOpenChange={setDialogNuevoOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Servicio</DialogTitle>
              <DialogDescription>
                Crea un nuevo servicio en el catálogo del salón
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre del Servicio</label>
                <Input placeholder="Ej: Manicura Premium" />
              </div>
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manicura">Manicura</SelectItem>
                    <SelectItem value="pedicura">Pedicura</SelectItem>
                    <SelectItem value="pestanas">Pestañas</SelectItem>
                    <SelectItem value="arte">Arte en Uñas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Precio</label>
                  <Input placeholder="25000" type="number" />
                </div>
                <div>
                  <label className="text-sm font-medium">Duración (min)</label>
                  <Input placeholder="60" type="number" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea placeholder="Descripción del servicio..." />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setDialogNuevoOpen(false)}>Cancelar</Button>
                <Button 
                  className="bg-black hover:bg-gray-800"
                  onClick={() => {
                    toast.success('Servicio creado exitosamente');
                    setDialogNuevoOpen(false);
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar servicio */}
        <Dialog open={dialogEditarOpen} onOpenChange={setDialogEditarOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Servicio</DialogTitle>
              <DialogDescription>
                Modifica la información del servicio seleccionado
              </DialogDescription>
            </DialogHeader>
            {servicioEditando && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nombre del Servicio</label>
                  <Input defaultValue={servicioEditando.nombre} />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Select defaultValue={servicioEditando.categoria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manicura">Manicura</SelectItem>
                      <SelectItem value="pedicura">Pedicura</SelectItem>
                      <SelectItem value="pestanas">Pestañas</SelectItem>
                      <SelectItem value="arte">Arte en Uñas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Precio</label>
                    <Input defaultValue={servicioEditando.precio} type="number" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duración (min)</label>
                    <Input defaultValue={servicioEditando.duracion} type="number" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea defaultValue={servicioEditando.descripcion} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogEditarOpen(false)}>Cancelar</Button>
                  <Button 
                    className="bg-black hover:bg-gray-800"
                    onClick={() => {
                      toast.success('Servicio actualizado exitosamente');
                      setDialogEditarOpen(false);
                    }}
                  >
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Servicios</p>
                <p className="text-2xl font-bold">{servicios.length}</p>
              </div>
              <Scissors className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Precio Promedio</p>
                <p className="text-2xl font-bold">
                  {formatearPrecio(servicios.reduce((acc, s) => acc + s.precio, 0) / servicios.length)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Servicios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {serviciosFiltrados.map((servicio) => (
          <Card key={servicio.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{servicio.nombre}</h3>
                    {servicio.popular && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <Badge className={getCategoriaColor(servicio.categoria)}>
                    {categorias.find(c => c.id === servicio.categoria)?.nombre}
                  </Badge>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                {servicio.descripcion}
              </p>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span className="font-semibold text-lg text-black">
                      {formatearPrecio(servicio.precio)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatearDuracion(servicio.duracion)}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <Badge variant={servicio.activo ? "default" : "secondary"}>
                    {servicio.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="bg-black hover:bg-gray-800">
                      Agendar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {serviciosFiltrados.length === 0 && (
        <div className="text-center py-12">
          <Scissors className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron servicios</h3>
          <p className="text-gray-600">Intenta con diferentes términos de búsqueda o filtros.</p>
        </div>
      )}
    </div>
  );
}