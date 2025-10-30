import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './ui/dialog';
import { DollarSign, Users, Edit2, Download, TrendingUp } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function Pagos() {
  const [filtroDias, setFiltroDias] = useState('7');
  const [comisionEditable, setComisionEditable] = useState<{ [key: string]: number }>({});

  const especialistas = [
    { nombre: 'Ibeth Renteria', comision: 60, correo: 'ibeth.renteria@jr.com' },
    { nombre: 'María González', comision: 55, correo: 'maria.gonzalez@jr.com' },
    { nombre: 'Ana López', comision: 65, correo: 'ana.lopez@jr.com' }
  ];

  const pagos = [
    {
      id: 'PAG-001',
      cliente: 'María Rodríguez',
      servicio: 'Manicura + Gel',
      monto: 35000,
      especialista: 'ibeth.renteria@jr.com',
      fecha: '2025-10-12',
      productosUsados: []
    },
    {
      id: 'PAG-002',
      cliente: 'Ana García',
      servicio: 'Extensión de Pestañas',
      monto: 80000,
      especialista: 'maria.gonzalez@jr.com',
      fecha: '2025-10-11',
      productosUsados: ['Pestañas 0.07', 'Pegamento Premium']
    },
    {
      id: 'PAG-003',
      cliente: 'Laura Martínez',
      servicio: 'Pedicura Spa',
      monto: 45000,
      especialista: 'ibeth.renteria@jr.com',
      fecha: '2025-10-10',
      productosUsados: []
    },
    {
      id: 'PAG-004',
      cliente: 'Sofia López',
      servicio: 'Uñas Artísticas',
      monto: 55000,
      especialista: 'ana.lopez@jr.com',
      fecha: '2025-10-09',
      productosUsados: ['Strass Mix', 'Gel de Color']
    },
    {
      id: 'PAG-005',
      cliente: 'Carmen Torres',
      servicio: 'Manicura Rusa',
      monto: 45000,
      especialista: 'ibeth.renteria@jr.com',
      fecha: '2025-10-08',
      productosUsados: []
    },
    {
      id: 'PAG-006',
      cliente: 'Patricia Díaz',
      servicio: 'Lifting de Pestañas',
      monto: 60000,
      especialista: 'ana.lopez@jr.com',
      fecha: '2025-10-07',
      productosUsados: []
    }
  ];

  // Calcular comisiones
  const getComisionPorcentaje = (especialistaCorreo: string, pagoId: string) => {
    if (comisionEditable[pagoId]) {
      return comisionEditable[pagoId];
    }
    const especialista = especialistas.find(e => e.correo === especialistaCorreo);
    return especialista?.comision || 50;
  };

  const calcularComision = (pago: any) => {
    const porcentaje = getComisionPorcentaje(pago.especialista, pago.id);
    return Math.round(pago.monto * (porcentaje / 100));
  };

  const calcularGananciaEmpresa = (pago: any) => {
    const comision = calcularComision(pago);
    return pago.monto - comision;
  };

  // Filtrar pagos por días
  const pagosFiltrados = pagos.filter(pago => {
    const fechaPago = new Date(pago.fecha);
    const hoy = new Date('2025-10-13');
    const diasAtras = parseInt(filtroDias);
    const fechaLimite = new Date(hoy);
    fechaLimite.setDate(hoy.getDate() - diasAtras);
    
    return fechaPago >= fechaLimite;
  });

  const estadisticas = {
    ingresosTotales: pagosFiltrados.reduce((acc, p) => acc + p.monto, 0),
    comisionesTotales: pagosFiltrados.reduce((acc, p) => acc + calcularComision(p), 0)
  };

  estadisticas['gananciaEmpresa'] = estadisticas.ingresosTotales - estadisticas.comisionesTotales;

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
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditarComision = (pagoId: string, nuevaComision: number) => {
    setComisionEditable({ ...comisionEditable, [pagoId]: nuevaComision });
    toast.success('Comisión actualizada', {
      description: `Se recalculó la distribución con ${nuevaComision}% de comisión.`
    });
  };

  const getNombreEspecialista = (correo: string) => {
    const especialista = especialistas.find(e => e.correo === correo);
    return especialista?.nombre || correo;
  };

  const handleExportar = () => {
    toast.success('Exportando datos', {
      description: 'Se está generando el archivo de exportación...'
    });
  };

  return (
    <div className="space-y-6">
      {/* Controles de Filtro */}
      <div className="flex justify-between items-center">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Filtrar por período</label>
          <Select value={filtroDias} onValueChange={setFiltroDias}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleExportar}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Datos
        </Button>
      </div>

      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Totales</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatearPrecio(estadisticas.ingresosTotales)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Últimos {filtroDias} días</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Comisiones a Pagar</p>
                <p className="text-3xl font-bold text-orange-600">
                  {formatearPrecio(estadisticas.comisionesTotales)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Ganancia empresa: {formatearPrecio(estadisticas.gananciaEmpresa)}
                </p>
              </div>
              <Users className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Resumen Financiero</p>
              <p className="text-sm text-blue-700 mt-1">
                De los <span className="font-semibold">{formatearPrecio(estadisticas.ingresosTotales)}</span> en ingresos, 
                las trabajadoras reciben <span className="font-semibold">{formatearPrecio(estadisticas.comisionesTotales)}</span> ({Math.round((estadisticas.comisionesTotales / estadisticas.ingresosTotales) * 100)}%) 
                y la empresa retiene <span className="font-semibold">{formatearPrecio(estadisticas.gananciaEmpresa)}</span> ({Math.round((estadisticas.gananciaEmpresa / estadisticas.ingresosTotales) * 100)}%).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla Detallada de Pagos y Comisiones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Detalle de Pagos y Comisiones</span>
            <Badge variant="outline">{pagosFiltrados.length} transacciones</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Cita</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Trabajadora</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Costo Total</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagosFiltrados.map((pago) => {
                  const comisionPorcentaje = getComisionPorcentaje(pago.especialista, pago.id);
                  const comisionMonto = calcularComision(pago);
                  const empresaMonto = calcularGananciaEmpresa(pago);

                  return (
                    <TableRow key={pago.id}>
                      <TableCell className="font-medium">{pago.id}</TableCell>
                      <TableCell>{pago.cliente}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{getNombreEspecialista(pago.especialista)}</p>
                          <p className="text-xs text-gray-500">{pago.especialista}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{pago.servicio}</p>
                          {pago.productosUsados.length > 0 && (
                            <p className="text-xs text-gray-500">
                              +{pago.productosUsados.length} productos
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold">{formatearPrecio(pago.monto)}</p>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-orange-600">
                            {formatearPrecio(comisionMonto)}
                          </p>
                          <p className="text-xs text-gray-500">{comisionPorcentaje}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-blue-600">
                            {formatearPrecio(empresaMonto)}
                          </p>
                          <p className="text-xs text-gray-500">{100 - comisionPorcentaje}%</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatearFecha(pago.fecha)}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Edit2 className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Comisión - {pago.id}</DialogTitle>
                              <DialogDescription>
                                Ajusta el porcentaje de comisión para esta transacción
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium">Cliente</label>
                                <p className="text-sm text-gray-600">{pago.cliente}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Servicio</label>
                                <p className="text-sm text-gray-600">{pago.servicio}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">Costo Total</label>
                                <p className="text-sm font-semibold">{formatearPrecio(pago.monto)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium block mb-2">
                                  Porcentaje de Comisión (%)
                                </label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  defaultValue={comisionPorcentaje}
                                  onChange={(e) => {
                                    const nuevoValor = parseInt(e.target.value);
                                    if (nuevoValor >= 0 && nuevoValor <= 100) {
                                      handleEditarComision(pago.id, nuevoValor);
                                    }
                                  }}
                                />
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm">Comisión trabajadora:</span>
                                  <span className="font-semibold text-orange-600">
                                    {formatearPrecio(calcularComision(pago))}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Para la empresa:</span>
                                  <span className="font-semibold text-blue-600">
                                    {formatearPrecio(calcularGananciaEmpresa(pago))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {pagosFiltrados.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No hay pagos en este período</h3>
              <p className="text-gray-600">Selecciona un rango de fechas diferente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
