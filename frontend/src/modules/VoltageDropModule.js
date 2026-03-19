import React, { useState } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingDown, CheckCircle, XCircle } from 'lucide-react';

const VoltageDropModule = ({ projectId }) => {
  const [circuitType, setCircuitType] = useState('BT');
  const [limit, setLimit] = useState(3.0);
  const [segments, setSegments] = useState([
    { id: 1, ref: '1', length: 0, clients: 0, kva: 0, conductors: 3, conductor_size: '2/0 AWG', fcv: 1.0 }
  ]);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);

  const addSegment = () => {
    setSegments([...segments, {
      id: Date.now(),
      ref: `${segments.length + 1}`,
      length: 0,
      clients: 0,
      kva: 0,
      conductors: 3,
      conductor_size: '',
      fcv: 1.0
    }]);
  };

  const updateSegment = (id, field, value) => {
    setSegments(segments.map(seg =>
      seg.id === id ? { ...seg, [field]: value } : seg
    ));
  };

  const removeSegment = (id) => {
    if (segments.length > 1) {
      setSegments(segments.filter(seg => seg.id !== id));
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
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
          segments: segments,
          limit: limit
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success('Cálculo completado');
      } else {
        toast.error('Error al calcular');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setCalculating(false);
  };

  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Cálculo de Caída de Voltaje</h2>
        <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>Método kVA·m / kVA·km según normativa ecuatoriana</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Tipo de Circuito</label>
            <select
              className="input"
              value={circuitType}
              onChange={(e) => setCircuitType(e.target.value)}
              data-testid="circuit-type-select"
            >
              <option value="BT">Baja Tensión (Secundarios)</option>
              <option value="MT">Media Tensión (Primarios)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Límite de Caída (%)</label>
            <input
              type="number"
              className="input mono"
              value={limit}
              onChange={(e) => setLimit(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              data-testid="voltage-limit-input"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Tramos del Circuito</h3>
          <button onClick={addSegment} className="btn btn-outline btn-sm" data-testid="add-segment-button">
            <Plus className="w-4 h-4 mr-1 inline" /> Agregar Tramo
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Ref</th>
                <th>Long. ({circuitType === 'BT' ? 'm' : 'km'})</th>
                <th>{circuitType === 'BT' ? 'Clientes' : 'Transformadores'}</th>
                <th>DMUp (kVA)</th>
                <th>N° Conductores</th>
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
                      onChange={(e) => updateSegment(seg.id, 'ref', e.target.value)}
                      style={{width: '60px'}}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input mono"
                      value={seg.length}
                      onChange={(e) => updateSegment(seg.id, 'length', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input mono"
                      value={seg.clients}
                      onChange={(e) => updateSegment(seg.id, 'clients', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input mono"
                      value={seg.kva}
                      onChange={(e) => updateSegment(seg.id, 'kva', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input mono"
                      value={seg.conductors}
                      onChange={(e) => updateSegment(seg.id, 'conductors', parseInt(e.target.value) || 0)}
                      min="1"
                      max="4"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input"
                      value={seg.conductor_size}
                      onChange={(e) => updateSegment(seg.id, 'conductor_size', e.target.value)}
                      placeholder="Ej: 2/0 AWG"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="input mono"
                      value={seg.fcv}
                      onChange={(e) => updateSegment(seg.id, 'fcv', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.0001"
                    />
                  </td>
                  <td>
                    <button
                      onClick={() => removeSegment(seg.id)}
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

        <div className="mt-6">
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="btn btn-primary"
            data-testid="calculate-voltage-button"
          >
            <TrendingDown className="w-4 h-4 mr-2 inline" />
            {calculating ? 'Calculando...' : 'Calcular Caída de Voltaje'}
          </button>
        </div>
      </div>

      {result && (
        <div className="card" data-testid="voltage-result">
          <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Resultados del Cálculo</h3>
          
          <div className="overflow-x-auto mb-6">
            <table className="table">
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Long.</th>
                  <th>kVA Parcial</th>
                  <th className="mono">kVA Acumulado</th>
                  <th className="mono">{circuitType === 'BT' ? 'kVA·m' : 'kVA·km'}</th>
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
                      {circuitType === 'BT' ? seg.kva_m?.toFixed(2) : seg.kva_km?.toFixed(2)}
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
      )}
    </div>
  );
};

export default VoltageDropModule;
