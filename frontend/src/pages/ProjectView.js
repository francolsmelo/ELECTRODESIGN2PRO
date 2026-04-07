import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Calculator, TrendingDown, FileText, Database, FileBarChart } from 'lucide-react';
import InspectionModule from '../modules/InspectionModule';
import DemandModule from '../modules/DemandModule';
import VoltageDropModule from '../modules/VoltageDropModule';
import BudgetModule from '../modules/BudgetModule';
import ReportsModule from '../modules/ReportsModule';

const ProjectView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('inspection');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        toast.error('Proyecto no encontrado');
        navigate('/dashboard');
      }
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar proyecto');
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'inspection', name: 'Inspección del Sitio', icon: Camera },
    { id: 'demand', name: 'Cálculo de Demanda', icon: Calculator },
    { id: 'voltage', name: 'Caída de Voltaje', icon: TrendingDown },
    { id: 'budget', name: 'Presupuesto', icon: FileText },
    { id: 'database', name: 'Base de Datos', icon: Database },
    { id: 'reports', name: 'Reportes', icon: FileBarChart }
  ];

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Cargando proyecto...</div>;
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-bg-main)'}}>
      <div className="top-header">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded"
            data-testid="back-to-dashboard-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{color: 'var(--color-primary)'}}>{project?.name}</h1>
            <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>{project?.location} - {project?.voltage_system}</p>
          </div>
        </div>
      </div>

      <div className="flex" style={{minHeight: 'calc(100vh - 64px)'}}>
        <div className="w-64 bg-white border-r" style={{borderColor: 'var(--color-border)'}}>
          <div className="p-4">
            <p className="text-xs font-semibold mb-3" style={{color: 'var(--color-text-secondary)', textTransform: 'uppercase'}}>Módulos</p>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded mb-1 text-sm transition-all ${
                    activeTab === tab.id ? 'bg-slate-900 text-white' : 'hover:bg-gray-50'
                  }`}
                  data-testid={`tab-${tab.id}`}
                  style={activeTab === tab.id ? {} : {color: 'var(--color-text-primary)'}}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {activeTab === 'inspection' && <InspectionModule projectId={projectId} />}
            {activeTab === 'demand' && <DemandModule projectId={projectId} />}
            {activeTab === 'voltage' && <VoltageDropModule projectId={projectId} />}
            {activeTab === 'budget' && <BudgetModule projectId={projectId} />}
            {activeTab === 'database' && (
              <div className="card">
                <h2 className="text-lg font-bold mb-4">Base de Datos de Materiales</h2>
                <p style={{color: 'var(--color-text-secondary)'}}>Módulo en desarrollo - próximamente disponible</p>
              </div>
            )}
            {activeTab === 'reports' && <ReportsModule projectId={projectId} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectView;
