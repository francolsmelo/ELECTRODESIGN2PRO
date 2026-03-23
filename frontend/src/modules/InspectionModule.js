import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Text, Image as KonvaImage } from 'react-konva';
import { API } from '../App';
import { toast } from 'sonner';
import { Upload, Pencil, MapPin, Save, Trash2, Eye, Plus } from 'lucide-react';
import useImage from 'use-image';

const DrawingTools = {
  LINE: 'line',
  MARKER: 'marker'
};

const LineTypes = {
  MT: { name: 'Media Tensión', color: '#EF4444' }, // Rojo
  BT: { name: 'Baja Tensión', color: '#22C55E' },  // Verde
  TIERRA: { name: 'Neutro/Tierra', color: '#EAB308' } // Amarillo
};

const MarkerTypes = {
  TRANSFORMER: 'Transformador',
  METER: 'Medidor',
  PANEL: 'Tablero',
  POLE: 'Poste',
  GROUNDING: 'Puesta a Tierra',
  MANHOLE: 'Pozo de Revisión'
};

const InspectionModule = ({ projectId }) => {
  const [imageFiles, setImageFiles] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageBase64, setImageBase64] = useState(null);
  const [tool, setTool] = useState(DrawingTools.LINE);
  const [lineType, setLineType] = useState('MT');
  const [markerType, setMarkerType] = useState(MarkerTypes.TRANSFORMER);
  const [drawings, setDrawings] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [inspectionTitle, setInspectionTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedInspections, setSavedInspections] = useState([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [currentInspectionId, setCurrentInspectionId] = useState(null);
  const stageRef = useRef(null);
  const [backgroundImage] = useImage(imageBase64);

  useEffect(() => {
    loadSavedInspections();
  }, [projectId]);

  const loadSavedInspections = async () => {
    setLoadingInspections(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/inspection/list/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedInspections(data);
      }
    } catch (error) {
      console.error('Error loading inspections:', error);
    }
    setLoadingInspections(false);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(files);
      setCurrentImageIndex(0);
      loadImageAtIndex(files, 0);
      toast.success(`${files.length} imagen(es) cargadas. Trabaja en cada una y guárdalas.`);
    }
  };

  const loadImageAtIndex = (files, index) => {
    if (index >= 0 && index < files.length) {
      const file = files[index];
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1200;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          setImageDimensions({ width, height });
          setScale(1);
        };
        img.src = reader.result;
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
      setDrawings([]);
      setAnalysis(null);
      setInspectionTitle(`Inspección ${index + 1} de ${files.length} - ${file.name}`);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < imageFiles.length - 1) {
      const nextIndex = currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
      loadImageAtIndex(imageFiles, nextIndex);
    }
  };

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      const prevIndex = currentImageIndex - 1;
      setCurrentImageIndex(prevIndex);
      loadImageAtIndex(imageFiles, prevIndex);
    }
  };

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    const adjustedX = pos.x / scale;
    const adjustedY = pos.y / scale;
    
    if (tool === DrawingTools.MARKER) {
      const newMarker = {
        type: 'marker',
        markerType,
        x: adjustedX,
        y: adjustedY,
        id: Date.now()
      };
      setDrawings([...drawings, newMarker]);
    } else if (tool === DrawingTools.LINE) {
      setIsDrawing(true);
      const newLine = {
        type: 'line',
        lineType: lineType,
        color: LineTypes[lineType].color,
        points: [adjustedX, adjustedY],
        id: Date.now()
      };
      setDrawings([...drawings, newLine]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || tool !== DrawingTools.LINE) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const adjustedX = point.x / scale;
    const adjustedY = point.y / scale;
    let lastLine = drawings[drawings.length - 1];
    
    if (lastLine && lastLine.type === 'line') {
      lastLine.points = lastLine.points.concat([adjustedX, adjustedY]);
      setDrawings([...drawings.slice(0, -1), lastLine]);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleAnalyzeImage = async () => {
    if (!imageBase64) {
      toast.error('Por favor carga una imagen primero');
      return;
    }

    setAnalyzing(true);
    try {
      const base64Data = imageBase64.split(',')[1];
      const formData = new FormData();
      formData.append('image_base64', base64Data);
      formData.append('project_id', projectId);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/inspection/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data.analysis);
        setShowAnalysis(true);
        toast.success('Análisis completado');
      } else {
        toast.error('Error al analizar la imagen');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setAnalyzing(false);
  };

  const handleSaveInspection = async () => {
    if (!imageBase64) {
      toast.error('No hay imagen para guardar');
      return;
    }

    if (!inspectionTitle.trim()) {
      toast.error('Por favor ingresa un título para la inspección');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('project_id', projectId);
      formData.append('image_base64', imageBase64);
      formData.append('drawings', JSON.stringify(drawings));
      formData.append('title', inspectionTitle);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/inspection/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentInspectionId(data.inspection_id);
        toast.success('✓ Inspección guardada correctamente en la base de datos');
        loadSavedInspections();
      } else {
        toast.error('Error al guardar la inspección');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setSaving(false);
  };

  const handleLoadInspection = async (inspectionId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/inspection/${inspectionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setImageBase64(data.image_data);
        setDrawings(data.drawings || []);
        setInspectionTitle(data.title || '');
        setCurrentInspectionId(inspectionId);
        
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1200;
          const maxHeight = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
          
          setImageDimensions({ width, height });
          setScale(1);
        };
        img.src = data.image_data;
        
        toast.success('Inspección cargada');
      }
    } catch (error) {
      toast.error('Error al cargar inspección');
    }
  };

  const handleDeleteInspection = async (inspectionId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta inspección?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/inspection/${inspectionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Inspección eliminada');
        loadSavedInspections();
        if (currentInspectionId === inspectionId) {
          setImageBase64(null);
          setDrawings([]);
          setInspectionTitle('');
          setCurrentInspectionId(null);
        }
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleNewInspection = () => {
    setImageBase64(null);
    setImageFiles([]);
    setCurrentImageIndex(0);
    setDrawings([]);
    setInspectionTitle('');
    setCurrentInspectionId(null);
    setAnalysis(null);
  };

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="card" style={{position: 'sticky', top: '1rem'}}>
          <h3 className="text-md font-bold mb-3" style={{color: 'var(--color-primary)'}}>
            Inspecciones Guardadas
          </h3>
          
          <button
            onClick={handleNewInspection}
            className="btn btn-primary w-full mb-3"
            data-testid="new-inspection-button"
          >
            <Plus className="w-4 h-4 mr-2 inline" />
            Nueva Inspección
          </button>

          {loadingInspections ? (
            <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>Cargando...</p>
          ) : savedInspections.length === 0 ? (
            <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>No hay inspecciones guardadas</p>
          ) : (
            <div className="space-y-2" style={{maxHeight: '600px', overflowY: 'auto'}}>
              {savedInspections.map(inspection => (
                <div
                  key={inspection.id}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    currentInspectionId === inspection.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleLoadInspection(inspection.id)}
                  data-testid={`inspection-item-${inspection.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm" style={{color: 'var(--color-primary)'}}>
                        {inspection.title}
                      </p>
                      <p className="text-xs mt-1" style={{color: 'var(--color-text-secondary)'}}>
                        {new Date(inspection.created_at).toLocaleDateString('es-EC', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                      {inspection.drawings && (
                        <p className="text-xs mt-1" style={{color: 'var(--color-text-tertiary)'}}>
                          {inspection.drawings.length} elementos dibujados
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteInspection(inspection.id);
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="card mb-6">
          <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
            Inspección del Sitio con Imágenes
          </h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
              Título de la Inspección
            </label>
            <input
              type="text"
              className="input"
              value={inspectionTitle}
              onChange={(e) => setInspectionTitle(e.target.value)}
              placeholder="Ej: Inspección Sector Norte - Poste #123"
              data-testid="inspection-title-input"
            />
          </div>

          <div className="flex gap-2 mb-4">
            <label className="btn btn-primary cursor-pointer" data-testid="upload-image-button">
              <Upload className="w-4 h-4 inline mr-2" />
              Cargar Imágenes (múltiples)
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {imageFiles.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm px-3" style={{color: 'var(--color-text-secondary)'}}>
                  {imageFiles.length} imagen(es) | Actual: {currentImageIndex + 1}
                </span>
                <button
                  onClick={handlePrevImage}
                  disabled={currentImageIndex === 0}
                  className="btn btn-outline btn-sm"
                >
                  ← Anterior
                </button>
                <button
                  onClick={handleNextImage}
                  disabled={currentImageIndex === imageFiles.length - 1}
                  className="btn btn-outline btn-sm"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </div>

          {imageBase64 && (
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={handleSaveInspection}
                disabled={saving || !inspectionTitle.trim()}
                className="btn btn-primary"
                data-testid="save-inspection-button"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {saving ? 'Guardando...' : 'Guardar Inspección'}
              </button>
              <button
                onClick={handleAnalyzeImage}
                disabled={analyzing}
                className="btn btn-outline"
                data-testid="analyze-image-button"
              >
                <Eye className="w-4 h-4 inline mr-2" />
                {analyzing ? 'Analizando...' : 'Analizar con IA'}
              </button>
              {analysis && (
                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="btn btn-outline"
                  data-testid="toggle-analysis-button"
                >
                  {showAnalysis ? 'Ocultar' : 'Ver'} Análisis
                </button>
              )}
            </div>
          )}

          {showAnalysis && analysis && (
            <div className="mb-4 p-4 rounded border" style={{backgroundColor: '#F0F9FF', borderColor: 'var(--color-border)'}} data-testid="analysis-result">
              <h3 className="font-semibold mb-2" style={{color: 'var(--color-primary)'}}>Análisis de IA:</h3>
              <p className="text-sm whitespace-pre-wrap" style={{color: 'var(--color-text-primary)'}}>{analysis}</p>
            </div>
          )}
        </div>

        {imageBase64 && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4" style={{color: 'var(--color-primary)'}}>
              Herramientas de Dibujo
            </h3>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setTool(DrawingTools.LINE)}
                className={`btn ${tool === DrawingTools.LINE ? 'btn-primary' : 'btn-outline'}`}
                data-testid="tool-line-button"
              >
                <Pencil className="w-4 h-4 mr-2 inline" />
                Dibujo Libre (Cables)
              </button>
              <button
                onClick={() => setTool(DrawingTools.MARKER)}
                className={`btn ${tool === DrawingTools.MARKER ? 'btn-primary' : 'btn-outline'}`}
                data-testid="tool-marker-button"
              >
                <MapPin className="w-4 h-4 mr-2 inline" />
                Marcador (Equipos)
              </button>
              <button
                onClick={handleClearDrawings}
                className="btn btn-outline"
                data-testid="clear-drawings-button"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Limpiar
              </button>
            </div>

            {tool === DrawingTools.LINE && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
                  Tipo de Línea:
                </label>
                <div className="flex gap-2">
                  {Object.entries(LineTypes).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setLineType(key)}
                      className={`btn ${lineType === key ? 'btn-primary' : 'btn-outline'}`}
                      style={lineType === key ? {backgroundColor: value.color, borderColor: value.color} : {}}
                    >
                      <div 
                        className="w-4 h-4 rounded-full mr-2 inline-block"
                        style={{backgroundColor: value.color}}
                      />
                      {value.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tool === DrawingTools.MARKER && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
                  Tipo de Marcador:
                </label>
                <select
                  value={markerType}
                  onChange={(e) => setMarkerType(e.target.value)}
                  className="input"
                  style={{maxWidth: '300px'}}
                  data-testid="marker-type-select"
                >
                  {Object.entries(MarkerTypes).map(([key, value]) => (
                    <option key={key} value={value}>{value}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                className="btn btn-outline"
                disabled={scale <= 0.5}
              >
                Zoom -
              </button>
              <span className="text-sm mono" style={{color: 'var(--color-text-secondary)'}}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(Math.min(2, scale + 0.1))}
                className="btn btn-outline"
                disabled={scale >= 2}
              >
                Zoom +
              </button>
              <button
                onClick={() => setScale(1)}
                className="btn btn-outline"
              >
                Restablecer
              </button>
            </div>

            <div className="canvas-container" data-testid="drawing-canvas" style={{overflow: 'auto', maxHeight: '800px'}}>
              <Stage
                width={imageDimensions.width * scale}
                height={imageDimensions.height * scale}
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                scaleX={scale}
                scaleY={scale}
              >
                <Layer>
                  {backgroundImage && (
                    <KonvaImage
                      image={backgroundImage}
                      width={imageDimensions.width}
                      height={imageDimensions.height}
                    />
                  )}
                  {drawings.map((drawing) => {
                    if (drawing.type === 'line') {
                      return (
                        <Line
                          key={drawing.id}
                          points={drawing.points}
                          stroke={drawing.color || '#0EA5E9'}
                          strokeWidth={3 / scale}
                          tension={0.5}
                          lineCap="round"
                          lineJoin="round"
                        />
                      );
                    } else if (drawing.type === 'marker') {
                      return (
                        <React.Fragment key={drawing.id}>
                          <Circle
                            x={drawing.x}
                            y={drawing.y}
                            radius={12 / scale}
                            fill="#EF4444"
                            stroke="#B91C1C"
                            strokeWidth={2 / scale}
                          />
                          <Text
                            x={drawing.x - 50 / scale}
                            y={drawing.y + 20 / scale}
                            text={drawing.markerType}
                            fontSize={12 / scale}
                            fontFamily="Inter"
                            fill="#0F172A"
                            padding={4 / scale}
                            backgroundColor="#FFFFFF"
                          />
                        </React.Fragment>
                      );
                    }
                    return null;
                  })}
                </Layer>
              </Stage>
            </div>

            <div className="mt-4">
              <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                • <strong>Dibujo Libre:</strong> Representa cables y conexiones eléctricas<br/>
                • <strong>Marcadores:</strong> Identifica equipos y elementos eléctricos específicos<br/>
                • <strong>Zoom:</strong> Usa los controles de zoom para ajustar la vista de la imagen<br/>
                • <strong>Guardar:</strong> Todas las inspecciones se guardan en la base de datos con sus dibujos
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InspectionModule;
