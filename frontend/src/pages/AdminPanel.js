import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { Users, Key, Settings, ArrowLeft, Plus, Shield } from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [paymentConfigs, setPaymentConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateLicense, setShowCreateLicense] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [newLicense, setNewLicense] = useState({ user_id: '', plan_type: 'basic', duration_days: 365 });
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role !== 'admin') {
      toast.error('Acceso denegado');
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch users
      const usersResponse = await fetch(`${API}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }

      // Fetch payment configs
      const configsResponse = await fetch(`${API}/admin/payment-configs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (configsResponse.ok) {
        const configsData = await configsResponse.json();
        setPaymentConfigs(configsData);
      }

      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar datos');
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Usuario creado: ${data.credentials.email}`);
        setShowCreateUser(false);
        setNewUser({ name: '', email: '', password: '' });
        fetchData();
      } else {
        toast.error('Error al crear usuario');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleCreateLicense = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('user_id', newLicense.user_id);
      formData.append('plan_type', newLicense.plan_type);
      formData.append('duration_days', newLicense.duration_days);

      const response = await fetch(`${API}/admin/licenses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Licencia generada: ${data.license_key}`);
        setShowCreateLicense(false);
        fetchData();
      } else {
        toast.error('Error al generar licencia');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-bg-main)'}}>
      <div className="top-header">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-gray-100 rounded">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{color: 'var(--color-primary)'}}>Panel de Administración</h1>
            <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Gestión de usuarios y licencias</p>
          </div>
        </div>
      </div>

      <div className="flex" style={{minHeight: 'calc(100vh - 64px)'}}>
        <div className="w-64 bg-white border-r" style={{borderColor: 'var(--color-border)'}}>
          <div className="p-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded mb-1 text-sm ${
                activeTab === 'users' ? 'bg-slate-900 text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Usuarios
            </button>
            <button
              onClick={() => setActiveTab('licenses')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded mb-1 text-sm ${
                activeTab === 'licenses' ? 'bg-slate-900 text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Key className="w-4 h-4" />
              Licencias
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded mb-1 text-sm ${
                activeTab === 'payments' ? 'bg-slate-900 text-white' : 'hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              Configuración de Pagos
            </button>
          </div>
        </div>

        <div className="flex-1 p-6">
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <>
              {activeTab === 'users' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>Usuarios</h2>
                    <button onClick={() => setShowCreateUser(true)} className="btn btn-primary">
                      <Plus className="w-4 h-4 mr-2 inline" />
                      Crear Usuario
                    </button>
                  </div>

                  <div className="card">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Rol</th>
                          <th>Licencia</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(user => (
                          <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>
                              <span className={`status-badge ${user.role === 'admin' ? 'success' : ''}`}>
                                {user.role}
                              </span>
                            </td>
                            <td>{user.license?.plan_type || 'Sin licencia'}</td>
                            <td>
                              {user.license && new Date(user.license.end_date) > new Date() ? (
                                <span className="status-badge success">Activa</span>
                              ) : (
                                <span className="status-badge danger">Expirada</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'licenses' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>Generar Licencia</h2>
                    <button onClick={() => setShowCreateLicense(true)} className="btn btn-primary">
                      <Shield className="w-4 h-4 mr-2 inline" />
                      Nueva Licencia
                    </button>
                  </div>
                  <div className="card">
                    <p>Selecciona un usuario para generar su licencia</p>
                  </div>
                </div>
              )}

              {activeTab === 'payments' && (
                <div>
                  <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--color-primary)'}}>
                    Configuración de Pasarelas de Pago
                  </h2>
                  <div className="space-y-6">
                    <div className="card">
                      <h3 className="font-bold mb-4">PayPal</h3>
                      <p className="text-sm mb-2" style={{color: 'var(--color-success)'}}>✓ Configurado y activo</p>
                      <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Modo: Sandbox</p>
                    </div>
                    
                    <div className="card">
                      <h3 className="font-bold mb-4">Banco Pichincha (Ecuador)</h3>
                      <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>
                        Configuración pendiente - Solicitar credenciales al equipo del banco
                      </p>
                      <div className="space-y-3">
                        <input type="text" className="input" placeholder="Nombre de Aplicación" disabled />
                        <input type="text" className="input" placeholder="Client ID" disabled />
                        <input type="text" className="input" placeholder="Client Secret" disabled />
                        <input type="text" className="input" placeholder="Access Token" disabled />
                        <select className="input" disabled>
                          <option>Sandbox</option>
                          <option>Producción</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md" style={{margin: '1rem'}}>
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Usuario</h2>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Contraseña</label>
                <input
                  type="password"
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                  minLength={6}
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreateUser(false)} className="btn btn-outline flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create License Modal */}
      {showCreateLicense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md" style={{margin: '1rem'}}>
            <h2 className="text-xl font-bold mb-4">Generar Licencia</h2>
            <form onSubmit={handleCreateLicense}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Usuario</label>
                <select
                  className="input"
                  value={newLicense.user_id}
                  onChange={(e) => setNewLicense({...newLicense, user_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Tipo de Plan</label>
                <select
                  className="input"
                  value={newLicense.plan_type}
                  onChange={(e) => setNewLicense({...newLicense, plan_type: e.target.value})}
                >
                  <option value="basic">Básico (1 año)</option>
                  <option value="enterprise">Empresa (5 años)</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Duración (días)</label>
                <input
                  type="number"
                  className="input"
                  value={newLicense.duration_days}
                  onChange={(e) => setNewLicense({...newLicense, duration_days: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreateLicense(false)} className="btn btn-outline flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  Generar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
