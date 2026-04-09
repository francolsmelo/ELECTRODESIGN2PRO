import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../App';
import { toast } from 'sonner';
import { Check, CreditCard, Shield, ArrowLeft, Building, Upload, X } from 'lucide-react';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showBankTransfer, setShowBankTransfer] = useState(false);
  const [transferData, setTransferData] = useState({ plan_id: '', file: null, reference: '' });
  const navigate = useNavigate();
  const paypalRefs = useRef({});

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API}/plans`);
      if (response.ok) {
        const data = await response.json();
        setPlans(Array.isArray(data) ? data : []);
      } else {
        setPlans([]);
      }
    } catch (error) {
      toast.error('Error al cargar planes');
      setPlans([]);
    }
    setLoading(false);
  };

  const initPayPalButton = (planId, price) => {
    if (!window.paypal) {
      console.error('PayPal SDK no cargado');
      return;
    }

    if (paypalRefs.current[planId]) {
      paypalRefs.current[planId].innerHTML = '';
    }

    window.paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'blue',
        layout: 'vertical',
        label: 'paypal'
      },
      createOrder: async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API}/payment/create-order`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ plan_id: planId })
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Error al crear orden');
          }

          const data = await response.json();
          return data.order_id;
        } catch (error) {
          toast.error(error.message || 'Error al procesar');
          throw error;
        }
      },
      onApprove: async (data) => {
        try {
          const token = localStorage.getItem('token');
          const formData = new FormData();
          formData.append('order_id', data.orderID);
          formData.append('plan_id', planId);

          const response = await fetch(`${API}/payment/capture-order`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            toast.success('¡Pago completado con éxito! Tu licencia ha sido activada');
            setTimeout(() => navigate('/dashboard'), 2000);
          } else {
            const error = await response.json();
            toast.error(error.detail || 'Error al procesar el pago');
          }
        } catch (error) {
          toast.error('Error de conexión');
        }
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        toast.error('Error en el proceso de pago');
      }
    }).render(paypalRefs.current[planId]);
  };

  const handleBankTransfer = (planId) => {
    setTransferData({ ...transferData, plan_id: planId });
    setShowBankTransfer(true);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTransferData({ ...transferData, file: e.target.files[0] });
    }
  };

  const submitBankTransfer = async (e) => {
    e.preventDefault();
    
    if (!transferData.file) {
      toast.error('Debes subir el comprobante de pago');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('plan_id', transferData.plan_id);
      formData.append('reference', transferData.reference);
      formData.append('file', transferData.file);

      const response = await fetch(`${API}/payment/bank-transfer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Comprobante enviado. Tu licencia será activada en 24-48 horas.');
        setShowBankTransfer(false);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        toast.error('Error al enviar comprobante');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-bg-main)', padding: '2rem'}}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 btn btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Regresar al Dashboard
          </button>
        </div>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--color-primary)'}}>
            Planes de ElectroDesign Pro
          </h1>
          <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
            Elige el plan perfecto para tus necesidades
          </p>
        </div>

        {loading ? (
          <div className="text-center">Cargando planes...</div>
        ) : plans.length === 0 ? (
          <div className="text-center">No hay planes disponibles</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {plans.map(plan => (
              <div 
                key={plan.name} 
                className={`card ${plan.name === 'basic' ? 'border-2' : ''}`}
                style={{borderColor: plan.name === 'basic' ? 'var(--color-primary)' : undefined}}
              >
                {plan.name === 'basic' && (
                  <div className="mb-4 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={{backgroundColor: 'var(--color-primary)', color: 'white'}}>
                      MÁS POPULAR
                    </span>
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <Shield className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--color-primary)'}} />
                  <h3 className="text-2xl font-bold mb-2 capitalize">{plan.name}</h3>
                  <div className="text-4xl font-bold mb-2" style={{color: 'var(--color-primary)'}}>
                    ${plan.price}
                  </div>
                  <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                    {plan.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-6">
                  {(plan.features || []).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{color: 'var(--color-success)'}} />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                  {(!plan.features || plan.features.length === 0) && (
                    <li className="flex items-start gap-2">
                      <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{color: 'var(--color-success)'}} />
                      <span className="text-sm">{plan.description}</span>
                    </li>
                  )}
                </ul>

                {plan.name === 'free' ? (
                  <button className="btn btn-outline w-full" disabled>
                    Plan Actual
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div ref={el => paypalRefs.current[plan.name] = el}></div>
                    {paypalRefs.current[plan.name] && (
                      <button 
                        onClick={() => initPayPalButton(plan.name, plan.price)}
                        className="btn btn-primary w-full"
                      >
                        <CreditCard className="w-4 h-4 mr-2 inline" />
                        Inicializar PayPal
                      </button>
                    )}
                    <button 
                      onClick={() => handleBankTransfer(plan.name)}
                      className="btn btn-secondary w-full"
                    >
                      <Building className="w-4 h-4 mr-2 inline" />
                      Pagar por Transferencia
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal de Transferencia Bancaria */}
        {showBankTransfer && (
          <div className="modal-overlay" onClick={() => setShowBankTransfer(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Pago por Transferencia Bancaria</h3>
                <button onClick={() => setShowBankTransfer(false)} className="p-2 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 p-4 rounded" style={{backgroundColor: 'var(--color-bg-main)'}}>
                <h4 className="font-bold mb-3">Datos Bancarios - Banco Pichincha (Ecuador)</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Beneficiario:</strong> Franklin Roberto Melo López</p>
                  <p><strong>RUC:</strong> 1234567890001</p>
                  <p><strong>Banco:</strong> Banco Pichincha</p>
                  <p><strong>Tipo de Cuenta:</strong> Transaccional</p>
                  <p><strong>Número de Cuenta:</strong> 4409606500</p>
                  <p><strong>Plan seleccionado:</strong> {transferData.plan_id}</p>
                  <p className="text-lg font-bold" style={{color: 'var(--color-primary)'}}>
                    Monto a transferir: ${plans.find(p => p.name === transferData.plan_id)?.price || 0}
                  </p>
                </div>
              </div>

              <form onSubmit={submitBankTransfer}>
                <div className="mb-4">
                  <label className="block mb-2 font-medium">Número de Referencia/Transacción</label>
                  <input
                    type="text"
                    className="input"
                    value={transferData.reference}
                    onChange={(e) => setTransferData({...transferData, reference: e.target.value})}
                    placeholder="Ej: REF123456789"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="block mb-2 font-medium">Subir Comprobante de Pago</label>
                  <input
                    type="file"
                    className="input"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    required
                  />
                  <p className="text-xs mt-1" style={{color: 'var(--color-text-secondary)'}}>
                    Formatos aceptados: JPG, PNG, PDF
                  </p>
                </div>

                <div className="p-3 rounded mb-4" style={{backgroundColor: '#fef3c7'}}>
                  <p className="text-xs" style={{color: '#92400e'}}>
                    Tu licencia será activada manualmente en un plazo de 24-48 horas después de verificar el pago.
                  </p>
                </div>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBankTransfer(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Upload className="w-4 h-4 mr-2 inline" />
                    Enviar Comprobante
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Plans;
