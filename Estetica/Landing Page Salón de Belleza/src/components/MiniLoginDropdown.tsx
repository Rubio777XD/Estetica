import { useState, useRef, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface MiniLoginDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  anchorRef: React.RefObject<HTMLElement>;
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

export function MiniLoginDropdown({ isOpen, onClose, onLoginSuccess, anchorRef }: MiniLoginDropdownProps) {
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position dropdown relative to anchor
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRef.current && dropdownRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      
      let top = anchorRect.bottom + 8;
      let left = anchorRect.left;
      
      // Adjust if dropdown would go off screen
      if (left + dropdownRect.width > window.innerWidth) {
        left = anchorRect.right - dropdownRect.width;
      }
      
      if (top + dropdownRect.height > window.innerHeight) {
        top = anchorRect.top - dropdownRect.height - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isOpen, anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !anchorRef.current?.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorRef]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Ingresa un email válido';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific field error on change
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setErrors({});

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock authentication logic
      if (formData.email === 'admin@salonar.com' && formData.password === 'admin123') {
        setSuccessMessage('¡Bienvenida! Redirigiendo...');
        setTimeout(() => {
          onLoginSuccess();
          onClose();
          setSuccessMessage('');
          setFormData({ email: '', password: '' });
        }, 1000);
      } else {
        setErrors({ general: 'Credenciales incorrectas. Intenta de nuevo.' });
      }
    } catch (error) {
      setErrors({ general: 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Mock forgot password functionality
    alert('Se ha enviado un enlace de recuperación a tu email (funcionalidad demo)');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Dropdown */}
      <div 
        ref={dropdownRef}
        className="fixed mini-login-dropdown content-layer"
        style={{ 
          top: `${position.top}px`, 
          left: `${position.left}px`,
          zIndex: 1000 
        }}
      >
        <div className="w-80 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="font-heading text-white text-lg mb-1">
              Iniciar Sesión
            </h3>
            <p className="text-sm text-gray-400">
              Accede a tu cuenta para agendar
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center">
              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-green-400 text-sm">{successMessage}</span>
            </div>
          )}

          {/* General Error */}
          {errors.general && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 text-red-400 mr-2" />
              <span className="text-red-400 text-sm">{errors.general}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="tu@email.com"
                className={`mini-login-input w-full ${errors.email ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-sm font-medium mb-2">
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
                  className={`mini-login-input w-full pr-10 ${errors.password ? 'border-red-500' : ''}`}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1">{errors.password}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-editorial-beige text-xs hover:text-editorial-beige/80 transition-colors"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Demo Credentials */}
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Demo:</p>
            <p className="text-xs text-gray-300">admin@salonar.com / admin123</p>
          </div>
        </div>
      </div>
    </>
  );
}