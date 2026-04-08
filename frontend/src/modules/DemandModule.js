import React, { useState, useEffect } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator, Save, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DemandModule = ({ projectId }) => {
  const [lightingLoads, setLightingLoads] = useState([
    { id: 1, description: 'Puntos de alumbrado incandescentes', quantity: 0, unit_power: 100 }
  ]);
  const [specialLoads, setSpecialLoads] = useState([
    { id: 1, description: 'Motor', quantity: 0, unit_power: 0 }
  ]);
  const [demandFactor, setDemandFactor] = useState(0.9);
  const [powerFactor, setPowerFactor] = useState(0.92);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Cargar datos guardados al montar el componente
  useEffect(() => {
    loadSavedData();
  }, [projectId]);

  const loadSavedData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/demand/load/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.id) {
          setLightingLoads(data.lighting_loads || [{ id: 1, description: 'Puntos de alumbrado incandescentes', quantity: 0, unit_power: 100 }]);
          setSpecialLoads(data.special_loads || [{ id: 1, description: 'Motor', quantity: 0, unit_power: 0 }]);
          setDemandFactor(data.demand_factor || 0.9);
          setPowerFactor(data.power_factor || 0.92);
          setResult(data);
        }
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLightingLoad = () => {
    setLightingLoads([...lightingLoads, {
      id: Date.now(),
      description: '',
      quantity: 0,
      unit_power: 0
    }]);
  };

  const addSpecialLoad = () => {
    setSpecialLoads([...specialLoads, {
      id: Date.now(),
      description: '',
      quantity: 0,
      unit_power: 0
    }]);
  };

  const updateLightingLoad = (id, field, value) => {
    setLightingLoads(lightingLoads.map(load =>
      load.id === id ? { ...load, [field]: value } : load
    ));
  };

  const updateSpecialLoad = (id, field, value) => {
    setSpecialLoads(specialLoads.map(load =>
      load.id === id ? { ...load, [field]: value } : load
    ));
  };

  const removeLightingLoad = (id) => {
    if (lightingLoads.length > 1) {
      setLightingLoads(lightingLoads.filter(load => load.id !== id));
    }
  };

  const removeSpecialLoad = (id) => {
    if (specialLoads.length > 1) {
      setSpecialLoads(specialLoads.filter(load => load.id !== id));
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/demand/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          lighting_loads: lightingLoads,
          special_loads: specialLoads,
          demand_factor: demandFactor,
          power_factor: powerFactor
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success('Cálculo completado y guardado');
      } else {
        toast.error('Error al calcular');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setCalculating(false);
  };


  const exportToPDF = () => {
    if (!result) {
      toast.error('Primero debes calcular la demanda');
      return;
    }

    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('CÁLCULO DE LA DEMANDA ELÉCTRICA', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-EC')}`, 14, 25);
    
    let startY = 35;
    
    // Tabla de Cargas de Alumbrado
    if (result.lighting_loads && result.lighting_loads.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('CARGAS DE ALUMBRADO Y TOMACORRIENTES', 14, startY);
      startY += 5;
      
      const lightingData = result.lighting_loads.map((load, idx) => [
        idx + 1,
        load.description,
        load.quantity,
        load.unit_power + ' W',
        (load.quantity * load.unit_power).toFixed(2) + ' W'
      ]);
      
      autoTable(doc, {
        startY: startY,
        head: [['Ítem', 'Descripción', 'Cantidad', 'Pn (W)', 'Total (W)']],
        body: lightingData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 }
        }
      });
      
      startY = doc.lastAutoTable.finalY + 3;
      doc.setFont(undefined, 'bold');
      doc.text(`Subtotal Alumbrado: ${result.total_lighting_kw.toFixed(2)} kW`, 14, startY);
      startY += 10;
    }
    
    // Tabla de Cargas Especiales
    if (result.special_loads && result.special_loads.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('CARGAS ESPECIALES', 14, startY);
      startY += 5;
      
      const specialData = result.special_loads.map((load, idx) => [
        idx + 1,
        load.description,
        load.quantity,
        load.unit_power + ' W',
        (load.quantity * load.unit_power).toFixed(2) + ' W'
      ]);
      
      autoTable(doc, {
        startY: startY,
        head: [['Ítem', 'Descripción', 'Cantidad', 'Pn (W)', 'Total (W)']],
        body: specialData,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 30 }
        }
      });
      
      startY = doc.lastAutoTable.finalY + 3;
      doc.setFont(undefined, 'bold');
      doc.text(`Subtotal Cargas Especiales: ${result.total_special_kw.toFixed(2)} kW`, 14, startY);
      startY += 10;
    }
    
    // Resumen de Cálculo
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('RESULTADOS DEL CÁLCULO', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
    
    startY = 35;
    doc.setFontSize(11);
    
    const summaryData = [
      ['Potencia Total Instalada', `${result.total_installed_kw.toFixed(2)} kW`],
      ['Factor de Demanda', `${(result.demand_factor * 100).toFixed(0)}%`],
      ['Factor de Potencia', `${(result.power_factor * 100).toFixed(0)}%`],
      ['Demanda Calculada', `${result.demanded_kva.toFixed(2)} kVA`],
      ['Transformador Recomendado', `${result.transformer_size_kva} kVA`]
    ];
    
    autoTable(doc, {
      startY: startY,
      body: summaryData,
      theme: 'grid',
      bodyStyles: { fontSize: 11 },
      columnStyles: {
        0: { cellWidth: 120, fontStyle: 'bold' },
        1: { cellWidth: 65, halign: 'right', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.row.index === 4) {
          data.cell.styles.fillColor = [41, 128, 185];
          data.cell.styles.textColor = 255;
        }
      }
    });
    
    // Guardar PDF
    doc.save(`Calculo_Demanda_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado correctamente');
  };


  if (loading) {
    return <div className="card">Cargando datos guardados...</div>;
  }

  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Cálculo de la Demanda Eléctrica</h2>
        <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>Ingrese las cargas de iluminación/tomacorrientes y cargas especiales</p>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Circuitos de Alumbrado y Tomacorrientes</h3>
            <button onClick={addLightingLoad} className="btn btn-outline btn-sm" data-testid="add-lighting-load">
              <Plus className="w-4 h-4 mr-1 inline" /> Agregar
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Pn (W)</th>
                  <th className="mono">Total (W)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lightingLoads.map((load, index) => (
                  <tr key={load.id}>
                    <td className="mono">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={load.description}
                        onChange={(e) => updateLightingLoad(load.id, 'description', e.target.value)}
                        placeholder="Ej: Puntos de alumbrado LED"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={load.quantity}
                        onChange={(e) => updateLightingLoad(load.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={load.unit_power}
                        onChange={(e) => updateLightingLoad(load.id, 'unit_power', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td className="mono font-semibold">{(load.quantity * load.unit_power).toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => removeLightingLoad(load.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={lightingLoads.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{backgroundColor: 'var(--color-bg-main)'}}>
                  <td colSpan="4" className="font-semibold">SUBTOTAL 1</td>
                  <td className="mono font-bold">
                    {lightingLoads.reduce((sum, load) => sum + (load.quantity * load.unit_power), 0).toFixed(2)} W
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Cargas Especiales</h3>
            <button onClick={addSpecialLoad} className="btn btn-outline btn-sm" data-testid="add-special-load">
              <Plus className="w-4 h-4 mr-1 inline" /> Agregar
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Descripción</th>
                  <th>Cantidad</th>
                  <th>Potencia Unit. (W)</th>
                  <th className="mono">Total (W)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {specialLoads.map((load, index) => (
                  <tr key={load.id}>
                    <td className="mono">CE{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={load.description}
                        onChange={(e) => updateSpecialLoad(load.id, 'description', e.target.value)}
                        placeholder="Ej: Motor 60 kVA"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={load.quantity}
                        onChange={(e) => updateSpecialLoad(load.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={load.unit_power}
                        onChange={(e) => updateSpecialLoad(load.id, 'unit_power', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </td>
                    <td className="mono font-semibold">{(load.quantity * load.unit_power).toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => removeSpecialLoad(load.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={specialLoads.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{backgroundColor: 'var(--color-bg-main)'}}>
                  <td colSpan="4" className="font-semibold">SUBTOTAL 2</td>
                  <td className="mono font-bold">
                    {specialLoads.reduce((sum, load) => sum + (load.quantity * load.unit_power), 0).toFixed(2)} W
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Factor de Demanda</label>
            <input
              type="number"
              className="input"
              value={demandFactor}
              onChange={(e) => setDemandFactor(parseFloat(e.target.value) || 0)}
              min="0"
              max="1"
              step="0.01"
              data-testid="demand-factor-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Factor de Potencia</label>
            <input
              type="number"
              className="input"
              value={powerFactor}
              onChange={(e) => setPowerFactor(parseFloat(e.target.value) || 0)}
              min="0.6"
              max="0.99"
              step="0.01"
              data-testid="power-factor-input"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            disabled={calculating}
            className="btn btn-primary"
            data-testid="calculate-demand-button"
          >
            <Calculator className="w-4 h-4 mr-2 inline" />
            {calculating ? 'Calculando...' : 'Calcular Demanda'}
          </button>
          
          {result && (
            <button
              onClick={exportToPDF}
              className="btn btn-secondary"
            >
              <FileText className="w-4 h-4 mr-2 inline" />
              Exportar a PDF
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className="card" data-testid="demand-result">
          <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Resultados del Cálculo</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded border" style={{borderColor: 'var(--color-border)'}}>
              <p className="text-sm mb-1" style={{color: 'var(--color-text-secondary)'}}>Carga Total Instalada</p>
              <p className="text-2xl font-bold mono" style={{color: 'var(--color-primary)'}}>{result.total_installed.toFixed(2)} W</p>
            </div>
            
            <div className="p-4 rounded border" style={{borderColor: 'var(--color-border)'}}>
              <p className="text-sm mb-1" style={{color: 'var(--color-text-secondary)'}}>Demanda Total (kW)</p>
              <p className="text-2xl font-bold mono" style={{color: 'var(--color-primary)'}}>{result.demand_kw.toFixed(2)} kW</p>
            </div>
            
            <div className="p-4 rounded border" style={{borderColor: 'var(--color-border)'}}>
              <p className="text-sm mb-1" style={{color: 'var(--color-text-secondary)'}}>Demanda Total (kVA)</p>
              <p className="text-2xl font-bold mono" style={{color: 'var(--color-secondary)'}}>{result.demand_kva.toFixed(2)} kVA</p>
            </div>
            
            <div className="p-4 rounded border" style={{borderColor: 'var(--color-border)', backgroundColor: '#DBEAFE'}}>
              <p className="text-sm mb-1" style={{color: 'var(--color-text-secondary)'}}>Capacidad Transformador Recomendada</p>
              <p className="text-2xl font-bold mono" style={{color: 'var(--color-secondary)'}}>{result.transformer_capacity} kVA</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DemandModule;
