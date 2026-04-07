import React, { useState, useEffect } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingDown, CheckCircle, XCircle, Save } from 'lucide-react';

const VoltageDropModule = ({ projectId }) => {
  const [conductors, setConductors] = useState([]);
  const [limitBT, setLimitBT] = useState(3.0);
  const [limitMT, setLimitMT] = useState(5.0);
  const [segmentsBT, setSegmentsBT] = useState([
    { id: 1, ref: '1', length: '', clients: '', kva: '', conductor_id: '', ffuc: 0.7 }
  ]);
  const [segmentsMT, setSegmentsMT] = useState([
    { id: 1, ref: '1', length: '', transformers: '', kva: '', conductor_id: '', ffuc: 0.7 }
  ]);
  const [resultBT, setResultBT] = useState(null);
  const [resultMT, setResultMT] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConductors();
    loadSavedData();
  }, [projectId]);

  const loadConductors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/conductors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConductors(data);
      }
    } catch (error) {
      console.error('Error al cargar conductores:', error);
    }
  };

  const loadSavedData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/voltage-drop/load/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          if (data.circuit_type === 'BT') {
            setSegmentsBT(data.segments || [{ id: 1, ref: '1', length: '', clients: '', kva: '', conductor_id: '', ffuc: 0.7 }]);
            setLimitBT(data.limit || 3.0);
            setResultBT(data);
          } else if (data.circuit_type === 'MT') {
            setSegmentsMT(data.segments || [{ id: 1, ref: '1', length: '', transformers: '', kva: '', conductor_id: '', ffuc: 0.7 }]);
            setLimitMT(data.limit || 5.0);
            setResultMT(data);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSegment = (type) => {
    if (type === 'BT') {
      setSegmentsBT([...segmentsBT, {
        id: Date.now(),
        ref: `${segmentsBT.length + 1}`,
        length: '',
        clients: '',
        kva: '',
        conductor_id: '',
        ffuc: 0.7
      }]);
    } else {
      setSegmentsMT([...segmentsMT, {
        id: Date.now(),
        ref: `${segmentsMT.length + 1}`,
        length: '',
        transformers: '',
        kva: '',
        conductor_id: '',
        ffuc: 0.7
      }]);
    }
  };

  const updateSegment = (type, id, field, value) => {
    const setter = type === 'BT' ? setSegmentsBT : setSegmentsMT;
    const segments = type === 'BT' ? segmentsBT : segmentsMT;
    setter(segments.map(seg =>
      seg.id === id ? { ...seg, [field]: value } : seg
    ));
  };

  const removeSegment = (type, id) => {
    const setter = type === 'BT' ? setSegmentsBT : setSegmentsMT;
    const segments = type === 'BT' ? segmentsBT : segmentsMT;
    if (segments.length > 1) {
      setter(segments.filter(seg => seg.id !== id));
    }
  };

  const handleCalculate = async (circuitType) => {
    setCalculating(true);
    const segments = circuitType === 'BT' ? segmentsBT : segmentsMT;
    const limit = circuitType === 'BT' ? limitBT : limitMT;
    
    // Convert string values to numbers and validate FFuc
    const processedSegments = segments.map(seg => {
      const ffuc = parseFloat(seg.ffuc) || 0.7;
      return {
        ...seg,
        length: parseFloat(seg.length) || 0,
        clients: parseInt(seg.clients) || 0,
        transformers: parseInt(seg.transformers) || 0,
        kva: parseFloat(seg.kva) || 0,
        ffuc: Math.min(Math.max(ffuc, 0.1), 0.9) // Ensure FFuc is between 0.1 and 0.9
      };
    });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/voltage-drop/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          circuit_type: circuitType,
          segments: processedSegments,
          limit: limit
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (circuitType === 'BT') {
          setResultBT(data);
        } else {
          setResultMT(data);
        }
        toast.success(`Cálculo ${circuitType} completado y guardado`);
      } else {
        toast.error('Error al calcular');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setCalculating(false);
  };

  if (loading) {
    return <div className="card">Cargando datos guardados...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cálculo Baja Tensión */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
          Cálculo de Caída de Voltaje - Baja Tensión (BT)
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
            Límite de Caída de Voltaje (%)
          </label>
          <input
            type="number"
            className="input w-32"
            value={limitBT}
            onChange={(e) => setLimitBT(parseFloat(e.target.value) || 3.0)}
            step="0.1"
            min="0"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Tramos del Circuito BT</h3>
            <button onClick={() => addSegment('BT')} className="btn btn-outline btn-sm">
              <Plus className="w-4 h-4 mr-1 inline" /> Agregar Tramo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Long. (m)</th>
                  <th>Clientes</th>
                  <th>kVA</th>
                  <th>Conductor</th>
                  <th>FFuc (p.u.)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {segmentsBT.map((seg, index) => (
                  <tr key={seg.id}>
                    <td className="mono">{seg.ref}</td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.length}
                        onChange={(e) => updateSegment('BT', seg.id, 'length', e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.clients}
                        onChange={(e) => updateSegment('BT', seg.id, 'clients', e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.kva}
                        onChange={(e) => updateSegment('BT', seg.id, 'kva', e.target.value)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <select
                        className="input"
                        value={seg.conductor_id}
                        onChange={(e) => updateSegment('BT', seg.id, 'conductor_id', e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {conductors.filter(c => c.voltage_system && (c.voltage_system.includes('120V') || c.voltage_system.includes('220V') || c.voltage_system.includes('240V'))).map(conductor => (
                          <option key={conductor.id} value={conductor.id}>
                            {conductor.conductor_type} {conductor.size} - {conductor.voltage_system} ({conductor.fcv_kva_m} kVA·m)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.ffuc}
                        onChange={(e) => updateSegment('BT', seg.id, 'ffuc', e.target.value)}
                        placeholder="0.7"
                        step="0.1"
                        min="0.1"
                        max="0.9"
                        title="Factor de Frecuencia de Uso de la Carga (0.1 a 0.9)"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => removeSegment('BT', seg.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={segmentsBT.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={() => handleCalculate('BT')}
          disabled={calculating}
          className="btn btn-primary"
        >
          <TrendingDown className="w-4 h-4 mr-2 inline" />
          {calculating ? 'Calculando...' : 'Calcular Caída BT'}
        </button>

        {resultBT && (
          <div className="mt-6">
            <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Resultados - BT</h3>
            
            <div className="overflow-x-auto mb-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref.</th>
                    <th>kVA Acum.</th>
                    <th>kVA·m</th>
                    <th>FCV Tramo</th>
                    <th>% Caída</th>
                  </tr>
                </thead>
                <tbody>
                  {resultBT.segments.map((seg, idx) => (
                    <tr key={idx}>
                      <td className="mono">{seg.ref}</td>
                      <td className="mono">{seg.accumulated_kva?.toFixed(2)}</td>
                      <td className="mono">{seg.kva_m?.toFixed(2)}</td>
                      <td className="mono">{seg.fcv_tramo?.toFixed(4)}</td>
                      <td className="mono font-semibold">{seg.drop_percent?.toFixed(3)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: resultBT.compliant ? '#D1FAE5' : '#FEE2E2'}}>
                    <td colSpan="4" className="font-bold">Caída Total</td>
                    <td className="mono font-bold">{resultBT.total_drop?.toFixed(3)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`p-4 rounded flex items-center gap-3 ${resultBT.compliant ? 'bg-green-50' : 'bg-red-50'}`}>
              {resultBT.compliant ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="font-bold" style={{color: resultBT.compliant ? '#059669' : '#DC2626'}}>
                  {resultBT.compliant ? '✓ Cumple con el límite' : '✗ No cumple con el límite'}
                </p>
                <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  Límite: {resultBT.limit}% | Caída: {resultBT.total_drop?.toFixed(3)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cálculo Media Tensión */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>
          Cálculo de Caída de Voltaje - Media Tensión (MT)
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>
            Límite de Caída de Voltaje (%)
          </label>
          <input
            type="number"
            className="input w-32"
            value={limitMT}
            onChange={(e) => setLimitMT(parseFloat(e.target.value) || 5.0)}
            step="0.1"
            min="0"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Tramos del Circuito MT</h3>
            <button onClick={() => addSegment('MT')} className="btn btn-outline btn-sm">
              <Plus className="w-4 h-4 mr-1 inline" /> Agregar Tramo
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ref.</th>
                  <th>Long. (m)</th>
                  <th>Transformadores</th>
                  <th>kVA</th>
                  <th>Conductor</th>
                  <th>FFuc (p.u.)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {segmentsMT.map((seg, index) => (
                  <tr key={seg.id}>
                    <td className="mono">{seg.ref}</td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.length}
                        onChange={(e) => updateSegment('MT', seg.id, 'length', e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.transformers}
                        onChange={(e) => updateSegment('MT', seg.id, 'transformers', e.target.value)}
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.kva}
                        onChange={(e) => updateSegment('MT', seg.id, 'kva', e.target.value)}
                        placeholder="0"
                        step="0.01"
                        min="0"
                      />
                    </td>
                    <td>
                      <select
                        className="input"
                        value={seg.conductor_id}
                        onChange={(e) => updateSegment('MT', seg.id, 'conductor_id', e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {conductors.map(conductor => (
                          <option key={conductor.id} value={conductor.id}>
                            {conductor.conductor_type} {conductor.size} - {conductor.voltage_system} ({conductor.fcv_kva_m} kVA·m)
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.ffuc}
                        onChange={(e) => updateSegment('MT', seg.id, 'ffuc', e.target.value)}
                        placeholder="0.7"
                        step="0.1"
                        min="0.1"
                        max="0.9"
                        title="Factor de Frecuencia de Uso de la Carga (0.1 a 0.9)"
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => removeSegment('MT', seg.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={segmentsMT.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={() => handleCalculate('MT')}
          disabled={calculating}
          className="btn btn-primary"
        >
          <TrendingDown className="w-4 h-4 mr-2 inline" />
          {calculating ? 'Calculando...' : 'Calcular Caída MT'}
        </button>

        {resultMT && (
          <div className="mt-6">
            <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Resultados - MT</h3>
            
            <div className="overflow-x-auto mb-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Ref.</th>
                    <th>kVA Acum.</th>
                    <th>kVA·km</th>
                    <th>FCV Tramo</th>
                    <th>% Caída</th>
                  </tr>
                </thead>
                <tbody>
                  {resultMT.segments.map((seg, idx) => (
                    <tr key={idx}>
                      <td className="mono">{seg.ref}</td>
                      <td className="mono">{seg.accumulated_kva?.toFixed(2)}</td>
                      <td className="mono">{seg.kva_km?.toFixed(2)}</td>
                      <td className="mono">{seg.fcv_tramo?.toFixed(4)}</td>
                      <td className="mono font-semibold">{seg.drop_percent?.toFixed(3)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: resultMT.compliant ? '#D1FAE5' : '#FEE2E2'}}>
                    <td colSpan="4" className="font-bold">Caída Total</td>
                    <td className="mono font-bold">{resultMT.total_drop?.toFixed(3)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className={`p-4 rounded flex items-center gap-3 ${resultMT.compliant ? 'bg-green-50' : 'bg-red-50'}`}>
              {resultMT.compliant ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="font-bold" style={{color: resultMT.compliant ? '#059669' : '#DC2626'}}>
                  {resultMT.compliant ? '✓ Cumple con el límite' : '✗ No cumple con el límite'}
                </p>
                <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                  Límite: {resultMT.limit}% | Caída: {resultMT.total_drop?.toFixed(3)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoltageDropModule;
