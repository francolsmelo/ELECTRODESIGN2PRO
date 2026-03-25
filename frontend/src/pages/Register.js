import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
        cache: 'no-cache'
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.detail || 'Error al registrarse');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      toast.success('Cuenta creada correctamente');
      
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
        window.location.reload();
      }, 100);
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Error de conexión');
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
          <h2 className="text-xl font-semibold mb-6 text-center" style={{color: 'var(--color-text-primary)'}}>Crear Cuenta</h2>
          
          <form onSubmit={handleSubmit} data-testid="register-form">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Nombre Completo</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="register-name-input"
                placeholder="Juan Pérez"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email-input"
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
                data-testid="register-password-input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Creando cuenta...' : 'Registrarse'}
            </button>
          </form>
          
          <p className="text-center mt-4 text-sm" style={{color: 'var(--color-text-secondary)'}}>
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-medium" style={{color: 'var(--color-secondary)'}}>
              Iniciar Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
