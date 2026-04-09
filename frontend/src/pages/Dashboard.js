import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { toast } from 'sonner';
import { Plus, FolderOpen, LogOut, Zap, MapPin, Cpu, Trash2, Shield, CreditCard } from 'lucide-react';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingProject, setDeletingProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', location: '', voltage_system: '220/127V' });
  const [loading, setLoading] = useState(true);
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setProjects(data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar proyectos');
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/projects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newProject)
      });
      
      if (response.ok) {
        toast.success('Proyecto creado correctamente');
        setShowModal(false);
        setNewProject({ name: '', location: '', voltage_system: '220/127V' });
        fetchProjects();
      }
    } catch (error) {
      toast.error('Error al crear proyecto');
    }
  };

  const handleLogout = () => {
    // Limpiar todo el localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Limpiar el estado del usuario
    setUser(null);
    
    // Navegar al login y forzar recarga
    navigate('/login', { replace: true });
    
    // Forzar recarga completa para limpiar cualquier estado residual
    window.location.href = '/login';
  };

  const handleDeleteClick = (e, project) => {
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteModal(true);
    setDeletePassword('');
  };

  const handleDeleteProject = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error('Por favor ingresa tu contraseña');
      return;
    }

    setDeletingProject(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('password', deletePassword);

      const response = await fetch(`${API}/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
          // No incluir Content-Type - el navegador lo establece automáticamente con boundary para FormData
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Proyecto eliminado correctamente');
        setShowDeleteModal(false);
        setProjectToDelete(null);
        setDeletePassword('');
        fetchProjects();
      } else {
        const data = await response.json();
        toast.error(data.detail || 'Error al eliminar proyecto');
      }
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
      toast.error('Error al eliminar proyecto. Verifica tu conexión.');
    }
    setDeletingProject(false);
  };

  return (
    <div className="dashboard-layout">
      <div className="sidebar">
        <div className="p-6 border-b" style={{borderColor: 'var(--color-border)'}}>
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8" style={{color: 'var(--color-secondary)'}} />
            <div>
              <h2 className="font-bold text-lg" style={{color: 'var(--color-primary)'}}>ElectroDesign</h2>
              <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>Pro Engineering</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Usuario</p>
            <div className="p-3 rounded" style={{backgroundColor: 'var(--color-bg-main)'}}>
              <p className="text-sm font-medium" style={{color: 'var(--color-primary)'}}>{user?.name}</p>
              <p className="text-xs" style={{color: 'var(--color-text-secondary)'}}>{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary w-full mb-4"
            data-testid="create-project-button"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Nuevo Proyecto
          </button>
          
          {user?.role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="btn btn-outline w-full mb-4"
              data-testid="admin-panel-button"
            >
              <Shield className="w-4 h-4 mr-2 inline" />
              Panel Admin
            </button>
          )}
          
          {user?.role !== 'admin' && (
            <button
              onClick={() => navigate('/plans')}
              className="btn btn-outline w-full mb-4"
              data-testid="plans-button"
            >
              <CreditCard className="w-4 h-4 mr-2 inline" />
              Ver Planes
            </button>
          )}
          
          <button
            onClick={handleLogout}
            className="btn btn-outline w-full"
            data-testid="logout-button"
          >
            <LogOut className="w-4 h-4 mr-2 inline" />
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="main-content">
        <div className="top-header">
          <h1 className="text-2xl font-bold" style={{color: 'var(--color-primary)'}}>Mis Proyectos</h1>
          <div className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="content-area">
          {loading ? (
            <p style={{color: 'var(--color-text-secondary)'}}>Cargando proyectos...</p>
          ) : projects.length === 0 ? (
            <div className="card text-center py-12" data-testid="empty-projects-state">
              <FolderOpen className="w-16 h-16 mx-auto mb-4" style={{color: 'var(--color-text-tertiary)'}} />
              <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--color-text-primary)'}}>No hay proyectos aún</h3>
              <p className="mb-4" style={{color: 'var(--color-text-secondary)'}}>Crea tu primer proyecto eléctrico</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary">
                <Plus className="w-4 h-4 mr-2 inline" />
                Crear Proyecto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="projects-grid">
              {projects.map(project => (
                <div
                  key={project.id}
                  className="card cursor-pointer relative"
                  onClick={() => navigate(`/project/${project.id}`)}
                  data-testid={`project-card-${project.id}`}
                  style={{transition: 'all 0.2s'}}
                >
                  <button
                    onClick={(e) => handleDeleteClick(e, project)}
                    className="absolute top-2 right-2 p-2 rounded hover:bg-red-50 text-red-500 hover:text-red-700"
                    title="Eliminar proyecto"
                    data-testid={`delete-project-${project.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 rounded" style={{backgroundColor: '#E0F2FE'}}>
                      <Cpu className="w-6 h-6" style={{color: 'var(--color-secondary)'}} />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{color: 'var(--color-primary)'}}>{project.name}</h3>
                  <div className="flex items-center gap-2 mb-2" style={{color: 'var(--color-text-secondary)', fontSize: '0.875rem'}}>
                    <MapPin className="w-4 h-4" />
                    <span>{project.location}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="status-badge" style={{backgroundColor: '#DBEAFE', color: '#1e40af'}}>
                      {project.voltage_system}
                    </span>
                  </div>
                  <p className="text-xs" style={{color: 'var(--color-text-tertiary)'}}>
                    Creado: {new Date(project.created_at).toLocaleDateString('es-EC')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="create-project-modal">
          <div className="card w-full max-w-md" style={{margin: '1rem'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--color-primary)'}}>Nuevo Proyecto</h2>
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Nombre del Proyecto</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                  data-testid="project-name-input"
                  placeholder="Ej: Red MT/BT Sector Norte"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Ubicación</label>
                <input
                  type="text"
                  className="input"
                  value={newProject.location}
                  onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                  required
                  data-testid="project-location-input"
                  placeholder="Ej: Ambato, Tungurahua"
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Sistema de Voltaje</label>
                <select
                  className="input"
                  value={newProject.voltage_system}
                  onChange={(e) => setNewProject({ ...newProject, voltage_system: e.target.value })}
                  data-testid="project-voltage-input"
                >
                  <option value="220/127V">220/127V Trifásico</option>
                  <option value="240/120V">240/120V Split Phase</option>
                  <option value="13.8kV">13.8 kV (Media Tensión)</option>
                  <option value="7.96kV">7.96 kV (Media Tensión)</option>
                </select>
              </div>
              
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1" data-testid="project-submit-button">
                  Crear Proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && projectToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="delete-project-modal">
          <div className="card w-full max-w-md" style={{margin: '1rem'}}>
            <h2 className="text-xl font-bold mb-4" style={{color: 'var(--color-danger)'}}>
              Eliminar Proyecto
            </h2>
            <div className="mb-4 p-3 rounded" style={{backgroundColor: '#FEE2E2', borderLeft: '4px solid var(--color-danger)'}}>
              <p className="font-semibold mb-1" style={{color: 'var(--color-danger)'}}>⚠️ Acción Irreversible</p>
              <p className="text-sm" style={{color: '#991b1b'}}>
                Estás a punto de eliminar el proyecto "<strong>{projectToDelete.name}</strong>". 
                Esto eliminará todas las inspecciones, cálculos y presupuestos asociados.
              </p>
            </div>
            <form onSubmit={handleDeleteProject}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
                  Confirma con tu contraseña:
                </label>
                <input
                  type="password"
                  className="input"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  required
                  data-testid="delete-password-input"
                  placeholder="Ingresa tu contraseña"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setProjectToDelete(null);
                    setDeletePassword('');
                  }} 
                  className="btn btn-outline flex-1"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn flex-1" 
                  style={{backgroundColor: 'var(--color-danger)', color: 'white'}}
                  disabled={deletingProject}
                  data-testid="confirm-delete-button"
                >
                  {deletingProject ? 'Eliminando...' : 'Eliminar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
