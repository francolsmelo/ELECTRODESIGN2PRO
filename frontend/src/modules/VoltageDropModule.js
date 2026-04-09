import React, { useState, useEffect } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, TrendingDown, CheckCircle, XCircle, Save, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const VoltageDropModule = ({ projectId }) => {
  const [conductors, setConductors] = useState([]);
  const [limitBT, setLimitBT] = useState(3.0);
  const [limitMT, setLimitMT] = useState(5.0);
  const [segmentsBT, setSegmentsBT] = useState([
    { id: 1, ref: '1', length: '', clients: '', kva: '', kva_per_client: false, conductor_id: '', num_conductors: 1, ffsu: 0.7 }
  ]);
  const [segmentsMT, setSegmentsMT] = useState([
    { id: 1, ref: '1', length: '', transformers: '', kva: '', kva_per_client: false, conductor_id: '', num_conductors: 1, ffsu: 0.7 }
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
            setSegmentsBT(data.segments || [{ id: 1, ref: '1', length: '', clients: '', kva: '', kva_per_client: false, conductor_id: '', num_conductors: 1, ffsu: 0.7 }]);
            setLimitBT(data.limit || 3.0);
            setResultBT(data);
          } else if (data.circuit_type === 'MT') {
            setSegmentsMT(data.segments || [{ id: 1, ref: '1', length: '', transformers: '', kva: '', kva_per_client: false, conductor_id: '', num_conductors: 1, ffsu: 0.7 }]);
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
        kva_per_client: false,
        conductor_id: '',
        num_conductors: 1,
        ffsu: 0.7
      }]);
    } else {
      setSegmentsMT([...segmentsMT, {
        id: Date.now(),
        ref: `${segmentsMT.length + 1}`,
        length: '',
        transformers: '',
        kva: '',
        kva_per_client: false,
        conductor_id: '',
        num_conductors: 1,
        ffsu: 0.7
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
    
    // Convert string values to numbers and validate FFsu
    const processedSegments = segments.map(seg => {
      const ffsu = parseFloat(seg.ffsu) || 0.7;
      const numConductors = parseInt(seg.num_conductors) || 1;
      return {
        ...seg,
        length: parseFloat(seg.length) || 0,
        clients: parseInt(seg.clients) || 0,
        transformers: parseInt(seg.transformers) || 0,
        kva: parseFloat(seg.kva) || 0,
        num_conductors: numConductors,
        ffsu: Math.min(Math.max(ffsu, 0.1), 0.9) // Ensure FFsu is between 0.1 and 0.9
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

  const exportToPDF = (circuitType) => {
    const result = circuitType === 'BT' ? resultBT : resultMT;
    if (!result) {
      toast.error('No hay datos para exportar');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('CÓMPUTO DE CAÍDAS DE VOLTAJE', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`CIRCUITOS ${circuitType === 'BT' ? 'SECUNDARIOS (BAJA TENSIÓN)' : 'PRIMARIOS (MEDIA TENSIÓN)'}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    
    // Información general
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const startY = 30;
    doc.text(`LÍMITE DE CAÍDA DE VOLTAJE: ${result.limit}%`, 14, startY);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-EC')}`, 14, startY + 6);
    
    // Tabla de datos
    const tableData = result.segments.map(seg => [
      seg.ref,
      safeToFixed(seg.length, 2),
      circuitType === 'BT' ? (seg.clients || 0) : (seg.transformers || 0),
      safeToFixed(seg.kva, 2),
      seg.num_conductors || 1,
      safeToFixed(seg.ffsu, 2),
      safeToFixed(seg.accumulated_kva, 2),
      circuitType === 'BT' ? safeToFixed(seg.kva_m, 2) : safeToFixed(seg.kva_km, 2),
      safeToFixed(seg.fcv_tramo, 4),
      safeToFixed((seg.drop_percent || 0) * 100, 3) + '%'
    ]);
    
    autoTable(doc, {
      startY: startY + 12,
      head: [[
        'Ref.',
        'Long. (m)',
        circuitType === 'BT' ? 'Clientes' : 'Transf.',
        'kVA',
        'N° Cond.',
        'FCV',
        'kVA Acum.',
        circuitType === 'BT' ? 'kVA·m' : 'kVA·km',
        'FCV Tramo',
        '% Caída'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 20 },
        2: { cellWidth: 20 },
        3: { cellWidth: 18 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 20 },
        7: { cellWidth: 20 },
        8: { cellWidth: 22 },
        9: { cellWidth: 20 }
      }
    });
    
    // Resultado final
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`CAÍDA TOTAL: ${safeToFixed(result.total_drop * 100, 3)}%`, 14, finalY);
    doc.text(`RESULTADO: ${result.compliant ? 'CUMPLE' : 'NO CUMPLE'}`, 14, finalY + 7);
    
    // Guardar PDF
    doc.save(`Caída_Voltaje_${circuitType}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado correctamente');
  };

  const exportToExcel = (circuitType) => {
    const result = circuitType === 'BT' ? resultBT : resultMT;
    if (!result) {
      toast.error('No hay datos para exportar');
      return;
    }

    const data = result.segments.map(seg => ({
      'Referencia': seg.ref,
      'Longitud (m)': seg.length,
      [circuitType === 'BT' ? 'Clientes' : 'Transformadores']: circuitType === 'BT' ? seg.clients : seg.transformers,
      'kVA': seg.kva,
      'N° Conductores': seg.num_conductors,
      'FCV': seg.ffsu,
      'kVA Acumulado': safeToFixed(seg.accumulated_kva, 2),
      [circuitType === 'BT' ? 'kVA·m' : 'kVA·km']: circuitType === 'BT' ? safeToFixed(seg.kva_m, 2) : safeToFixed(seg.kva_km, 2),
      'FCV Tramo': safeToFixed(seg.fcv_tramo, 4),
      '% Caída': safeToFixed((seg.drop_percent || 0) * 100, 3) + '%'
    }));
    
    // Agregar fila de totales
    data.push({
      'Referencia': '',
      'Longitud (m)': '',
      [circuitType === 'BT' ? 'Clientes' : 'Transformadores']: '',
      'kVA': '',
      'N° Conductores': '',
      'FFsu (p.u.)': '',
      'kVA Acumulado': '',
      [circuitType === 'BT' ? 'kVA·m' : 'kVA·km']: 'TOTAL',
      'FCV Tramo': '',
      '% Caída': safeToFixed((result.total_drop || 0) * 100, 3) + '%'
    });
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Caída ${circuitType}`);
    XLSX.writeFile(wb, `Caída_Voltaje_${circuitType}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel generado correctamente');
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
                  <th>kVA x Cliente</th>
                  <th>Conductor</th>
                  <th>N° Cond.</th>
                  <th>FCV</th>
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
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={seg.kva_per_client || false}
                        onChange={(e) => updateSegment('BT', seg.id, 'kva_per_client', e.target.checked)}
                        title="Si está marcado, kVA se multiplicará por número de clientes"
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
                        value={seg.num_conductors}
                        onChange={(e) => updateSegment('BT', seg.id, 'num_conductors', e.target.value)}
                        placeholder="1"
                        min="1"
                        max="4"
                        title="Número de conductores por fase"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.ffsu}
                        onChange={(e) => updateSegment('BT', seg.id, 'ffsu', e.target.value)}
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

        <div className="flex gap-2">
          <button
            onClick={() => handleCalculate('BT')}
            disabled={calculating}
            className="btn btn-primary"
          >
            <TrendingDown className="w-4 h-4 mr-2 inline" />
            {calculating ? 'Calculando...' : 'Calcular Caída BT'}
          </button>
          
          {resultBT && (
            <>
              <button
                onClick={() => exportToPDF('BT')}
                className="btn btn-secondary"
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                Exportar a PDF
              </button>
              <button
                onClick={() => exportToExcel('BT')}
                className="btn btn-secondary"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Exportar a Excel
              </button>
            </>
          )}
        </div>

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
                      <td className="mono">{safeToFixed(seg.accumulated_kva, 2)}</td>
                      <td className="mono">{safeToFixed(seg.kva_m, 2)}</td>
                      <td className="mono">{safeToFixed(seg.fcv_tramo, 4)}</td>
                      <td className="mono font-semibold">{safeToFixed(seg.drop_percent * 100, 3)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: resultBT.compliant ? '#D1FAE5' : '#FEE2E2'}}>
                    <td colSpan="4" className="font-bold">Caída Total</td>
                    <td className="mono font-bold">{safeToFixed(resultBT.total_drop * 100, 3)}%</td>
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
                  Límite: {resultBT.limit}% | Caída: {safeToFixed(resultBT.total_drop * 100, 3)}%
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
                  <th>kVA x Transf</th>
                  <th>Conductor</th>
                  <th>N° Cond.</th>
                  <th>FCV</th>
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
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={seg.kva_per_client || false}
                        onChange={(e) => updateSegment('MT', seg.id, 'kva_per_client', e.target.checked)}
                        title="Si está marcado, kVA se multiplicará por número de transformadores"
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
                        value={seg.num_conductors}
                        onChange={(e) => updateSegment('MT', seg.id, 'num_conductors', e.target.value)}
                        placeholder="1"
                        min="1"
                        max="4"
                        title="Número de conductores por fase"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={seg.ffsu}
                        onChange={(e) => updateSegment('MT', seg.id, 'ffsu', e.target.value)}
                        placeholder="0.7"
                        step="0.1"
                        min="0.1"
                        max="0.9"
                        title="Factor de Carga del Vano (0.1 a 0.9)"
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

        <div className="flex gap-2">
          <button
            onClick={() => handleCalculate('MT')}
            disabled={calculating}
            className="btn btn-primary"
          >
            <TrendingDown className="w-4 h-4 mr-2 inline" />
            {calculating ? 'Calculando...' : 'Calcular Caída MT'}
          </button>
          
          {resultMT && (
            <>
              <button
                onClick={() => exportToPDF('MT')}
                className="btn btn-secondary"
              >
                <FileText className="w-4 h-4 mr-2 inline" />
                Exportar a PDF
              </button>
              <button
                onClick={() => exportToExcel('MT')}
                className="btn btn-secondary"
              >
                <Download className="w-4 h-4 mr-2 inline" />
                Exportar a Excel
              </button>
            </>
          )}
        </div>

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
                      <td className="mono">{safeToFixed(seg.accumulated_kva, 2)}</td>
                      <td className="mono">{safeToFixed(seg.kva_km, 2)}</td>
                      <td className="mono">{safeToFixed(seg.fcv_tramo, 4)}</td>
                      <td className="mono font-semibold">{safeToFixed(seg.drop_percent * 100, 3)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{backgroundColor: resultMT.compliant ? '#D1FAE5' : '#FEE2E2'}}>
                    <td colSpan="4" className="font-bold">Caída Total</td>
                    <td className="mono font-bold">{safeToFixed(resultMT.total_drop * 100, 3)}%</td>
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
                  Límite: {resultMT.limit}% | Caída: {safeToFixed(resultMT.total_drop * 100, 3)}%
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
