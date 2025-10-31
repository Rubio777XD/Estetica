import { useMemo, useState } from 'react';
import { Plus, Edit, Scissors, Clock, DollarSign, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

import { apiFetch, ApiError } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { invalidateQuery, setQueryData, useApiQuery } from '../lib/data-store';
import type { Service, ServicesResponse } from '../types/api';

const SERVICES_KEY = 'services';

type ServiceFormState = {
  name: string;
  price: string;
  duration: string;
};

const EMPTY_FORM: ServiceFormState = {
  name: '',
  price: '',
  duration: '',
};

function createFormFromService(service: Service): ServiceFormState {
  return {
    name: service.name,
    price: String(service.price),
    duration: String(service.duration),
  };
}

export default function Servicios() {
  const [busqueda, setBusqueda] = useState('');
  const [dialogNuevoOpen, setDialogNuevoOpen] = useState(false);
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false);
  const [servicioEditando, setServicioEditando] = useState<Service | null>(null);
  const [formState, setFormState] = useState<ServiceFormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services = [], status, error, refetch } = useApiQuery<Service[]>(
    SERVICES_KEY,
    async () => {
      const response = await apiFetch<ServicesResponse>('/api/services');
      return response.services;
    }
  );

  const serviciosFiltrados = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    if (!query) {
      return services;
    }
    return services.filter((servicio) => servicio.name.toLowerCase().includes(query));
  }, [busqueda, services]);

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setServicioEditando(null);
  };

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      name: formState.name.trim(),
      price: Number(formState.price),
      duration: Number(formState.duration),
    };

    const optimisticId = `temp-${Date.now()}`;
    const optimisticService: Service = {
      id: optimisticId,
      name: payload.name,
      price: payload.price,
      duration: payload.duration,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQueryData<Service[]>(SERVICES_KEY, (prev = []) => [...prev, optimisticService]);

    try {
      const { service } = await apiFetch<{ service: Service }>('/api/services', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setQueryData<Service[]>(SERVICES_KEY, (prev = []) =>
        prev.map((item) => (item.id === optimisticId ? service : item))
      );
      toast.success('Servicio creado correctamente');
      setDialogNuevoOpen(false);
      resetForm();
    } catch (err) {
      setQueryData<Service[]>(SERVICES_KEY, (prev = []) => prev.filter((item) => item.id !== optimisticId));
      toast.error(err instanceof ApiError ? err.message : 'No fue posible crear el servicio');
    } finally {
      setIsSubmitting(false);
      invalidateQuery(['services', 'stats-overview']);
    }
  };

  const handleUpdate = async () => {
    if (!servicioEditando || isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      name: formState.name.trim(),
      price: Number(formState.price),
      duration: Number(formState.duration),
    };

    const previous = services.find((item) => item.id === servicioEditando.id);
    setQueryData<Service[]>(SERVICES_KEY, (prev = []) =>
      prev.map((item) =>
        item.id === servicioEditando.id
          ? { ...item, ...payload, updatedAt: new Date().toISOString() }
          : item
      )
    );

    try {
      const { service } = await apiFetch<{ service: Service }>(`/api/services/${servicioEditando.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setQueryData<Service[]>(SERVICES_KEY, (prev = []) =>
        prev.map((item) => (item.id === service.id ? service : item))
      );
      toast.success('Servicio actualizado');
      setDialogEditarOpen(false);
      resetForm();
    } catch (err) {
      if (previous) {
        setQueryData<Service[]>(SERVICES_KEY, (prev = []) =>
          prev.map((item) => (item.id === previous.id ? previous : item))
        );
      }
      toast.error(err instanceof ApiError ? err.message : 'No fue posible actualizar el servicio');
    } finally {
      setIsSubmitting(false);
      invalidateQuery(['services', 'stats-overview']);
    }
  };

  const handleDelete = async (service: Service) => {
    const previous = services;
    setQueryData<Service[]>(SERVICES_KEY, (prev = []) => prev.filter((item) => item.id !== service.id));
    try {
      await apiFetch(`/api/services/${service.id}`, { method: 'DELETE' });
      toast.success('Servicio eliminado');
    } catch (err) {
      setQueryData<Service[]>(SERVICES_KEY, () => previous);
      toast.error(err instanceof ApiError ? err.message : 'No fue posible eliminar el servicio');
    } finally {
      invalidateQuery(['services', 'stats-overview']);
    }
  };

  const openEditDialog = (service: Service) => {
    setServicioEditando(service);
    setFormState(createFormFromService(service));
    setDialogEditarOpen(true);
  };

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'No fue posible cargar los servicios.'}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (serviciosFiltrados.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <Scissors className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay servicios registrados</p>
            <p className="text-sm text-gray-500">Agrega un nuevo servicio para comenzar</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {serviciosFiltrados.map((servicio) => (
          <Card key={servicio.id} className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start justify-between text-lg">
                <div>
                  <div className="flex items-center space-x-2">
                    <Scissors className="h-4 w-4 text-gray-500" />
                    <span>{servicio.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Creado el {new Date(servicio.createdAt).toLocaleDateString('es-MX')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(servicio)} aria-label="Editar servicio">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(servicio)}
                    aria-label="Eliminar servicio"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span>{formatCurrency(servicio.price)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{servicio.duration} min</span>
              </div>
              <Badge variant="outline" className="bg-gray-50 text-gray-700">
                ID: {servicio.id.slice(0, 8)}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const isFormValid = formState.name.trim().length > 0 && Number(formState.price) > 0 && Number(formState.duration) >= 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Buscar servicios por nombre"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            aria-label="Buscar servicios"
          />
        </div>
        <Dialog
          open={dialogNuevoOpen}
          onOpenChange={(open) => {
            setDialogNuevoOpen(open);
            if (!open) {
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-black hover:bg-gray-900">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo servicio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar servicio</DialogTitle>
              <DialogDescription>Completa los detalles del servicio para que esté disponible en el sistema.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">Nombre</Label>
                <Input
                  id="service-name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))
}
                  placeholder="Corte + Manicure"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="service-price">Precio</Label>
                  <Input
                    id="service-price"
                    type="number"
                    min="0"
                    step="10"
                    value={formState.price}
                    onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                    placeholder="450"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service-duration">Duración (minutos)</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    min="5"
                    max="480"
                    value={formState.duration}
                    onChange={(event) => setFormState((prev) => ({ ...prev, duration: event.target.value }))}
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogNuevoOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={!isFormValid || isSubmitting}>
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog
        open={dialogEditarOpen}
        onOpenChange={(open) => {
          setDialogEditarOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar servicio</DialogTitle>
            <DialogDescription>Actualiza la información del servicio seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-service-name">Nombre</Label>
              <Input
                id="edit-service-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-service-price">Precio</Label>
                <Input
                  id="edit-service-price"
                  type="number"
                  min="0"
                  step="10"
                  value={formState.price}
                  onChange={(event) => setFormState((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-service-duration">Duración (minutos)</Label>
                <Input
                  id="edit-service-duration"
                  type="number"
                  min="5"
                  max="480"
                  value={formState.duration}
                  onChange={(event) => setFormState((prev) => ({ ...prev, duration: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogEditarOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={!isFormValid || isSubmitting}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {renderContent()}
    </div>
  );
}
