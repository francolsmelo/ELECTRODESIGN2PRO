import React, { useState } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Plus, Trash2, DollarSign, FileText } from 'lucide-react';

const BudgetModule = ({ projectId }) => {
  const [materials, setMaterials] = useState([
    { id: 1, description: '', quantity: 0, unit: 'c/u', unit_price: 0 }
  ]);
  const [labor, setLabor] = useState([
    { id: 1, description: '', quantity: 0, unit: 'U', unit_price: 0 }
  ]);
  const [dismantling, setDismantling] = useState([]);
  const [adminPercent, setAdminPercent] = useState(12);
  const [utilityPercent, setUtilityPercent] = useState(10);
  const [ivaPercent, setIvaPercent] = useState(15);
  const [result, setResult] = useState(null);
  const [generating, setGenerating] = useState(false);

  const addItem = (setter, items) => {
    setter([...items, {
      id: Date.now(),
      description: '',
      quantity: 0,
      unit: 'c/u',
      unit_price: 0
    }]);
  };

  const updateItem = (setter, items, id, field, value) => {
    setter(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (setter, items, id) => {
    if (items.length > 1) {
      setter(items.filter(item => item.id !== id));
    }
  };

  const calculateTotal = (items) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/budget/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          materials: materials,
          labor: labor,
          dismantling: dismantling,
          administration_percent: adminPercent,
          utility_percent: utilityPercent,
          iva_percent: ivaPercent
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
        toast.success('Presupuesto generado correctamente');
      } else {
        toast.error('Error al generar presupuesto');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
    setGenerating(false);
  };

  return (
    <div>
      <div className="card mb-6">
        <h2 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Generación de Presupuesto (APU)</h2>
        <p className="text-sm mb-4" style={{color: 'var(--color-text-secondary)'}}>Ingrese materiales, mano de obra y costos de desmantelamiento</p>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Materiales y Equipos</h3>
            <button onClick={() => addItem(setMaterials, materials)} className="btn btn-outline btn-sm" data-testid="add-material-button">
              <Plus className="w-4 h-4 mr-1 inline" /> Agregar
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>Precio Unit. (USD)</th>
                  <th className="mono">Total (USD)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item, index) => (
                  <tr key={item.id}>
                    <td className="mono">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={item.description}
                        onChange={(e) => updateItem(setMaterials, materials, item.id, 'description', e.target.value)}
                        placeholder="Ej: Transformador 150 kVA"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={item.unit}
                        onChange={(e) => updateItem(setMaterials, materials, item.id, 'unit', e.target.value)}
                        style={{width: '70px'}}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={item.quantity}
                        onChange={(e) => updateItem(setMaterials, materials, item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={item.unit_price}
                        onChange={(e) => updateItem(setMaterials, materials, item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="mono font-semibold">${(item.quantity * item.unit_price).toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => removeItem(setMaterials, materials, item.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={materials.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{backgroundColor: 'var(--color-bg-main)'}}>
                  <td colSpan="5" className="font-semibold">SUBTOTAL MATERIALES</td>
                  <td className="mono font-bold">${calculateTotal(materials).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{color: 'var(--color-primary)'}}>Mano de Obra</h3>
            <button onClick={() => addItem(setLabor, labor)} className="btn btn-outline btn-sm" data-testid="add-labor-button">
              <Plus className="w-4 h-4 mr-1 inline" /> Agregar
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ítem</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th>Cantidad</th>
                  <th>Precio Unit. (USD)</th>
                  <th className="mono">Total (USD)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {labor.map((item, index) => (
                  <tr key={item.id}>
                    <td className="mono">{index + 1}</td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={item.description}
                        onChange={(e) => updateItem(setLabor, labor, item.id, 'description', e.target.value)}
                        placeholder="Ej: Instalación de poste"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="input"
                        value={item.unit}
                        onChange={(e) => updateItem(setLabor, labor, item.id, 'unit', e.target.value)}
                        style={{width: '70px'}}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={item.quantity}
                        onChange={(e) => updateItem(setLabor, labor, item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="input mono"
                        value={item.unit_price}
                        onChange={(e) => updateItem(setLabor, labor, item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                      />
                    </td>
                    <td className="mono font-semibold">${(item.quantity * item.unit_price).toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => removeItem(setLabor, labor, item.id)}
                        className="text-red-500 hover:text-red-700"
                        disabled={labor.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{backgroundColor: 'var(--color-bg-main)'}}>
                  <td colSpan="5" className="font-semibold">SUBTOTAL MANO DE OBRA</td>
                  <td className="mono font-bold">${calculateTotal(labor).toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Administración (%)</label>
            <input
              type="number"
              className="input mono"
              value={adminPercent}
              onChange={(e) => setAdminPercent(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              data-testid="admin-percent-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>Utilidad (%)</label>
            <input
              type="number"
              className="input mono"
              value={utilityPercent}
              onChange={(e) => setUtilityPercent(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              data-testid="utility-percent-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{color: 'var(--color-text-secondary)'}}>IVA (%)</label>
            <input
              type="number"
              className="input mono"
              value={ivaPercent}
              onChange={(e) => setIvaPercent(parseFloat(e.target.value) || 0)}
              min="0"
              step="0.1"
              data-testid="iva-percent-input"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary"
          data-testid="generate-budget-button"
        >
          <DollarSign className="w-4 h-4 mr-2 inline" />
          {generating ? 'Generando...' : 'Generar Presupuesto'}
        </button>
      </div>

      {result && (
        <div className="card" data-testid="budget-result">
          <h3 className="text-lg font-bold mb-4" style={{color: 'var(--color-primary)'}}>Resumen del Presupuesto</h3>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between p-3 rounded" style={{backgroundColor: 'var(--color-bg-main)'}}>
              <span className="font-medium">Subtotal Directo</span>
              <span className="mono font-bold">${result.subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between p-3">
              <span>Administración ({adminPercent}%)</span>
              <span className="mono">${result.administration.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between p-3">
              <span>Utilidad ({utilityPercent}%)</span>
              <span className="mono">${result.utility.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between p-3 rounded" style={{backgroundColor: 'var(--color-bg-main)'}}>
              <span className="font-medium">Subtotal con Costos Indirectos</span>
              <span className="mono font-bold">${(result.subtotal + result.administration + result.utility).toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between p-3">
              <span>IVA ({ivaPercent}%)</span>
              <span className="mono">${result.iva.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between p-4 rounded border-2" style={{borderColor: 'var(--color-secondary)', backgroundColor: '#DBEAFE'}}>
              <span className="font-bold text-lg">TOTAL PRESUPUESTO</span>
              <span className="mono font-bold text-2xl" style={{color: 'var(--color-secondary)'}}>${result.total.toFixed(2)}</span>
            </div>
          </div>

          <button className="btn btn-outline" data-testid="export-budget-button">
            <FileText className="w-4 h-4 mr-2 inline" />
            Exportar a PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default BudgetModule;
