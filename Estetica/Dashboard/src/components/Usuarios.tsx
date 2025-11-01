import { useMemo, useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ShieldAlert, UserPlus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

import { apiFetch, ApiError } from '../lib/api';
import { invalidateQuery, useApiQuery } from '../lib/data-store';
import type { UserSummary, UsersResponse, UserRole } from '../types/api';

interface UsuariosProps {
  isAdmin: boolean;
}

const USERS_KEY = 'users';

const ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Administración', value: 'ADMIN' },
  { label: 'Empleado', value: 'EMPLOYEE' },
];

interface FormState {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

const INITIAL_FORM: FormState = {
  email: '',
  name: '',
  password: '',
  role: 'EMPLOYEE',
};

export default function Usuarios({ isAdmin }: UsuariosProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: users = [], status, error, refetch } = useApiQuery<UserSummary[]>(
    USERS_KEY,
    async () => {
      const response = await apiFetch<UsersResponse>('/api/users');
      return response.users;
    },
    { skip: !isAdmin }
  );

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) => {
        if (a.role === b.role) {
          return a.email.localeCompare(b.email);
        }
        return a.role.localeCompare(b.role);
      }),
    [users]
  );

  const handleChange = <Key extends keyof FormState>(field: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const handleCreate = async () => {
    if (!isAdmin || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        email: form.email.trim(),
        name: form.name.trim() || undefined,
        password: form.password,
        role: form.role,
      };

      const { user } = await apiFetch<{ user: UserSummary }>('/api/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      toast.success('Usuario creado correctamente');
      setForm(INITIAL_FORM);
      invalidateQuery(USERS_KEY);
      return user;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'No fue posible crear el usuario';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
    return undefined;
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md border-dashed">
          <CardHeader className="text-center space-y-2">
            <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" />
            <CardTitle className="text-lg">Acceso restringido</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            Debes tener rol administrador para gestionar usuarios.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gray-900">Crear nuevo usuario</CardTitle>
            <UserPlus className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="user-email">Correo electrónico</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              placeholder="usuario@dominio.com"
              onChange={(event) => handleChange('email', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-name">Nombre completo</Label>
            <Input
              id="user-name"
              value={form.name}
              placeholder="Nombre opcional"
              onChange={(event) => handleChange('name', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Contraseña temporal</Label>
            <Input
              id="user-password"
              type="password"
              value={form.password}
              placeholder="Mínimo 8 caracteres"
              onChange={(event) => handleChange('password', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Rol</Label>
            <Select value={form.role} onValueChange={(value) => handleChange('role', value as UserRole)}>
              <SelectTrigger id="user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Limpiar
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !form.email || form.password.length < 8}>
              {isSubmitting ? 'Creando…' : 'Crear usuario'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-900">Equipo registrado</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'loading' ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse h-12 rounded-md bg-muted" />
              ))}
            </div>
          ) : status === 'error' ? (
            <div className="flex flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-muted-foreground">
                {error instanceof ApiError ? error.message : 'No fue posible cargar los usuarios.'}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : sortedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay usuarios registrados.</p>
          ) : (
            <div className="dashboard-table-wrapper">
              <table className="dashboard-table text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Correo</th>
                    <th className="py-2 pr-4 font-medium">Nombre</th>
                    <th className="py-2 pr-4 font-medium">Rol</th>
                    <th className="py-2 pr-4 font-medium">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((user) => (
                    <tr key={user.id} className="border-t border-muted/40">
                      <td className="py-3 pr-4 font-medium text-foreground">{user.email}</td>
                      <td className="py-3 pr-4">{user.name || '—'}</td>
                      <td className="py-3 pr-4">
                        {ROLE_OPTIONS.find((option) => option.value === user.role)?.label ?? user.role}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
