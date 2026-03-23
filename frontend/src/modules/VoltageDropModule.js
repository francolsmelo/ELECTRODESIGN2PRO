import React, { useState } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingDown, CheckCircle, XCircle } from 'lucide-react';

const VoltageDropModule = ({ projectId }) => {
  const [limitBT, setLimitBT] = useState(3.0);
  const [limitMT, setLimitMT] = useState(5.0);
  const [segmentsBT, setSegmentsBT] = useState([
    { id: 1, ref: '1', length: '', clients: '', kva: '', conductors: '', conductor_size: '', fcv: '' }
  ]);
  const [segmentsMT, setSegmentsMT] = useState([
    { id: 1, ref: '1', length: '', transformers: '', kva: '', conductors: '', conductor_size: '', fcv: '' }
  ]);
  const [resultBT, setResultBT] = useState(null);
  const [resultMT, setResultMT] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const addSegment = (type) => {
    if (type === 'BT') {
      setSegmentsBT([...segmentsBT, {
        id: Date.now(),
        ref: `${segmentsBT.length + 1}`,
        length: '',
        clients: '',
        kva: '',
        conductors: '',
        conductor_size: '',
        fcv: ''
      }]);
    } else {
      setSegmentsMT([...segmentsMT, {
        id: Date.now(),
        ref: `${segmentsMT.length + 1}`,
        length: '',
        transformers: '',
        kva: '',
        conductors: '',
        conductor_size: '',
        fcv: ''
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
    
    // Convert string values to numbers
    const processedSegments = segments.map(seg => ({
      ...seg,
      length: parseFloat(seg.length) || 0,
      clients: parseInt(seg.clients) || 0,
      transformers: parseInt(seg.transformers) || 0,
      kva: parseFloat(seg.kva) || 0,
      conductors: parseInt(seg.conductors) || 0,
      fcv: parseFloat(seg.fcv) || 0
    }));
    
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
        toast.success(`Cálculo ${circuitType} completado`);
      } else {
        toast.error('Error al calcular');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setCalculating(false);
  };

  const renderSegmentTable = (type, segments, limit) => {
    return (
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold" style={{color: 'var(--color-primary)'}}>
              {type === 'BT' ? 'Baja Tensión (Secundarios)' : 'Media Tensión (Primarios)'}
            </h3>
            <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
              {type === 'BT' ? 'Método kVA·m' : 'Método kVA·km'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium" style={{color: 'var(--color-text-secondary)'}}>
              Límite (%):
            </label>
            <input
              type="text"
              inputMode="decimal"
              className="input mono"
              style={{width: '80px'}}
              value={type === 'BT' ? limitBT : limitMT}
              onChange={(e) => type === 'BT' ? setLimitBT(e.target.value) : setLimitMT(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-sm" style={{color: 'var(--color-primary)'}}>Tramos del Circuito</h4>
          <button onClick={() => addSegment(type)} className="btn btn-outline btn-sm">
            <Plus className="w-4 h-4 mr-1 inline" /> Agregar Tramo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Long. ({type === 'BT' ? 'm' : 'km'})</th>
                <th>{type === 'BT' ? 'Clientes' : 'Transformadores'}</th>
                <th>DMUp (kVA)</th>
                <th>N° Cond./Fase</th>
                <th>Conductor</th>
                <th>FCV</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => (
                <tr key={seg.id}>
                  <td>
                    <input
                      type="text"
                      className="input mono"
                      value={seg.ref}
                      onChange={(e) => updateSegment(type, seg.id, 'ref', e.target.value)}
                      style={{width: '60px'}}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input mono"
                      value={seg.length}
                      onChange={(e) => updateSegment(type, seg.id, 'length', e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input mono"
                      value={type === 'BT' ? seg.clients : seg.transformers}
                      onChange={(e) => updateSegment(type, seg.id, type === 'BT' ? 'clients' : 'transformers', e.target.value)}
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input mono"
                      value={seg.kva}
                      onChange={(e) => updateSegment(type, seg.id, 'kva', e.target.value)}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="input mono"
                      value={seg.conductors}
                      onChange={(e) => updateSegment(type, seg.id, 'conductors', e.target.value)}
                      placeholder="3"
                      style={{width: '60px'}}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      value={seg.conductor_size}
                      onChange={(e) => updateSegment(type, seg.id, 'conductor_size', e.target.value)}
                      placeholder={type === 'BT' ? 'Ej: 2/0 AWG' : 'Ej: ACSR 2'}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="input mono"
                      value={seg.fcv}
                      onChange={(e) => updateSegment(type, seg.id, 'fcv', e.target.value)}
                      placeholder="0.0000"
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => removeSegment(type, seg.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={segments.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4">
          <button
            onClick={() => handleCalculate(type)}
            disabled={calculating}
            className="btn btn-primary"
          >
            <TrendingDown className="w-4 h-4 mr-2 inline" />
            {calculating ? 'Calculando...' : `Calcular Caída ${type}`}
          </button>
        </div>

        {(type === 'BT' ? resultBT : resultMT) && renderResult(type, type === 'BT' ? resultBT : resultMT)}
      </div>
    );
  };

  const renderResult = (type, result) => {
    return (
      <div className="mt-6" data-testid={`voltage-result-${type}`}>
        <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Resultados del Cálculo {type}</h3>
        
        <div className="overflow-x-auto mb-6">
          <table className="table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Long.</th>
                <th>kVA Parcial</th>
                <th className="mono">kVA Acumulado</th>
                <th className="mono">{type === 'BT' ? 'kVA·m' : 'kVA·km'}</th>
                <th className="mono">% Caída</th>
              </tr>
            </thead>
            <tbody>
              {result.segments.map((seg, index) => (
                <tr key={index}>
                  <td className="mono">{seg.ref}</td>
                  <td className="mono">{seg.length.toFixed(2)}</td>
                  <td className="mono">{seg.kva.toFixed(2)}</td>
                  <td className="mono font-semibold">{seg.accumulated_kva?.toFixed(2) || '0.00'}</td>
                  <td className="mono font-semibold">
                    {type === 'BT' ? seg.kva_m?.toFixed(2) : seg.kva_km?.toFixed(2)}
                  </td>
                  <td className="mono font-bold" style={{color: 'var(--color-secondary)'}}>
                    {seg.drop_percent?.toFixed(3)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{backgroundColor: 'var(--color-bg-main)'}}>
                <td colSpan="5" className="font-bold">CAÍDA TOTAL</td>
                <td className="mono font-bold text-lg" style={{color: result.compliant ? 'var(--color-success)' : 'var(--color-danger)'}}>
                  {result.total_drop.toFixed(3)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center gap-4 p-4 rounded border" style={{
          borderColor: result.compliant ? 'var(--color-success)' : 'var(--color-danger)',
          backgroundColor: result.compliant ? '#DCFCE7' : '#FEE2E2'
        }}>
          {result.compliant ? (
            <CheckCircle className="w-8 h-8" style={{color: 'var(--color-success)'}} />
          ) : (
            <XCircle className="w-8 h-8" style={{color: 'var(--color-danger)'}} />
          )}
          <div>
            <p className="font-bold" style={{color: result.compliant ? '#16a34a' : '#dc2626'}}>
              {result.compliant ? '✓ CUMPLE CON LA NORMATIVA' : '✗ NO CUMPLE CON LA NORMATIVA'}
            </p>
            <p className="text-sm" style={{color: result.compliant ? '#16a34a' : '#dc2626'}}>
              Caída total: {result.total_drop.toFixed(3)}% | Límite: {result.limit}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Cálculo de Caída de Voltaje</h2>
        <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>
          Método kVA·m / kVA·km según normativa ecuatoriana. Trabaja ambos circuitos simultáneamente.
        </p>
        <p className="text-xs mb-4" style={{color: 'var(--color-text-tertiary)'}}>
          <strong>Nota:</strong> "N° Cond./Fase" indica el número de conductores <strong>por fase</strong> en el circuito.
        </p>
      </div>

      {renderSegmentTable('BT', segmentsBT, limitBT)}
      {renderSegmentTable('MT', segmentsMT, limitMT)}
    </div>
  );
};

export default VoltageDropModule;
