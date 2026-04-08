import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { Users, Key, Settings, ArrowLeft, Plus, Shield, Edit, Trash2, X } from 'lucide-react';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [paymentConfigs, setPaymentConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateLicense, setShowCreateLicense] = useState(false);
  const [showEditLicense, setShowEditLicense] = useState(false);
  const [showChangeCredentials, setShowChangeCredentials] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [newLicense, setNewLicense] = useState({ user_id: '', plan_type: 'basic', duration_days: 365 });
  const [editLicense, setEditLicense] = useState({ plan_type: 'basic', duration_days: 365 });
  const [credentialsForm, setCredentialsForm] = useState({ current_password: '', new_email: '', new_password: '', confirm_password: '' });
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
        const errorData = await response.json();
        toast.error(errorData.detail || 'Error al crear usuario');
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

  const handleEditLicense = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('plan_type', editLicense.plan_type);
      formData.append('duration_days', editLicense.duration_days);

      const response = await fetch(`${API}/admin/users/${selectedUser.id}/license`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Licencia actualizada para ${selectedUser.name}`);
        setShowEditLicense(false);
        setSelectedUser(null);
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Error al actualizar licencia');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (userId === user.id) {
      toast.error('No puedes eliminarte a ti mismo');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userName}? Esta acción eliminará todos sus proyectos y datos.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        toast.success(`Usuario ${userName} eliminado correctamente`);
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Error al eliminar usuario');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  const openEditLicense = (userItem) => {
    setSelectedUser(userItem);
    setEditLicense({
      plan_type: userItem.license?.plan_type || 'basic',
      duration_days: 365
    });
    setShowEditLicense(true);
  };


  const handleChangeCredentials = async (e) => {
    e.preventDefault();
    
    if (!credentialsForm.current_password) {
      toast.error('Debes ingresar tu contraseña actual');
      return;
    }
    
    if (!credentialsForm.new_email && !credentialsForm.new_password) {
      toast.error('Debes proporcionar un nuevo email o contraseña');
      return;
    }
    
    if (credentialsForm.new_password && credentialsForm.new_password !== credentialsForm.confirm_password) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('current_password', credentialsForm.current_password);
      if (credentialsForm.new_email) formData.append('new_email', credentialsForm.new_email);
      if (credentialsForm.new_password) formData.append('new_password', credentialsForm.new_password);

      const response = await fetch(`${API}/admin/update-credentials`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        if (data.new_token) {
          localStorage.setItem('token', data.new_token);
        }
        toast.success('Credenciales actualizadas correctamente');
        setShowChangeCredentials(false);
        setCredentialsForm({ current_password: '', new_email: '', new_password: '', confirm_password: '' });
        
        if (data.new_token) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Error al actualizar credenciales');
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
            <button
              onClick={() => setShowChangeCredentials(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded mb-1 text-sm hover:bg-gray-50 text-blue-600"
            >
              <Shield className="w-4 h-4" />
              Mi Perfil
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
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map(userItem => (
                          <tr key={userItem.id}>
                            <td>{userItem.name}</td>
                            <td>{userItem.email}</td>
                            <td>
                              <span className={`status-badge ${userItem.role === 'admin' ? 'success' : ''}`}>
                                {userItem.role}
                              </span>
                            </td>
                            <td>{userItem.license?.plan_type || 'Sin licencia'}</td>
                            <td>
                              {userItem.role === 'admin' ? (
                                <span className="status-badge success">Admin</span>
                              ) : userItem.license && new Date(userItem.license.end_date) > new Date() ? (
                                <span className="status-badge success">Activa</span>
                              ) : (
                                <span className="status-badge danger">Expirada</span>
                              )}
                            </td>
                            <td>
                              {userItem.role !== 'admin' && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => openEditLicense(userItem)}
                                    className="btn btn-secondary btn-sm"
                                    title="Editar licencia"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(userItem.id, userItem.name)}
                                    className="btn btn-danger btn-sm"
                                    title="Eliminar usuario"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
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
                      <p className="text-sm mb-2" style={{color: 'var(--color-success)'}}>✓ Configurado y activo</p>
                      <div className="space-y-3 mb-4">
                        <div className="p-3 rounded" style={{backgroundColor: 'var(--color-bg-main)'}}>
                          <p className="text-sm"><strong>Beneficiario:</strong> Franklin Roberto Melo López</p>
                          <p className="text-sm"><strong>RUC:</strong> 1234567890001</p>
                          <p className="text-sm"><strong>Tipo de Cuenta:</strong> Transaccional</p>
                          <p className="text-sm"><strong>Número de Cuenta:</strong> 4409606500</p>
                        </div>
                      </div>
                      <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>
                        Los pagos por transferencia requieren activación manual de la licencia
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Crear Usuario */}
      {showCreateUser && (
        <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Crear Nuevo Usuario</h3>
              <button onClick={() => setShowCreateUser(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Nombre</label>
                <input
                  type="text"
                  className="input"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Email</label>
                <input
                  type="email"
                  className="input"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Contraseña</label>
                <input
                  type="password"
                  className="input"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateUser(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Crear Licencia */}
      {showCreateLicense && (
        <div className="modal-overlay" onClick={() => setShowCreateLicense(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Generar Nueva Licencia</h3>
              <button onClick={() => setShowCreateLicense(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLicense}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Usuario</label>
                <select
                  className="input"
                  value={newLicense.user_id}
                  onChange={(e) => setNewLicense({...newLicense, user_id: e.target.value})}
                  required
                >
                  <option value="">Seleccionar usuario</option>
                  {users.filter(u => u.role !== 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Tipo de Plan</label>
                <select
                  className="input"
                  value={newLicense.plan_type}
                  onChange={(e) => setNewLicense({...newLicense, plan_type: e.target.value})}
                  required
                >
                  <option value="free">Free (7 días)</option>
                  <option value="basic">Básico (1 año)</option>
                  <option value="enterprise">Empresa (5 años)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Duración (días)</label>
                <input
                  type="number"
                  className="input"
                  value={newLicense.duration_days}
                  onChange={(e) => setNewLicense({...newLicense, duration_days: parseInt(e.target.value)})}
                  required
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateLicense(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Generar Licencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Licencia */}
      {showEditLicense && selectedUser && (
        <div className="modal-overlay" onClick={() => {setShowEditLicense(false); setSelectedUser(null);}}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Editar Licencia - {selectedUser.name}</h3>
              <button onClick={() => {setShowEditLicense(false); setSelectedUser(null);}} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditLicense}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Usuario</label>
                <input
                  type="text"
                  className="input"
                  value={`${selectedUser.name} (${selectedUser.email})`}
                  disabled
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Tipo de Plan</label>
                <select
                  className="input"
                  value={editLicense.plan_type}
                  onChange={(e) => setEditLicense({...editLicense, plan_type: e.target.value})}
                  required
                >
                  <option value="free">Free (7 días)</option>
                  <option value="basic">Básico (1 año)</option>
                  <option value="enterprise">Empresa (5 años)</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Duración (días)</label>
                <input
                  type="number"
                  className="input"
                  value={editLicense.duration_days}
                  onChange={(e) => setEditLicense({...editLicense, duration_days: parseInt(e.target.value)})}
                  required
                  min="1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => {setShowEditLicense(false); setSelectedUser(null);}} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Actualizar Licencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Modal: Cambiar Credenciales */}
      {showChangeCredentials && (
        <div className="modal-overlay" onClick={() => setShowChangeCredentials(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Cambiar Mis Credenciales</h3>
              <button onClick={() => setShowChangeCredentials(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangeCredentials}>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Contraseña Actual *</label>
                <input
                  type="password"
                  className="input"
                  value={credentialsForm.current_password}
                  onChange={(e) => setCredentialsForm({...credentialsForm, current_password: e.target.value})}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Nuevo Email (opcional)</label>
                <input
                  type="email"
                  className="input"
                  value={credentialsForm.new_email}
                  onChange={(e) => setCredentialsForm({...credentialsForm, new_email: e.target.value})}
                  placeholder={user?.email}
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Nueva Contraseña (opcional)</label>
                <input
                  type="password"
                  className="input"
                  value={credentialsForm.new_password}
                  onChange={(e) => setCredentialsForm({...credentialsForm, new_password: e.target.value})}
                />
              </div>
              <div className="mb-4">
                <label className="block mb-2 font-medium">Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  className="input"
                  value={credentialsForm.confirm_password}
                  onChange={(e) => setCredentialsForm({...credentialsForm, confirm_password: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowChangeCredentials(false)} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Actualizar Credenciales
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
