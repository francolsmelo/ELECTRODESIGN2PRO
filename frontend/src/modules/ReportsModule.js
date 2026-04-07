import React, { useState, useEffect } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { FileText, Save, Download } from 'lucide-react';

const ReportsModule = ({ projectId }) => {
  const [activeReport, setActiveReport] = useState('autorizacion');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Formulario de Autorización
  const [autorizacionData, setAutorizacionData] = useState({
    fecha_dia: '',
    fecha_mes: '',
    fecha_anio: '',
    ingeniero_nombre: '',
    tipo_servicio: 'diseño', // diseño o construcción
    nombre_proyecto: '',
    calle_ubicacion: '',
    ciudad: '',
    sector: '',
    provincia: '',
    firma_propietario: ''
  });

  // Formulario de Factibilidad
  const [factibilidadData, setFactibilidadData] = useState({
    fecha_dia: '',
    fecha_mes: '',
    fecha_anio: '',
    nombre_proyecto: '',
    calle_principal: '',
    calle_secundaria: '',
    parroquia: '',
    canton: '',
    sector_referencia: '',
    promotor_propietario: '',
    ruc_cedula: '',
    carga_instalada_kw: '',
    demanda_kva: '',
    tipo_instalacion: '',
    numero_fases: '',
    nivel_voltaje: '',
    tipo_red: 'Aérea' // Aérea o Subterránea
  });

  // Formulario de Fiscalización
  const [fiscalizacionData, setFiscalizacionData] = useState({
    fecha_dia: '',
    fecha_mes: '',
    fecha_anio: '',
    ingeniero_director_nombre: '',
    proyecto_electrico_nombre: '',
    proyecto_ubicacion: '',
    ingeniero_profesional: '',
    direccion_profesional: '',
    telefono_profesional: '',
    email_profesional: ''
  });

  useEffect(() => {
    loadReports();
  }, [projectId]);

  const loadReports = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/reports/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const reports = await response.json();
        
        // Cargar cada tipo de reporte si existe
        reports.forEach(report => {
          if (report.report_type === 'autorizacion' && report.data) {
            setAutorizacionData(report.data);
          } else if (report.report_type === 'factibilidad' && report.data) {
            setFactibilidadData(report.data);
          } else if (report.report_type === 'fiscalizacion' && report.data) {
            setFiscalizacionData(report.data);
          }
        });
      }
    } catch (error) {
      console.error('Error al cargar reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (reportType) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      let data = {};
      if (reportType === 'autorizacion') data = autorizacionData;
      else if (reportType === 'factibilidad') data = factibilidadData;
      else if (reportType === 'fiscalizacion') data = fiscalizacionData;

      const response = await fetch(`${API}/reports/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          report_type: reportType,
          data: data
        })
      });

      if (response.ok) {
        toast.success('Reporte guardado correctamente');
      } else {
        toast.error('Error al guardar reporte');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="card">Cargando reportes...</div>;
  }

  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
          Módulo de Reportes Oficiales
        </h2>
        <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>
          Genere los documentos oficiales requeridos para su proyecto eléctrico
        </p>

        {/* Pestañas de Reportes */}
        <div className="flex gap-2 mb-6 border-b" style={{borderColor: 'var(--color-border)'}}>
          <button
            onClick={() => setActiveReport('autorizacion')}
            className={`px-4 py-2 font-medium ${activeReport === 'autorizacion' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Autorización del Propietario
          </button>
          <button
            onClick={() => setActiveReport('factibilidad')}
            className={`px-4 py-2 font-medium ${activeReport === 'factibilidad' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Solicitud de Factibilidad
          </button>
          <button
            onClick={() => setActiveReport('fiscalizacion')}
            className={`px-4 py-2 font-medium ${activeReport === 'fiscalizacion' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Solicitud de Fiscalización
          </button>
        </div>
      </div>

      {/* Formulario de Autorización */}
      {activeReport === 'autorizacion' && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
            Autorización del Propietario
          </h3>
          <p className="text-sm mb-6" style={{color: 'var(--color-text-secondary)'}}>
            Complete los datos para generar la autorización del propietario
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Día</label>
                <input
                  type="text"
                  className="input"
                  value={autorizacionData.fecha_dia}
                  onChange={(e) => setAutorizacionData({...autorizacionData, fecha_dia: e.target.value})}
                  placeholder="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mes</label>
                <input
                  type="text"
                  className="input"
                  value={autorizacionData.fecha_mes}
                  onChange={(e) => setAutorizacionData({...autorizacionData, fecha_mes: e.target.value})}
                  placeholder="Abril"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Año</label>
                <input
                  type="text"
                  className="input"
                  value={autorizacionData.fecha_anio}
                  onChange={(e) => setAutorizacionData({...autorizacionData, fecha_anio: e.target.value})}
                  placeholder="2025"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Ingeniero Contratado</label>
              <input
                type="text"
                className="input"
                value={autorizacionData.ingeniero_nombre}
                onChange={(e) => setAutorizacionData({...autorizacionData, ingeniero_nombre: e.target.value})}
                placeholder="Juan Pérez García"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Servicio</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipo_servicio"
                    value="diseño"
                    checked={autorizacionData.tipo_servicio === 'diseño'}
                    onChange={(e) => setAutorizacionData({...autorizacionData, tipo_servicio: e.target.value})}
                    className="mr-2"
                  />
                  Diseño
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipo_servicio"
                    value="construcción"
                    checked={autorizacionData.tipo_servicio === 'construcción'}
                    onChange={(e) => setAutorizacionData({...autorizacionData, tipo_servicio: e.target.value})}
                    className="mr-2"
                  />
                  Construcción
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Proyecto</label>
              <input
                type="text"
                className="input"
                value={autorizacionData.nombre_proyecto}
                onChange={(e) => setAutorizacionData({...autorizacionData, nombre_proyecto: e.target.value})}
                placeholder="Ampliación de Vivienda / Instalación de Nuevo Garaje"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ubicación (Calle y Número)</label>
              <input
                type="text"
                className="input"
                value={autorizacionData.calle_ubicacion}
                onChange={(e) => setAutorizacionData({...autorizacionData, calle_ubicacion: e.target.value})}
                placeholder="Calle Bolívar 123"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ciudad</label>
                <input
                  type="text"
                  className="input"
                  value={autorizacionData.ciudad}
                  onChange={(e) => setAutorizacionData({...autorizacionData, ciudad: e.target.value})}
                  placeholder="Ambato"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sector/Barrio</label>
                <input
                  type="text"
                  className="input"
                  value={autorizacionData.sector}
                  onChange={(e) => setAutorizacionData({...autorizacionData, sector: e.target.value})}
                  placeholder="El Centro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Provincia</label>
                <input
                  type="text"
                  className="input"
                  value={autorizacionData.provincia}
                  onChange={(e) => setAutorizacionData({...autorizacionData, provincia: e.target.value})}
                  placeholder="Tungurahua"
                />
              </div>
            </div>

            <button
              onClick={() => handleSave('autorizacion')}
              disabled={saving}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {saving ? 'Guardando...' : 'Guardar Autorización'}
            </button>
          </div>
        </div>
      )}

      {/* Formulario de Factibilidad */}
      {activeReport === 'factibilidad' && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
            Solicitud de Factibilidad de Servicio
          </h3>
          <p className="text-sm mb-6" style={{color: 'var(--color-text-secondary)'}}>
            Complete los datos para la solicitud de factibilidad ante la empresa eléctrica
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Día</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.fecha_dia}
                  onChange={(e) => setFactibilidadData({...factibilidadData, fecha_dia: e.target.value})}
                  placeholder="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mes</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.fecha_mes}
                  onChange={(e) => setFactibilidadData({...factibilidadData, fecha_mes: e.target.value})}
                  placeholder="Abril"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Año</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.fecha_anio}
                  onChange={(e) => setFactibilidadData({...factibilidadData, fecha_anio: e.target.value})}
                  placeholder="2025"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Proyecto</label>
              <input
                type="text"
                className="input"
                value={factibilidadData.nombre_proyecto}
                onChange={(e) => setFactibilidadData({...factibilidadData, nombre_proyecto: e.target.value})}
                placeholder="Nombre del proyecto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Calle Principal</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.calle_principal}
                  onChange={(e) => setFactibilidadData({...factibilidadData, calle_principal: e.target.value})}
                  placeholder="Av. Principal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Calle Secundaria</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.calle_secundaria}
                  onChange={(e) => setFactibilidadData({...factibilidadData, calle_secundaria: e.target.value})}
                  placeholder="Calle Secundaria"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Parroquia</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.parroquia}
                  onChange={(e) => setFactibilidadData({...factibilidadData, parroquia: e.target.value})}
                  placeholder="Nombre de la parroquia"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cantón</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.canton}
                  onChange={(e) => setFactibilidadData({...factibilidadData, canton: e.target.value})}
                  placeholder="Nombre del cantón"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sector de Referencia</label>
              <input
                type="text"
                className="input"
                value={factibilidadData.sector_referencia}
                onChange={(e) => setFactibilidadData({...factibilidadData, sector_referencia: e.target.value})}
                placeholder="Sector o barrio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Promotor/Propietario</label>
              <input
                type="text"
                className="input"
                value={factibilidadData.promotor_propietario}
                onChange={(e) => setFactibilidadData({...factibilidadData, promotor_propietario: e.target.value})}
                placeholder="Nombre del promotor o propietario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">RUC/Cédula</label>
              <input
                type="text"
                className="input"
                value={factibilidadData.ruc_cedula}
                onChange={(e) => setFactibilidadData({...factibilidadData, ruc_cedula: e.target.value})}
                placeholder="1234567890"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Carga Instalada (kW)</label>
                <input
                  type="number"
                  className="input"
                  value={factibilidadData.carga_instalada_kw}
                  onChange={(e) => setFactibilidadData({...factibilidadData, carga_instalada_kw: e.target.value})}
                  placeholder="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Demanda (kVA)</label>
                <input
                  type="number"
                  className="input"
                  value={factibilidadData.demanda_kva}
                  onChange={(e) => setFactibilidadData({...factibilidadData, demanda_kva: e.target.value})}
                  placeholder="0"
                  step="0.01"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Instalación</label>
              <input
                type="text"
                className="input"
                value={factibilidadData.tipo_instalacion}
                onChange={(e) => setFactibilidadData({...factibilidadData, tipo_instalacion: e.target.value})}
                placeholder="Residencial / Industrial / Comercial"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Número de Fases</label>
                <select
                  className="input"
                  value={factibilidadData.numero_fases}
                  onChange={(e) => setFactibilidadData({...factibilidadData, numero_fases: e.target.value})}
                >
                  <option value="">Seleccionar...</option>
                  <option value="1">Monofásico (1F)</option>
                  <option value="2">Bifásico (2F)</option>
                  <option value="3">Trifásico (3F)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Nivel de Voltaje (V)</label>
                <input
                  type="text"
                  className="input"
                  value={factibilidadData.nivel_voltaje}
                  onChange={(e) => setFactibilidadData({...factibilidadData, nivel_voltaje: e.target.value})}
                  placeholder="13800/127-220"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo de Red</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipo_red"
                    value="Aérea"
                    checked={factibilidadData.tipo_red === 'Aérea'}
                    onChange={(e) => setFactibilidadData({...factibilidadData, tipo_red: e.target.value})}
                    className="mr-2"
                  />
                  Aérea
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="tipo_red"
                    value="Subterránea"
                    checked={factibilidadData.tipo_red === 'Subterránea'}
                    onChange={(e) => setFactibilidadData({...factibilidadData, tipo_red: e.target.value})}
                    className="mr-2"
                  />
                  Subterránea
                </label>
              </div>
            </div>

            <button
              onClick={() => handleSave('factibilidad')}
              disabled={saving}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {saving ? 'Guardando...' : 'Guardar Solicitud de Factibilidad'}
            </button>
          </div>
        </div>
      )}

      {/* Formulario de Fiscalización */}
      {activeReport === 'fiscalizacion' && (
        <div className="card">
          <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
            Solicitud de Fiscalización y Energización
          </h3>
          <p className="text-sm mb-6" style={{color: 'var(--color-text-secondary)'}}>
            Complete los datos para la solicitud de fiscalización y energización del proyecto
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Día</label>
                <input
                  type="text"
                  className="input"
                  value={fiscalizacionData.fecha_dia}
                  onChange={(e) => setFiscalizacionData({...fiscalizacionData, fecha_dia: e.target.value})}
                  placeholder="20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mes</label>
                <input
                  type="text"
                  className="input"
                  value={fiscalizacionData.fecha_mes}
                  onChange={(e) => setFiscalizacionData({...fiscalizacionData, fecha_mes: e.target.value})}
                  placeholder="Abril"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Año</label>
                <input
                  type="text"
                  className="input"
                  value={fiscalizacionData.fecha_anio}
                  onChange={(e) => setFiscalizacionData({...fiscalizacionData, fecha_anio: e.target.value})}
                  placeholder="2025"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ingeniero Director de Distribución</label>
              <input
                type="text"
                className="input"
                value={fiscalizacionData.ingeniero_director_nombre}
                onChange={(e) => setFiscalizacionData({...fiscalizacionData, ingeniero_director_nombre: e.target.value})}
                placeholder="Nombre del Ingeniero Director"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Proyecto Eléctrico</label>
              <input
                type="text"
                className="input"
                value={fiscalizacionData.proyecto_electrico_nombre}
                onChange={(e) => setFiscalizacionData({...fiscalizacionData, proyecto_electrico_nombre: e.target.value})}
                placeholder="Nombre completo del proyecto"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ubicación del Proyecto</label>
              <textarea
                className="input"
                rows="3"
                value={fiscalizacionData.proyecto_ubicacion}
                onChange={(e) => setFiscalizacionData({...fiscalizacionData, proyecto_ubicacion: e.target.value})}
                placeholder="Dirección completa del proyecto (calle, sector, ciudad, provincia)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ingeniero Profesional Responsable</label>
              <input
                type="text"
                className="input"
                value={fiscalizacionData.ingeniero_profesional}
                onChange={(e) => setFiscalizacionData({...fiscalizacionData, ingeniero_profesional: e.target.value})}
                placeholder="Nombre completo del ingeniero responsable"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Dirección del Profesional</label>
              <input
                type="text"
                className="input"
                value={fiscalizacionData.direccion_profesional}
                onChange={(e) => setFiscalizacionData({...fiscalizacionData, direccion_profesional: e.target.value})}
                placeholder="Dirección completa"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Teléfono</label>
                <input
                  type="tel"
                  className="input"
                  value={fiscalizacionData.telefono_profesional}
                  onChange={(e) => setFiscalizacionData({...fiscalizacionData, telefono_profesional: e.target.value})}
                  placeholder="0999999999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">E-mail</label>
                <input
                  type="email"
                  className="input"
                  value={fiscalizacionData.email_profesional}
                  onChange={(e) => setFiscalizacionData({...fiscalizacionData, email_profesional: e.target.value})}
                  placeholder="ingeniero@ejemplo.com"
                />
              </div>
            </div>

            <button
              onClick={() => handleSave('fiscalizacion')}
              disabled={saving}
              className="btn btn-primary"
            >
              <Save className="w-4 h-4 mr-2 inline" />
              {saving ? 'Guardando...' : 'Guardar Solicitud de Fiscalización'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsModule;
