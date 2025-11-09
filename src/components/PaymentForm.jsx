// src/components/PaymentForm.jsx
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../api/supabaseClient';
import { toast } from 'sonner';
import { 
  CheckCircleIcon, 
  CurrencyDollarIcon, 
  ArrowPathIcon,
  BanknotesIcon,
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
      <div className="bg-[#1e2235] rounded-xl border border-[#2d3748] p-6 w-full max-w-2xl">
        {/* Selección de tickets */}
        {propTickets?.length > 1 && (
          <div className={`mb-6 p-4 rounded-lg ${fieldErrors.tickets ? 'bg-red-500/10 border border-red-500' : 'bg-[#2d3748]'}`}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-white">Tickets del jugador</h3>
              <button
                type="button"
                onClick={() => handleSelectAll(!allSelected)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
              {propTickets.map((ticket) => {
                const ticketId = ticket.id || ticket.ticket_id;
                const isSelected = selectedTickets[ticketId] || false;
                const saldo = Number(ticket.saldo_pendiente) || Number(rifa?.precio_ticket) || 0;
                const isPagado = saldo <= 0;
                
                return (
                  <div 
                    key={ticketId}
                    onClick={() => !isPagado && handleTicketSelect(ticketId, !isSelected)}
                    className={`p-2 rounded-md cursor-pointer transition-colors ${isPagado ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#3c4556]'} ${
                      isSelected ? 'bg-blue-500/20 border border-blue-500' : 'bg-[#374151]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTicketSelect(ticketId, !isSelected)}
                          disabled={isPagado}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                        />
                        <span className="ml-2 text-sm font-medium text-white">
                          Ticket #{ticket.numero_ticket || ticket.numero_ticket_ticket}
                        </span>
                      </div>
                      <span className="text-sm font-medium">
                        {isPagado ? (
                          <span className="text-green-400">Pagado</span>
                        ) : (
                          <span>${saldo.toFixed(2)}</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {fieldErrors.tickets && (
              <p className="mt-1 text-sm text-red-400">Seleccione al menos un ticket</p>
            )}
            {selectedCount > 0 && (
              <div className="mt-2 text-sm text-gray-300">
                {selectedCount} {selectedCount === 1 ? 'ticket seleccionado' : 'tickets seleccionados'} • 
                Total a pagar: <span className="font-semibold">${montoSeleccionado.toFixed(2)}</span>
              </div>
            )}
          </div>
        )}
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

export const PaymentForm = ({ 
  jugador, 
  rifa, 
  tickets: propTickets = [], 
  montoTotal: propMontoTotal = 0, 
  montoPagado: propMontoPagado = 0, 
  saldoPendiente: propSaldoPendiente = 0, 
  isPartialPayment = false, 
  onPaymentSuccess, 
  empresaId 
}) => {
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [banco, setBanco] = useState('');
  const [notas, setNotas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTickets, setSelectedTickets] = useState({});
  const [tickets, setTickets] = useState(propTickets || []);
  const [pagosJugador, setPagosJugador] = useState([]);
  const [montoTotal, setMontoTotal] = useState(0);
  const [showTicketSelection, setShowTicketSelection] = useState(false);
  const [ticketActual, setTicketActual] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
// Add this function inside your PaymentForm component, before the return statement
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!metodoPago) {
    toast.error('Por favor selecciona un método de pago');
    return;
  }

  if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
    toast.error('Por favor ingresa un monto válido');
    return;
  }

  const montoNum = parseFloat(monto);
  const montoMaximo = montoTotal; // Assuming montoTotal is defined in your component

  // Validate amount doesn't exceed maximum
  if (montoNum > montoMaximo) {
    toast.error(`El monto no puede ser mayor a $${montoMaximo.toFixed(2)}`);
    return;
  }

  setIsLoading(true);
  setError('');

  try {
    // Add your payment processing logic here
    // For example:
    // await processPayment(montoNum, metodoPago, referencia, banco, notas);
    
    // On success:
    setPaymentComplete(true);
    toast.success('Pago registrado exitosamente');
    
    // Call the success callback if provided
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  } catch (err) {
    console.error('Error al procesar el pago:', err);
    setError('Ocurrió un error al procesar el pago');
    toast.error('Error al procesar el pago');
  } finally {
    setIsLoading(false);
  }
};
return (
    <div className="bg-[#1e2235] rounded-xl border border-[#2d3748] overflow-hidden">
      <ConfirmationModal
        isOpen={showConfirmation}
        amount={monto}
        onConfirm={() => {
          setShowConfirmation(false);
          handleSubmit();
        }}
        onCancel={() => {
          setShowConfirmation(false);
        }}
      />
      
      {/* Header */}
      <div className="bg-[#23283a] px-6 py-4 border-b border-[#2d3748]">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
          Registrar Pago
        </h3>
      </div>

      <div className="p-6">
        {!paymentComplete ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Your form fields here */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Monto
              </label>
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-full bg-[#23283a] border border-[#2d3748] rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>

            {/* Add other form fields here */}

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? 'Procesando...' : 'Registrar Pago'}
            </button>
          </form>
        ) : (
          <div className="text-center py-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-1">¡Pago Completado!</h4>
            <p className="text-gray-400 text-sm mb-6">
              Se ha registrado el pago completo de ${montoTotal.toFixed(2)} exitosamente.
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
  );
};

export default PaymentForm;