import { useMemo, useState } from 'react';
import { Package, AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';

import { apiFetch, ApiError } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { invalidateQuery, setQueryData, useApiQuery } from '../lib/data-store';
import type { Product, ProductsResponse } from '../types/api';

const PRODUCTS_KEY = 'products';

type ProductFormState = {
  name: string;
  price: string;
  stock: string;
  lowStockThreshold: string;
};

const EMPTY_FORM: ProductFormState = {
  name: '',
  price: '',
  stock: '',
  lowStockThreshold: '0',
};

export default function Inventario() {
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(EMPTY_FORM);
  const [productEditing, setProductEditing] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: products = [], status, error, refetch } = useApiQuery<Product[]>(
    PRODUCTS_KEY,
    async () => {
      const response = await apiFetch<ProductsResponse>('/api/products');
      return response.products;
    }
  );

  const lowStockProducts = useMemo(() => products.filter((product) => product.stock <= product.lowStockThreshold), [products]);
  const productosMostrados = showLowStockOnly ? lowStockProducts : products;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setProductEditing(null);
  };

  const handleCreateProduct = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
    };

    const optimisticId = `temp-${Date.now()}`;
    const optimisticProduct: Product = {
      id: optimisticId,
      name: payload.name,
      price: payload.price,
      stock: payload.stock,
      lowStockThreshold: payload.lowStockThreshold,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) => [...prev, optimisticProduct]);

    try {
      const { product } = await apiFetch<{ product: Product }>('/api/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) => prev.map((item) => (item.id === optimisticId ? product : item)));
      toast.success('Producto agregado');
      setDialogOpen(false);
      resetForm();
    } catch (err) {
      setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) => prev.filter((item) => item.id !== optimisticId));
      toast.error(err instanceof ApiError ? err.message : 'No fue posible crear el producto');
    } finally {
      setIsSubmitting(false);
      invalidateQuery([PRODUCTS_KEY, 'stats-overview']);
    }
  };

  const handleUpdateProduct = async () => {
    if (!productEditing || isSubmitting) return;
    setIsSubmitting(true);
    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
      lowStockThreshold: Number(form.lowStockThreshold),
    };

    const previous = productEditing;
    setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) =>
      prev.map((item) => (item.id === productEditing.id ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item))
    );

    try {
      const { product } = await apiFetch<{ product: Product }>(`/api/products/${productEditing.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) => prev.map((item) => (item.id === product.id ? product : item)));
      toast.success('Producto actualizado');
      setEditDialogOpen(false);
      resetForm();
    } catch (err) {
      setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) => prev.map((item) => (item.id === previous.id ? previous : item)));
      toast.error(err instanceof ApiError ? err.message : 'No fue posible actualizar el producto');
    } finally {
      setIsSubmitting(false);
      invalidateQuery([PRODUCTS_KEY, 'stats-overview']);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const previous = products;
    setQueryData<Product[]>(PRODUCTS_KEY, (prev = []) => prev.filter((item) => item.id !== product.id));
    try {
      await apiFetch(`/api/products/${product.id}`, { method: 'DELETE' });
      toast.success('Producto eliminado');
    } catch (err) {
      setQueryData<Product[]>(PRODUCTS_KEY, () => previous);
      toast.error(err instanceof ApiError ? err.message : 'No fue posible eliminar el producto');
    } finally {
      invalidateQuery([PRODUCTS_KEY, 'stats-overview']);
    }
  };

  const openEditDialog = (product: Product) => {
    setProductEditing(product);
    setForm({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
    });
    setEditDialogOpen(true);
  };

  const isFormValid =
    form.name.trim().length > 0 &&
    Number(form.price) >= 0 &&
    Number(form.stock) >= 0 &&
    Number(form.lowStockThreshold) >= 0;

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'No fue posible cargar el inventario.'}</p>
          <Button variant="outline" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      );
    }

    if (productosMostrados.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center border border-dashed rounded-lg p-10 text-center space-y-4">
          <Package className="h-10 w-10 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">No hay productos en el inventario</p>
            <p className="text-sm text-gray-500">Agrega un nuevo producto para empezar.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-table-wrapper">
        <table className="dashboard-table divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Umbral</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actualizado</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productosMostrados.map((product) => {
              const isLowStock = product.stock <= product.lowStockThreshold;
              return (
                <tr key={product.id} className={isLowStock ? 'bg-red-50/60' : undefined}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatCurrency(product.price)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className={isLowStock ? 'font-semibold text-red-600' : ''}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{product.lowStockThreshold}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(product.updatedAt).toLocaleDateString('es-MX')}</td>
                  <td className="px-4 py-3 text-sm text-right space-x-2">
                    <Button variant="outline" size="icon" onClick={() => openEditDialog(product)} aria-label="Editar producto">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteProduct(product)}
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="dashboard-page">
      <Card className="shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={showLowStockOnly ? 'default' : 'outline'}
                  onClick={() => setShowLowStockOnly((prev) => !prev)}
                  className={`${showLowStockOnly ? 'bg-black text-white' : ''} whitespace-nowrap`}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {showLowStockOnly ? 'Ver todo el inventario' : 'Mostrar stock bajo'}
                </Button>
                <span className="text-sm text-gray-600">
                  {lowStockProducts.length} productos con stock bajo
                </span>
              </div>
            </div>
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-black hover:bg-gray-900 whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-2" /> Nuevo producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Registrar producto</DialogTitle>
                  <DialogDescription>
                    Agrega un producto al inventario para monitorear su disponibilidad.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="product-name">Nombre</Label>
                    <Input
                      id="product-name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Removedor de esmalte"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-price">Precio</Label>
                      <Input
                        id="product-price"
                        type="number"
                        min="0"
                        step="10"
                        value={form.price}
                        onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-stock">Stock</Label>
                      <Input
                        id="product-stock"
                        type="number"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-low">Umbral</Label>
                      <Input
                        id="product-low"
                        type="number"
                        min="0"
                        step="1"
                        value={form.lowStockThreshold}
                        onChange={(event) => setForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateProduct} disabled={!isFormValid || isSubmitting}>
                      Guardar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContent()}
        </CardContent>
      </Card>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>Actualiza los datos del producto seleccionado.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-product-name">Nombre</Label>
              <Input
                id="edit-product-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-product-price">Precio</Label>
                <Input
                  id="edit-product-price"
                  type="number"
                  min="0"
                  step="10"
                  value={form.price}
                  onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-stock">Stock</Label>
                <Input
                  id="edit-product-stock"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(event) => setForm((prev) => ({ ...prev, stock: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-product-low">Umbral</Label>
                <Input
                  id="edit-product-low"
                  type="number"
                  min="0"
                  step="1"
                  value={form.lowStockThreshold}
                  onChange={(event) => setForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateProduct} disabled={!isFormValid || isSubmitting}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
