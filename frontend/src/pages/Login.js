import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // Limpiar estado al cargar el componente de login
  useEffect(() => {
    // Limpiar campos
    setEmail('');
    setPassword('');
    setLoading(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        cache: 'no-cache'
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Credenciales inválidas');
        setLoading(false);
        return;
      }

      // Guardar token y datos del usuario
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Actualizar contexto
      setUser(data.user);
      
      toast.success('Sesión iniciada correctamente');
      
      // Navegar al dashboard
      navigate('/dashboard', { replace: true });
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Error de conexión al servidor');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: 'var(--color-bg-main)'}}>
      <div className="w-full max-w-md">
        <div className="card" style={{padding: '2rem'}}>
          <div className="flex items-center justify-center mb-6">
            <Zap className="w-10 h-10" style={{color: 'var(--color-secondary)'}} />
            <h1 className="text-2xl font-bold ml-2" style={{color: 'var(--color-primary)'}}>ElectroDesign Pro</h1>
          </div>
          <h2 className="text-xl font-semibold mb-6 text-center" style={{color: 'var(--color-text-primary)'}}>Iniciar Sesión</h2>
          
          <form onSubmit={handleSubmit} data-testid="login-form">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="login-email-input"
                placeholder="ingeniero@ejemplo.com"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Contraseña</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
            </button>
          </form>
          
          <p className="text-center mt-4 text-sm" style={{color: 'var(--color-text-secondary)'}}>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-medium" style={{color: 'var(--color-secondary)'}}>
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
