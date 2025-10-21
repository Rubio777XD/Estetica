import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Package, AlertTriangle, Plus, Edit, Search, Filter, TrendingDown, Box } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function Inventario() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [dialogNuevoOpen, setDialogNuevoOpen] = useState(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [dialogStockOpen, setDialogStockOpen] = useState(false);
  const [productoEditando, setProductoEditando] = useState<any>(null);

  const productos = [
    {
      id: 1,
      nombre: 'Esmalte OPI Classic Red',
      categoria: 'esmaltes',
      tipo: 'esmalte tradicional',
      cantidad: 12,
      minimo: 5,
      maximo: 20,
      precioCompra: 18000,
      precioVenta: 25000,
      proveedor: 'Distribuidora Belleza',
      fechaVencimiento: '2026-08-15',
      ubicacion: 'Estante A-1',
      estado: 'disponible'
    },
    {
      id: 2,
      nombre: 'Gel Semipermanente CND Shellac',
      categoria: 'geles',
      tipo: 'gel semipermanente',
      cantidad: 3,
      minimo: 8,
      maximo: 15,
      precioCompra: 35000,
      precioVenta: 50000,
      proveedor: 'Professional Nails',
      fechaVencimiento: '2025-12-20',
      ubicacion: 'Refrigerador R-1',
      estado: 'agotandose'
    },
    {
      id: 3,
      nombre: 'Lima de Uñas Professional 180/240',
      categoria: 'herramientas',
      tipo: 'lima',
      cantidad: 25,
      minimo: 10,
      maximo: 30,
      precioCompra: 2500,
      precioVenta: 4000,
      proveedor: 'Herramientas Spa',
      fechaVencimiento: null,
      ubicacion: 'Cajón H-2',
      estado: 'disponible'
    },
    {
      id: 4,
      nombre: 'Acetona Pura 500ml',
      categoria: 'quimicos',
      tipo: 'removedor',
      cantidad: 0,
      minimo: 6,
      maximo: 12,
      precioCompra: 8000,
      precioVenta: 12000,
      proveedor: 'Químicos Industriales',
      fechaVencimiento: '2025-10-30',
      ubicacion: 'Almacén Q-1',
      estado: 'agotado'
    },
    {
      id: 5,
      nombre: 'Pestañas Individuales Volumen 0.07',
      categoria: 'pestanas',
      tipo: 'extensiones',
      cantidad: 8,
      minimo: 5,
      maximo: 15,
      precioCompra: 45000,
      precioVenta: 65000,
      proveedor: 'Lash Beauty Supply',
      fechaVencimiento: null,
      ubicacion: 'Vitrina P-1',
      estado: 'disponible'
    },
    {
      id: 6,
      nombre: 'Pegamento para Pestañas Premium',
      categoria: 'pestanas',
      tipo: 'adhesivo',
      cantidad: 2,
      minimo: 4,
      maximo: 8,
      precioCompra: 32000,
      precioVenta: 48000,
      proveedor: 'Lash Beauty Supply',
      fechaVencimiento: '2025-11-15',
      ubicacion: 'Refrigerador R-2',
      estado: 'agotandose'
    },
    {
      id: 7,
      nombre: 'Crema Hidratante para Cutículas',
      categoria: 'cuidado',
      tipo: 'tratamiento',
      cantidad: 15,
      minimo: 8,
      maximo: 20,
      precioCompra: 12000,
      precioVenta: 18000,
      proveedor: 'Cosméticos Natural',
      fechaVencimiento: '2026-03-10',
      ubicacion: 'Estante C-1',
      estado: 'disponible'
    },
    {
      id: 8,
      nombre: 'Decoraciones de Uñas Strass Mix',
      categoria: 'decoraciones',
      tipo: 'adorno',
      cantidad: 50,
      minimo: 20,
      maximo: 100,
      precioCompra: 500,
      precioVenta: 1000,
      proveedor: 'Arte y Belleza',
      fechaVencimiento: null,
      ubicacion: 'Cajón D-1',
      estado: 'disponible'
    }
  ];

  const categorias = [
    { id: 'todos', nombre: 'Todas las Categorías' },
    { id: 'esmaltes', nombre: 'Esmaltes' },
    { id: 'geles', nombre: 'Geles' },
    { id: 'herramientas', nombre: 'Herramientas' },
    { id: 'quimicos', nombre: 'Químicos' },
    { id: 'pestanas', nombre: 'Pestañas' },
    { id: 'cuidado', nombre: 'Cuidado' },
    { id: 'decoraciones', nombre: 'Decoraciones' }
  ];

  const estadisticas = {
    totalProductos: productos.length,
    agotados: productos.filter(p => p.estado === 'agotado').length,
    agotandose: productos.filter(p => p.estado === 'agotandose').length,
    valorInventario: productos.reduce((acc, p) => acc + (p.cantidad * p.precioCompra), 0)
  };

  const productosFiltrados = productos.filter(producto => {
    const coincideBusqueda = 
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
      producto.proveedor.toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideCategoria = filtroCategoria === 'todos' || producto.categoria === filtroCategoria;
    const coincideEstado = filtroEstado === 'todos' || producto.estado === filtroEstado;
    
    return coincideBusqueda && coincideCategoria && coincideEstado;
  });

  const formatearPrecio = (precio: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  };

  const formatearFecha = (fecha: string | null) => {
    if (!fecha) return 'No aplica';
    return new Date(fecha).toLocaleDateString('es-CO');
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'disponible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'agotandose':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'agotado':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstadoIcon = (producto: any) => {
    if (producto.cantidad === 0) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (producto.cantidad <= producto.minimo) return <TrendingDown className="h-4 w-4 text-yellow-500" />;
    return <Package className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold">{estadisticas.totalProductos}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Productos Agotados</p>
                <p className="text-2xl font-bold text-red-600">{estadisticas.agotados}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-600">{estadisticas.agotandose}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controles y Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
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

          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="disponible">Disponible</SelectItem>
              <SelectItem value="agotandose">Stock Bajo</SelectItem>
              <SelectItem value="agotado">Agotado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogNuevoOpen} onOpenChange={setDialogNuevoOpen}>
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Producto</DialogTitle>
              <DialogDescription>
                Registra un nuevo producto en el inventario del salón
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nombre del Producto</label>
                <Input placeholder="Ej: Esmalte OPI Red" />
              </div>
              <div>
                <label className="text-sm font-medium">Categoría</label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.slice(1).map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        {categoria.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Tipo de Material</label>
                <Input placeholder="Ej: Esmalte tradicional" />
              </div>
              <div>
                <label className="text-sm font-medium">Proveedor</label>
                <Input placeholder="Nombre del proveedor" />
              </div>
              <div>
                <label className="text-sm font-medium">Cantidad Inicial</label>
                <Input placeholder="0" type="number" />
              </div>
              <div>
                <label className="text-sm font-medium">Stock Mínimo</label>
                <Input placeholder="5" type="number" />
              </div>
              <div>
                <label className="text-sm font-medium">Precio de Compra</label>
                <Input placeholder="15000" type="number" />
              </div>
              <div>
                <label className="text-sm font-medium">Precio de Venta</label>
                <Input placeholder="25000" type="number" />
              </div>
              <div>
                <label className="text-sm font-medium">Ubicación</label>
                <Input placeholder="Ej: Estante A-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de Vencimiento</label>
                <Input type="date" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Notas</label>
                <Textarea placeholder="Notas adicionales sobre el producto..." />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setDialogNuevoOpen(false)}>Cancelar</Button>
              <Button 
                className="bg-black hover:bg-gray-800"
                onClick={() => {
                  toast.success('Producto agregado al inventario');
                  setDialogNuevoOpen(false);
                }}
              >
                Guardar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar producto */}
        <Dialog open={dialogEditarOpen} onOpenChange={setDialogEditarOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
              <DialogDescription>
                Actualiza la información del producto seleccionado
              </DialogDescription>
            </DialogHeader>
            {productoEditando && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nombre del Producto</label>
                  <Input defaultValue={productoEditando.nombre} />
                </div>
                <div>
                  <label className="text-sm font-medium">Stock Mínimo</label>
                  <Input defaultValue={productoEditando.minimo} type="number" />
                </div>
                <div>
                  <label className="text-sm font-medium">Precio de Compra</label>
                  <Input defaultValue={productoEditando.precioCompra} type="number" />
                </div>
                <div>
                  <label className="text-sm font-medium">Precio de Venta</label>
                  <Input defaultValue={productoEditando.precioVenta} type="number" />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Proveedor</label>
                  <Input defaultValue={productoEditando.proveedor} />
                </div>
                <div className="col-span-2 flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogEditarOpen(false)}>Cancelar</Button>
                  <Button 
                    className="bg-black hover:bg-gray-800"
                    onClick={() => {
                      toast.success('Producto actualizado exitosamente');
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

        {/* Dialog para agregar stock */}
        <Dialog open={dialogStockOpen} onOpenChange={setDialogStockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Stock</DialogTitle>
              <DialogDescription>
                Incrementa la cantidad disponible del producto
              </DialogDescription>
            </DialogHeader>
            {productoEditando && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Producto</label>
                  <p className="text-sm text-gray-600">{productoEditando.nombre}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Stock Actual</label>
                  <p className="text-sm font-semibold">{productoEditando.cantidad} unidades</p>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-2">Cantidad a Agregar</label>
                  <Input type="number" placeholder="0" min="1" />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogStockOpen(false)}>Cancelar</Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      toast.success('Stock actualizado exitosamente');
                      setDialogStockOpen(false);
                    }}
                  >
                    Agregar Stock
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de Stock */}
      {(estadisticas.agotados > 0 || estadisticas.agotandose > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Atención requerida en inventario</p>
                <p className="text-sm text-yellow-700">
                  {estadisticas.agotados > 0 && `${estadisticas.agotados} productos agotados`}
                  {estadisticas.agotados > 0 && estadisticas.agotandose > 0 && ', '}
                  {estadisticas.agotandose > 0 && `${estadisticas.agotandose} productos con stock bajo`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Inventario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Inventario de Productos</span>
            <Badge variant="outline">{productosFiltrados.length} productos</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precios</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosFiltrados.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        {getEstadoIcon(producto)}
                        <div>
                          <p className="font-medium">{producto.nombre}</p>
                          <p className="text-sm text-gray-600">{producto.tipo}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {producto.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{producto.cantidad} unidades</p>
                        <p className="text-xs text-gray-500">
                          Mín: {producto.minimo} | Máx: {producto.maximo}
                        </p>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${
                              producto.cantidad <= producto.minimo 
                                ? 'bg-red-500' 
                                : producto.cantidad <= producto.minimo * 1.5 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min((producto.cantidad / producto.maximo) * 100, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="text-gray-600">Compra:</span> {formatearPrecio(producto.precioCompra)}
                        </p>
                        <p className="text-sm">
                          <span className="text-gray-600">Venta:</span> {formatearPrecio(producto.precioVenta)}
                        </p>
                        <p className="text-xs text-green-600">
                          Margen: {Math.round(((producto.precioVenta - producto.precioCompra) / producto.precioCompra) * 100)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{producto.proveedor}</TableCell>
                    <TableCell className="text-sm">{producto.ubicacion}</TableCell>
                    <TableCell className="text-sm">
                      {formatearFecha(producto.fechaVencimiento)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(producto.estado)}>
                        {producto.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setProductoEditando(producto);
                            setDialogEditarOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setProductoEditando(producto);
                            setDialogStockOpen(true);
                          }}
                        >
                          +Stock
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {productosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
              <p className="text-gray-600">Intenta con diferentes términos de búsqueda o filtros.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}