import React, { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { toast } from 'sonner';
import { Database, Download, Shield } from 'lucide-react';

const DatabaseModule = ({ projectId }) => {
  const { user } = useContext(AuthContext);
  const [generating, setGenerating] = useState(false);

  const generateSQL = () => {
    if (user?.role !== 'admin') {
      toast.error('Solo los administradores pueden exportar la base de datos');
      return;
    }

    setGenerating(true);

    const sql = `-- ELECTRODESIGN PRO - EXPORT SQL DATABASE
-- Generado el: ${new Date().toISOString()}
-- Solo para uso administrativo

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: licenses
-- ============================================
CREATE TABLE IF NOT EXISTS licenses (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    plan_type VARCHAR(50) NOT NULL,
    license_key VARCHAR(255) UNIQUE NOT NULL,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    payment_id VARCHAR(255),
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA: projects
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    voltage_system VARCHAR(100),
    project_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA: demand_calculations
-- ============================================
CREATE TABLE IF NOT EXISTS demand_calculations (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    lighting_loads JSON NOT NULL,
    special_loads JSON NOT NULL,
    demand_factor DECIMAL(5,2),
    power_factor DECIMAL(5,2),
    total_lighting_kw DECIMAL(10,2),
    total_special_kw DECIMAL(10,2),
    total_installed_kw DECIMAL(10,2),
    demanded_kva DECIMAL(10,2),
    transformer_size_kva DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA: voltage_drops
-- ============================================
CREATE TABLE IF NOT EXISTS voltage_drops (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    circuit_type VARCHAR(10) NOT NULL, -- 'BT' o 'MT'
    segments JSON NOT NULL,
    total_drop DECIMAL(10,6),
    \`limit\` DECIMAL(10,2),
    compliant BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA: budgets
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    materials JSON NOT NULL,
    labor JSON NOT NULL,
    dismantling JSON,
    subtotal DECIMAL(12,2),
    administration DECIMAL(12,2),
    utility DECIMAL(12,2),
    iva DECIMAL(12,2),
    total DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- TABLA: reports
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- 'autorizacion', 'factibilidad', 'fiscalizacion'
    data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_report (project_id, report_type)
);

-- ============================================
-- TABLA: materials
-- ============================================
CREATE TABLE IF NOT EXISTS materials (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    description TEXT NOT NULL,
    unit VARCHAR(20) DEFAULT 'c/u',
    unit_price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: conductors
-- ============================================
CREATE TABLE IF NOT EXISTS conductors (
    id VARCHAR(36) PRIMARY KEY,
    conductor_type VARCHAR(100) NOT NULL,
    voltage_system VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    phases INT NOT NULL,
    fcv_kva_m DECIMAL(10,2) NOT NULL,
    resistance_temp VARCHAR(20) DEFAULT '50°C',
    power_factor DECIMAL(5,2) DEFAULT 0.90,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TABLA: inspections
-- ============================================
CREATE TABLE IF NOT EXISTS inspections (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    image_url TEXT,
    annotations JSON,
    ai_analysis TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================
CREATE INDEX idx_licenses_user_id ON licenses(user_id);
CREATE INDEX idx_licenses_active ON licenses(is_active);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_demand_project_id ON demand_calculations(project_id);
CREATE INDEX idx_voltage_project_id ON voltage_drops(project_id);
CREATE INDEX idx_budgets_project_id ON budgets(project_id);
CREATE INDEX idx_reports_project_id ON reports(project_id);
CREATE INDEX idx_inspections_project_id ON inspections(project_id);

-- ============================================
-- COMENTARIOS SOBRE LA ESTRUCTURA
-- ============================================
-- Este esquema SQL está diseñado para PostgreSQL/MySQL
-- Los campos JSON almacenan estructuras complejas de datos
-- Todas las relaciones tienen DELETE CASCADE para mantener integridad referencial
-- Los timestamps automáticos facilitan el tracking de cambios

-- NOTA: En producción, la base de datos real es MongoDB (NoSQL)
-- Este script SQL es una representación relacional equivalente
-- para propósitos de análisis y backup estructurado
`;

    // Crear y descargar el archivo
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `electrodesign_schema_${new Date().toISOString().split('T')[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    setGenerating(false);
    toast.success('Archivo SQL generado y descargado correctamente');
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6" style={{color: 'var(--color-primary)'}} />
        <h2 className="text-lg font-bold" style={{color: 'var(--color-primary)'}}>
          Base de Datos del Sistema
        </h2>
      </div>

      <div className="space-y-6">
        <div className="p-4 rounded" style={{backgroundColor: 'var(--color-bg-main)'}}>
          <h3 className="font-semibold mb-2">Información del Sistema</h3>
          <p className="text-sm mb-2" style={{color: 'var(--color-text-secondary)'}}>
            ElectroDesign Pro utiliza MongoDB como base de datos NoSQL para almacenar:
          </p>
          <ul className="text-sm space-y-1 ml-4" style={{color: 'var(--color-text-secondary)'}}>
            <li>• Usuarios y licencias</li>
            <li>• Proyectos eléctricos</li>
            <li>• Cálculos de demanda</li>
            <li>• Análisis de caída de voltaje</li>
            <li>• Presupuestos (APU)</li>
            <li>• Reportes oficiales</li>
            <li>• Conductores y materiales</li>
          </ul>
        </div>

        {user?.role === 'admin' ? (
          <div className="space-y-4">
            <div className="p-4 rounded border-2" style={{borderColor: 'var(--color-success)', backgroundColor: '#f0fdf4'}}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Acceso Administrativo</h3>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Como administrador, puedes exportar el esquema de la base de datos en formato SQL.
              </p>
              <p className="text-xs text-green-600 mb-4">
                El archivo SQL generado contiene la estructura completa de tablas, índices y relaciones.
                Úsalo para documentación, análisis o como referencia para integraciones externas.
              </p>
              <button
                onClick={generateSQL}
                disabled={generating}
                className="btn btn-primary"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                {generating ? 'Generando...' : 'Descargar Esquema SQL'}
              </button>
            </div>

            <div className="p-3 rounded" style={{backgroundColor: '#fef3c7'}}>
              <p className="text-xs" style={{color: '#92400e'}}>
                <strong>Nota:</strong> La base de datos en producción es MongoDB (NoSQL). 
                El archivo SQL es una representación relacional equivalente para análisis estructurado.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded border" style={{borderColor: 'var(--color-border)', backgroundColor: 'var(--color-bg-main)'}}>
            <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              La gestión de la base de datos está restringida a usuarios administradores.
            </p>
            <p className="text-xs mt-2" style={{color: 'var(--color-text-secondary)'}}>
              Contacta al administrador del sistema si necesitas acceso a funciones de base de datos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseModule;
