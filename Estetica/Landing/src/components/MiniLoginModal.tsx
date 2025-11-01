import { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, X } from 'lucide-react';
import { fetchMe, login } from '../lib/auth';

const DASHBOARD_URL = (
  import.meta.env.VITE_PUBLIC_DASHBOARD_URL as string | undefined || 'http://localhost:3003'
).replace(/\/$/, '') + '/';

interface MiniLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

interface FormData {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function MiniLoginModal({ isOpen, onClose, onLoginSuccess }: MiniLoginModalProps) {
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape (con guardas)
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const modalEl = modalRef.current;
      if (!modalEl || !target) return;
      if (modalEl.contains(target)) return; // click dentro: no cerrar
      onClose();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ email: '', password: '' });
      setErrors({});
      setSuccessMessage('');
      setShowPassword(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.email.trim()) newErrors.email = 'El email es requerido';
    else if (!validateEmail(formData.email)) newErrors.email = 'Ingresa un email válido';

    if (!formData.password.trim()) newErrors.password = 'La contraseña es requerida';
    else if (formData.password.length < 6) newErrors.password = 'La contraseña debe tener al menos 6 caracteres';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    const isValid = validateForm();
    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const token = await login(formData.email.trim(), formData.password);
      if (typeof window !== 'undefined') {
        localStorage.setItem('salon_auth', token);
      }
      const user = await fetchMe();
      setSuccessMessage(
        user?.name ? `¡Hola ${user.name}! Redirigiendo al panel...` : '¡Inicio de sesión exitoso!'
      );

      onLoginSuccess();

      setTimeout(() => {
        window.location.href = DASHBOARD_URL;
      }, 600);
    } catch (error) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('salon_auth');
      }
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión.';
      setErrors({ general: message || 'Error al iniciar sesión.' });
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = () => {
    alert('Se ha enviado un enlace de recuperación a tu email (funcionalidad demo)');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Modal Backdrop */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Background Overlay */}
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Container */}
        <div
          ref={modalRef}
          className="relative w-full max-w-md bg-black border border-editorial-beige/30 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            boxShadow:
              '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(234, 220, 199, 0.1)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white/60 hover:text-white transition-all duration-200"
            disabled={isLoading}
            aria-label="Cerrar"
            type="button"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Content */}
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h3 className="font-heading text-white text-2xl mb-2">Iniciar Sesión</h3>
              <p className="text-sm text-gray-400">Accede a tu cuenta para agendar</p>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
                <span className="text-green-400 text-sm font-medium">{successMessage}</span>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
                <span className="text-red-400 text-sm font-medium">{errors.general}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="tu@email.com"
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 transition-all duration-200 ${errors.email
                    ? 'border-red-500 focus:border-red-400'
                    : 'border-white/20 focus:border-editorial-beige'
                    } focus:outline-none focus:ring-2 focus:ring-editorial-beige/20`}
                  disabled={isLoading}
                />
                {errors.email && <p className="text-red-400 text-xs mt-2">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-white text-sm font-medium mb-3">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Tu contraseña"
                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-500 transition-all duration-200 pr-12 ${errors.password
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-white/20 focus:border-editorial-beige'
                      } focus:outline-none focus:ring-2 focus:ring-editorial-beige/20`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                    disabled={isLoading}
                    aria-label="Mostrar/ocultar contraseña"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-2">{errors.password}</p>}
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-editorial-beige text-sm hover:text-editorial-beige/80 transition-colors underline decoration-editorial-beige/30 hover:decoration-editorial-beige/60"
                  disabled={isLoading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-editorial-beige text-black rounded-xl font-medium transition-all duration-200 hover:bg-editorial-beige/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Iniciando sesión...
                  </div>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-xs text-gray-400 mb-2 font-medium">Credenciales de prueba:</p>
              <div className="space-y-1">
                <p className="text-xs text-gray-300 font-mono">admin@estetica.mx</p>
                <p className="text-xs text-gray-300 font-mono">password123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
