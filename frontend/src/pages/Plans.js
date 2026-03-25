import React, { useState, useEffect } from 'react';
import { API } from '../App';
import { toast } from 'sonner';
import { Check, CreditCard, Shield } from 'lucide-react';

const Plans = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API}/plans`);
      const data = await response.json();
      setPlans(data);
      setLoading(false);
    } catch (error) {
      toast.error('Error al cargar planes');
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId) => {
    if (planId === 'free') {
      toast.info('El plan Free se activa automáticamente al registrarse');
      return;
    }

    setSelectedPlan(planId);
    setProcessing(true);

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

      if (response.ok) {
        const data = await response.json();
        // Redirect to PayPal
        window.location.href = data.approval_url;
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || 'Error al procesar el pago');
        console.error('Payment error:', errorData);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Error de conexión');
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--color-bg-main)', padding: '2rem'}}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4" style={{color: 'var(--color-primary)'}}>
            Planes de ElectroDesign Pro
          </h1>
          <p className="text-lg" style={{color: 'var(--color-text-secondary)'}}>
            Elige el plan perfecto para tus necesidades
          </p>
        </div>

        {loading ? (
          <p className="text-center">Cargando planes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map(plan => (
              <div
                key={plan.id}
                className="card relative"
                style={{
                  padding: '2rem',
                  border: plan.id === 'basic' ? '2px solid var(--color-secondary)' : '1px solid var(--color-border)'
                }}
              >
                {plan.id === 'basic' && (
                  <div
                    className="absolute top-0 left-0 right-0 text-center py-2 text-white text-sm font-semibold"
                    style={{backgroundColor: 'var(--color-secondary)'}}
                  >
                    MÁS POPULAR
                  </div>
                )}
                
                <div style={{marginTop: plan.id === 'basic' ? '2rem' : '0'}}>
                  <h3 className="text-2xl font-bold mb-2" style={{color: 'var(--color-primary)'}}>{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold" style={{color: 'var(--color-secondary)'}}>${plan.price}</span>
                    <span className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
                      {plan.id === 'free' ? ' / semana' : plan.id === 'basic' ? ' / año' : ' / 5 años'}
                    </span>
                  </div>
                  <p className="mb-6" style={{color: 'var(--color-text-secondary)'}}>{plan.description}</p>
                  
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" style={{color: 'var(--color-success)'}} />
                      <span className="text-sm">Todos los módulos incluidos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" style={{color: 'var(--color-success)'}} />
                      <span className="text-sm">Cálculos ilimitados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5" style={{color: 'var(--color-success)'}} />
                      <span className="text-sm">Soporte técnico</span>
                    </div>
                    {plan.id !== 'free' && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5" style={{color: 'var(--color-secondary)'}} />
                        <span className="text-sm font-semibold">Certificado de licencia</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={processing && selectedPlan === plan.id}
                    className={`btn w-full ${plan.id === 'free' ? 'btn-outline' : 'btn-primary'}`}
                    data-testid={`select-plan-${plan.id}`}
                  >
                    <CreditCard className="w-4 h-4 mr-2 inline" />
                    {processing && selectedPlan === plan.id ? 'Procesando...' : 
                     plan.id === 'free' ? 'Plan Actual' : 'Comprar Ahora'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <p className="text-sm" style={{color: 'var(--color-text-secondary)'}}>
            <Shield className="w-4 h-4 inline mr-1" />
            Pagos seguros procesados por PayPal
          </p>
        </div>
      </div>
    </div>
  );
};

export default Plans;
