// src/components/PaymentForm.jsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import { toast } from 'sonner';
import { 
  CheckCircleIcon, 
  CurrencyDollarIcon, 
  ArrowPathIcon,
  BanknotesIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Componente de confirmación para pagos grandes
const ConfirmationModal = ({ isOpen, onConfirm, onCancel, amount }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e2235] rounded-xl border border-[#2d3748] w-full max-w-md">
        <div className="p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-500/10 mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Confirmar Pago Grande</h3>
          <p className="text-gray-400 mb-6">
            Estás a punto de registrar un pago de <span className="font-semibold text-white">${amount}</span>.
            ¿Estás seguro de que deseas continuar?
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#2d3748] rounded-lg hover:bg-[#374151] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Confirmar Pago
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const METODOS_PAGO = [
  { 
    id: 'efectivo', 
    name: 'Efectivo',
    icon: BanknotesIcon,
    color: 'bg-green-500/10 text-green-500',
    description: 'Pago en efectivo al momento de la entrega'
  },
  { 
    id: 'transferencia', 
    name: 'Transferencia',
    icon: ArrowDownTrayIcon,
    color: 'bg-blue-500/10 text-blue-500',
    description: 'Transferencia bancaria'
  },
  { 
    id: 'pago_movil', 
    name: 'Pago Móvil',
    icon: DevicePhoneMobileIcon,
    color: 'bg-purple-500/10 text-purple-500',
    description: 'Pago a través de Pago Móvil'
  },
  { 
    id: 'zelle', 
    name: 'Zelle',
    icon: CurrencyDollarIcon,
    color: 'bg-yellow-500/10 text-yellow-500',
    description: 'Transferencia a través de Zelle'
  },
  { 
    id: 'otro', 
    name: 'Otro',
    icon: DocumentTextIcon,
    color: 'bg-gray-500/10 text-gray-500',
    description: 'Otro método de pago'
  }
];

export function PaymentForm({ jugador, rifa, onPaymentSuccess, empresaId }) {
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const amountInputRef = useRef(null);
  const firstPaymentMethodRef = useRef(null);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saldoPendiente, setSaldoPendiente] = useState(0);

  useEffect(() => {
    if (jugador && rifa) {
      // Calcular deuda total del jugador en esta rifa
      const deudaTotalCalc = (jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0);
      const montoPagadoCalc = jugador?.tickets?.reduce((total, ticket) => {
        const montoTotal = ticket?.monto_total || 0;
        const saldoPendienteTicket = ticket?.saldo_pendiente || 0;
        return total + (montoTotal - saldoPendienteTicket);
      }, 0) || 0;
      const saldoActual = deudaTotalCalc - montoPagadoCalc;

      setSaldoPendiente(saldoActual);
      setMonto(saldoActual > 0 ? saldoActual.toString() : '');
    }
  }, [jugador, rifa]);

  // Formatea el número de referencia según el método de pago
  const formatReference = (method, ref) => {
    if (!ref) return null;
    
    // Limpia el texto de espacios en blanco y lo convierte a mayúsculas
    ref = ref.trim().toUpperCase();
    
    switch(method) {
      case 'pago_movil':
        // Formato para Pago Móvil: 0412-1234567 o 04121234567 → 0412-1234567
        if (/^\d{10,11}$/.test(ref)) {
          return ref.replace(/(\d{4})(\d{7})/, '$1-$2');
        }
        break;
      case 'transferencia':
        // Formato para transferencia: solo números, guiones y letras
        return ref.replace(/[^a-zA-Z0-9-]/g, '');
      case 'efectivo':
        // Para efectivo, no es necesario referencia
        return null;
      default:
        return ref;
    }
    
    return ref;
  };

  const validateForm = () => {
    const montoNum = parseFloat(monto);

    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('Por favor ingrese un monto válido');
      amountInputRef.current?.focus();
      return false;
    }

    if (montoNum > saldoPendiente) {
      toast.error('El monto no puede ser mayor al saldo pendiente');
      amountInputRef.current?.focus();
      return false;
    }

    // Validar referencia para métodos que la requieren
    if (['transferencia', 'pago_movil', 'zelle'].includes(metodoPago) && !referencia.trim()) {
      toast.error(`Por favor ingrese el número de referencia para ${METODOS_PAGO.find(m => m.id === metodoPago)?.name}`);
      return false;
    }

    return true;
  };

  const processPayment = async () => {
    if (!jugador || !rifa) return;

    const montoNum = parseFloat(pendingPayment || monto);
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const referenciaFormateada = formatReference(metodoPago, referencia);

      // Calcular deuda actual del jugador
      const deudaTotalActual = (jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0);
      const montoPagadoActual = jugador?.tickets?.reduce((total, ticket) => {
        return total + ((ticket?.monto_total || 0) - (ticket?.saldo_pendiente || 0));
      }, 0) || 0;
      const saldoActual = deudaTotalActual - montoPagadoActual;

      // Si el pago es igual o mayor al saldo pendiente, marcar todos los tickets como pagados
      if (montoNum >= saldoActual) {
        // Marcar todos los tickets del jugador como pagados
        const ticketIds = jugador.tickets.map(ticket => ticket.id);

        const { error: updateError } = await supabase
          .from('t_tickets')
          .update({
            saldo_pendiente: 0,
            estado_pago: 'completado',
            estado: 'pagado',
            fecha_ultimo_pago: new Date().toISOString()
          })
          .eq('empresa_id', empresaId)
          .in('id', ticketIds);

        if (updateError) throw updateError;

        // Registrar pago completo para cada ticket
        const pagosToInsert = jugador.tickets.map(ticket => ({
          id: ticket.id,
          empresa_id: empresaId,
          monto: (ticket?.monto_total || 0) - (ticket?.saldo_pendiente || 0),
          metodo_pago: metodoPago,
          referencia_bancaria: referenciaFormateada,
          notas: notas.trim() || null
        }));

        const { error: pagoError } = await supabase
          .from('t_pagos')
          .insert(pagosToInsert);

        if (pagoError) throw pagoError;

      } else {
        // Pago parcial - distribuir proporcionalmente entre tickets con saldo pendiente
        const ticketsConSaldo = jugador.tickets.filter(ticket => (ticket?.saldo_pendiente || 0) > 0);

        if (ticketsConSaldo.length === 0) {
          throw new Error('No hay tickets con saldo pendiente');
        }

        // Distribuir el pago proporcionalmente
        let montoRestante = montoNum;
        const pagosToInsert = [];

        for (const ticket of ticketsConSaldo) {
          if (montoRestante <= 0) break;

          const montoParaEsteTicket = Math.min((ticket?.saldo_pendiente || 0), montoRestante);
          montoRestante -= montoParaEsteTicket;

          // Actualizar ticket
          const nuevoSaldo = (ticket?.saldo_pendiente || 0) - montoParaEsteTicket;
          const nuevoEstado = nuevoSaldo <= 0 ? 'completado' : 'parcial';

          const { error: updateError } = await supabase
            .from('t_tickets')
            .update({
              saldo_pendiente: nuevoSaldo,
              estado_pago: nuevoEstado,
              fecha_ultimo_pago: new Date().toISOString(),
              ...(nuevoSaldo <= 0 && { estado: 'pagado' })
            })
            .eq('id', ticket.id);

          if (updateError) throw updateError;

          // Registrar pago para este ticket
          pagosToInsert.push({
            id: ticket.id,
            empresa_id: empresaId,
            monto: montoParaEsteTicket,
            metodo_pago: metodoPago,
            referencia_bancaria: referenciaFormateada,
            notas: notas.trim() || null
          });
        }

        // Insertar todos los pagos
        if (pagosToInsert.length > 0) {
          const { error: pagoError } = await supabase
            .from('t_pagos')
            .insert(pagosToInsert);

          if (pagoError) throw pagoError;
        }
      }

      toast.success('Pago registrado exitosamente');

      // Recalcular saldo pendiente después del pago
      const deudaTotalActualizada = (jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0);
      const montoPagadoActualizado = jugador?.tickets?.reduce((total, ticket) => {
        return total + ((ticket?.monto_total || 0) - (ticket?.saldo_pendiente || 0));
      }, 0) || 0;
      const nuevoSaldo = deudaTotalActualizada - montoPagadoActualizado;

      setSaldoPendiente(nuevoSaldo);
      setMonto(nuevoSaldo > 0 ? nuevoSaldo.toString() : '');

      // Limpiar campos si el pago se completó
      if (nuevoSaldo <= 0) {
        setReferencia('');
        setNotas('');
      }

      onPaymentSuccess?.();
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      toast.error('Error al registrar el pago: ' + (error.message || 'Error desconocido'));
    } finally {
      setIsLoading(false);
      setPendingPayment(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!jugador || !rifa) return;

    if (!validateForm()) return;

    const montoNum = parseFloat(monto);

    // Mostrar confirmación para pagos grandes (mayores al 50% del monto total)
    if (montoNum > ((jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0) * 0.5)) {
      setPendingPayment(monto);
      setShowConfirmation(true);
      return;
    }

    setPendingPayment(monto);
    await processPayment();
  };

  if (!jugador || !rifa) return null;

  const selectedMethod = METODOS_PAGO.find(m => m.id === metodoPago) || METODOS_PAGO[0];
  const paymentComplete = saldoPendiente <= 0;
  const deudaTotal = (jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0);
  const montoPagado = jugador?.tickets?.reduce((total, ticket) => {
    const montoTotal = ticket?.monto_total || 0;
    const saldoPendienteTicket = ticket?.saldo_pendiente || 0;
    return total + (montoTotal - saldoPendienteTicket);
  }, 0) || 0;
  const progressPercentage = deudaTotal > 0 && !isNaN(montoPagado / deudaTotal) ? Math.round((montoPagado / deudaTotal) * 100) : 0;
  
  // Efecto para manejar la tecla Escape en el modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowConfirmation(false);
      }
    };
    
    if (showConfirmation) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showConfirmation]);
  
  // Efecto para enfocar el primer elemento interactivo cuando se abre el formulario
  useEffect(() => {
    if (jugador && !paymentComplete) {
      // Pequeño retraso para asegurar que el DOM se haya actualizado
      const timer = setTimeout(() => {
        if (monto) {
          // Si ya hay un monto, enfocar el primer método de pago
          firstPaymentMethodRef.current?.focus();
        } else {
          // Si no hay monto, enfocar el campo de monto
          amountInputRef.current?.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [jugador, paymentComplete, monto]);

  return (
    <>
      <ConfirmationModal
        isOpen={showConfirmation}
        amount={pendingPayment}
        onConfirm={() => {
          setShowConfirmation(false);
          processPayment();
        }}
        onCancel={() => {
          setShowConfirmation(false);
          setPendingPayment(null);
        }}
      />
      <div className="bg-[#1e2235] rounded-xl border border-[#2d3748] overflow-hidden">
        {/* Header */}
        <div className="bg-[#23283a] px-6 py-4 border-b border-[#2d3748]">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
            {paymentComplete ? 'Pago Completado' : 'Registrar Pago'}
          </h3>
        </div>

      {/* Payment Summary */}
      <div className="p-6 space-y-6">
        {/* Payment Progress */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">Progreso del Pago</span>
            <span className="text-sm font-medium text-gray-400">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-[#2d3748] rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-medium text-white">${deudaTotal.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="font-medium text-green-400">${montoPagado.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Pendiente</p>
              <p className={`font-medium ${paymentComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                ${saldoPendiente.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {!paymentComplete && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount Input */}
            <div className="space-y-2">
              <label htmlFor="monto" className="block text-sm font-medium text-gray-300">
                Monto del Pago
              </label>
              <div className="relative rounded-lg overflow-hidden bg-[#23283a] border border-[#2d3748] focus-within:border-green-500 transition-colors">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400">$</span>
                </div>
                <input
                  ref={amountInputRef}
                  type="number"
                  name="monto"
                  id="monto"
                  className="block w-full bg-transparent border-0 pl-8 pr-20 py-3 text-white placeholder-gray-500 focus:ring-0 sm:text-sm"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => {
                    // Permite solo números y un punto decimal
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    // Asegura que solo haya un punto decimal
                    if ((value.match(/\./g) || []).length <= 1) {
                      setMonto(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Permite: números, punto, teclas de control, tab, etc.
                    if (!/[0-9.]/.test(e.key) && 
                        !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  onBlur={() => {
                    // Formatea el número a dos decimales al perder el foco
                    if (monto) {
                      const num = parseFloat(monto);
                      if (!isNaN(num)) {
                        setMonto(num.toFixed(2));
                      }
                    }
                  }}
                  step="0.01"
                  min="0.01"
                  max={saldoPendiente}
                  required
                  aria-required="true"
                  aria-label="Monto del pago"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-400 text-sm">
                    USD
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Mínimo: $0.01</span>
                <span>Máximo: ${saldoPendiente.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                {METODOS_PAGO.map((metodo) => {
                  const Icon = metodo.icon;
                  return (
                    <div 
                      key={metodo.id}
                      onClick={() => setMetodoPago(metodo.id)}
                      className={`relative rounded-lg p-3 border-2 cursor-pointer transition-all ${
                        metodoPago === metodo.id 
                          ? 'border-green-500 bg-green-500/5' 
                          : 'border-[#2d3748] hover:border-gray-600 bg-[#23283a]'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`p-1.5 rounded-lg ${metodo.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-medium text-white">
                          {metodo.name}
                        </span>
                      </div>
                      {metodoPago === metodo.id && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5">
                          <CheckCircleIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedMethod.description}
              </p>
            </div>

            {/* Reference Number */}
            <div className="space-y-2">
              <label htmlFor="referencia" className="block text-sm font-medium text-gray-300">
                Número de Referencia
                <span className="text-gray-500 ml-1 font-normal">(Opcional)</span>
              </label>
              <div className="relative rounded-lg overflow-hidden bg-[#23283a] border border-[#2d3748] focus-within:border-green-500 transition-colors">
                <input
                  type="text"
                  name="referencia"
                  id="referencia"
                  className="block w-full bg-transparent border-0 px-4 py-3 text-white placeholder-gray-500 focus:ring-0 sm:text-sm"
                  placeholder="Ej: V-12345678, #Transferencia, etc."
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label htmlFor="notas" className="block text-sm font-medium text-gray-300">
                Notas
                <span className="text-gray-500 ml-1 font-normal">(Opcional)</span>
              </label>
              <div className="relative rounded-lg overflow-hidden bg-[#23283a] border border-[#2d3748] focus-within:border-green-500 transition-colors">
                <textarea
                  id="notas"
                  name="notas"
                  rows="2"
                  className="block w-full bg-transparent border-0 px-4 py-3 text-white placeholder-gray-500 focus:ring-0 sm:text-sm resize-none"
                  placeholder="Alguna observación sobre el pago..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      e.preventDefault();
                      document.querySelector('button[type="submit"]')?.focus();
                    }
                  }}
                  aria-label="Notas adicionales sobre el pago (opcional)"
                ></textarea>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full px-6 py-3.5 rounded-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all ${
                isLoading 
                  ? 'bg-green-600/80 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/20 hover:shadow-green-500/30'
              }`}
              aria-busy={isLoading}
              aria-live="polite"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  <span>Procesando pago...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>Registrar Pago de ${parseFloat(monto || '0').toFixed(2)}</span>
                </div>
              )}
            </button>
          </form>
        )}

        {paymentComplete && (
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-1">¡Pago Completado!</h4>
            <p className="text-gray-400 text-sm mb-6">
              Se ha registrado el pago completo de ${deudaTotal.toFixed(2)} exitosamente.
            </p>
            <button
              onClick={onPaymentSuccess}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#2d3748] hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  </>
  );
};