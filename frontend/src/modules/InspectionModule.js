import React, { useState, useRef } from 'react';
import { Stage, Layer, Line, Circle, Text, Image as KonvaImage } from 'react-konva';
import { API } from '../App';
import { toast } from 'sonner';
import { Upload, Pencil, MapPin, Save, Trash2, Eye } from 'lucide-react';
import useImage from 'use-image';

const DrawingTools = {
  LINE: 'line',
  MARKER: 'marker'
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
  const [imageFile, setImageFile] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [tool, setTool] = useState(DrawingTools.LINE);
  const [markerType, setMarkerType] = useState(MarkerTypes.TRANSFORMER);
  const [drawings, setDrawings] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const stageRef = useRef(null);
  const [backgroundImage] = useImage(imageBase64);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result);
      };
      reader.readAsDataURL(file);
      setDrawings([]);
      setAnalysis(null);
    }
  };

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === DrawingTools.MARKER) {
      const newMarker = {
        type: 'marker',
        markerType,
        x: pos.x,
        y: pos.y,
        id: Date.now()
      };
      setDrawings([...drawings, newMarker]);
    } else if (tool === DrawingTools.LINE) {
      setIsDrawing(true);
      const newLine = {
        type: 'line',
        points: [pos.x, pos.y],
        id: Date.now()
      };
      setDrawings([...drawings, newLine]);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || tool !== DrawingTools.LINE) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = drawings[drawings.length - 1];
    
    if (lastLine && lastLine.type === 'line') {
      lastLine.points = lastLine.points.concat([point.x, point.y]);
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

  const handleClearDrawings = () => {
    setDrawings([]);
  };

  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
          Inspección del Sitio con Imágenes
        </h2>
        
        <div className="mb-4">
          <label className="btn btn-primary cursor-pointer inline-block" data-testid="upload-image-button">
            <Upload className="w-4 h-4 inline mr-2" />
            Cargar Imagen
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
          {imageFile && (
            <span className="ml-3 text-sm" style={{color: 'var(--color-text-secondary)'}}>{imageFile.name}</span>
          )}
        </div>

        {imageBase64 && (
          <div className="mb-4">
            <button
              onClick={handleAnalyzeImage}
              disabled={analyzing}
              className="btn btn-primary mr-2"
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

          <div className="canvas-container" data-testid="drawing-canvas">
            <Stage
              width={800}
              height={600}
              ref={stageRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <Layer>
                {backgroundImage && (
                  <KonvaImage
                    image={backgroundImage}
                    width={800}
                    height={600}
                  />
                )}
                {drawings.map((drawing) => {
                  if (drawing.type === 'line') {
                    return (
                      <Line
                        key={drawing.id}
                        points={drawing.points}
                        stroke="#0EA5E9"
                        strokeWidth={3}
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
                          radius={12}
                          fill="#EF4444"
                          stroke="#B91C1C"
                          strokeWidth={2}
                        />
                        <Text
                          x={drawing.x - 50}
                          y={drawing.y + 20}
                          text={drawing.markerType}
                          fontSize={12}
                          fontFamily="Inter"
                          fill="#0F172A"
                          padding={4}
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
              • <strong>Marcadores:</strong> Identifica equipos y elementos eléctricos específicos
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionModule;
