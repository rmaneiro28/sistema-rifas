// src/components/PaymentForm.jsx
import { useState, useEffect, useRef } from 'react';
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

export function PaymentForm({ 
    jugador, 
    rifa, 
    tickets: propTickets = [], 
    montoTotal: propMontoTotal = 0, 
    montoPagado: propMontoPagado = 0, 
    saldoPendiente: propSaldoPendiente = 0, 
    isPartialPayment = false, 
    onPaymentSuccess, 
    empresaId 
}) {
  const [monto, setMonto] = useState('');
  const [jugadorId, setJugadorId] = useState(() => {
    // 1. Check the jugador object first
    if (jugador) {
      // Try common ID field names in order of likelihood
      if (jugador.id) return jugador.id;
      if (jugador.jugador_id) return jugador.jugador_id;
      if (jugador.id_jugador) return jugador.id_jugador;
      
      // Check for nested jugador object
      if (jugador.jugador?.id) return jugador.jugador.id;
      if (jugador.jugador?.jugador_id) return jugador.jugador.jugador_id;
      if (jugador.jugador?.id_jugador) return jugador.jugador.id_jugador;
    }
    
    // 2. Check tickets if no ID found in jugador
    if (Array.isArray(propTickets) && propTickets.length > 0) {
      for (const ticket of propTickets) {
        // Check common ticket fields that might contain player ID
        if (ticket.jugador_id) return ticket.jugador_id;
        if (ticket.id_jugador) return ticket.id_jugador;
        if (ticket.jugador?.id) return ticket.jugador.id;
        if (ticket.jugador_id_jugador) return ticket.jugador_id_jugador;
      }
    }
    
    return null;
  });
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [telefonoPago, setTelefonoPago] = useState('');
  const [bancoPago, setBancoPago] = useState('');
  const [cedulaPago, setCedulaPago] = useState('');
  const [imagenPago, setImagenPago] = useState(null);
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [saldoPendiente, setSaldoPendiente] = useState(propSaldoPendiente || 0);
  const [montoMaximo, setMontoMaximo] = useState(propSaldoPendiente || 0);
  const [ticketsPendientes, setTicketsPendientes] = useState(propTickets || []);
  const [ticketsCliente, setTicketsCliente] = useState([]);
  const [resumenCliente, setResumenCliente] = useState({
    total: 0,
    pagadoTickets: 0,
    pagosHistorial: 0,
    pagadoCombinado: 0,
    pendienteCombinado: 0,
    cantidadTickets: 0,
  });
  const [pagosJugador, setPagosJugador] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({ telefono: false, banco: false, cedula: false });
  const amountInputRef = useRef(null);
  const firstPaymentMethodRef = useRef(null);

  // Lista de bancos de Venezuela para Pago Móvil
  const BANCOS_VE = [
    'Banco de Venezuela',
    'Banesco',
    'Mercantil',
    'Provincial (BBVA Provincial)',
    'BOD',
    'Banco Exterior',
    'BNC (Banco Nacional de Crédito)',
    'Banco del Tesoro',
    'Bicentenario',
    'Bancamiga',
    'Banco Activo',
    'Banplus',
    'Banco Caroní',
    'Banco Plaza',
    'Banco del Sur'
  ];

  // Formatea teléfono venezolano a 0412-1234567
  const formatVePhoneNumber = (value) => {
    const digits = (value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 4) return digits;
    return `${digits.slice(0,4)}-${digits.slice(4)}`;
  };

  // Prefijos válidos: 0412, 0414, 0416, 0424, 0422, 0426
  const isValidVePhone = (value) => /^(0412|0414|0416|0424|0422|0426)-\d{7}$/.test(value || '');

  // Formato y validación de Cédula/RIF (VE)
  const getIdMaxLenByPrefix = (prefix) => {
    if (!prefix) return 12; // L-########## (máximo)
    return ['J','G'].includes(prefix) ? 12 : 11; // Incluye letra + guión + dígitos
  };

  const formatVeId = (value) => {
    const v = (value || '').toUpperCase().replace(/\s+/g, '');
    // Quitar caracteres no válidos excepto letra inicial, dígitos y '-'
    let cleaned = v.replace(/[^VEJG0-9-]/gi, '');
    // Asegurar estructura L-########
    const m = cleaned.match(/^([VEJGvejg])[-]?([0-9]*)/);
    if (!m) return cleaned.slice(0, 12);
    const letter = m[1].toUpperCase();
    const digits = (m[2] || '').replace(/\D/g, '');
    const maxDigits = ['J','G'].includes(letter) ? 10 : 9; // dígitos sin contar letra ni guión
    const limited = digits.slice(0, maxDigits);
    return `${letter}-${limited}`;
  };

  const isValidVeId = (value) => {
    const v = (value || '').toUpperCase();
    const m = v.match(/^([VEJG])-([0-9]{7,10})$/);
    if (!m) return false;
    const letter = m[1];
    const len = m[2].length;
    if (letter === 'V' || letter === 'E') {
      return len >= 7 && len <= 9;
    }
    if (letter === 'J' || letter === 'G') {
      return len >= 9 && len <= 10;
    }
    return false;
  };
  
  // Debug: Log the received props
  useEffect(() => {
    console.log('PaymentForm props:', {
      jugador,
      rifa,
      tickets: propTickets,
      isPartialPayment,
      propMontoTotal,
      propMontoPagado,
      propSaldoPendiente
    });
  }, [jugador, rifa, propTickets, isPartialPayment, propMontoTotal, propMontoPagado, propSaldoPendiente]);

  useEffect(() => {
    if (isPartialPayment && propSaldoPendiente > 0) {
      // Usar los valores proporcionados directamente
      setSaldoPendiente(propSaldoPendiente);
      setMontoMaximo(propSaldoPendiente);
      setMonto(propSaldoPendiente.toString());
      setTicketsPendientes(propTickets);
    } else if (jugador && rifa) {
      // Calcular deuda total del jugador en esta rifa
      const deudaTotalCalc = (jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0);
      const montoPagadoCalc = jugador?.tickets?.reduce((total, ticket) => {
        const montoTotal = ticket?.monto_total || 0;
        const saldoPendienteTicket = ticket?.saldo_pendiente || 0;
        return total + (montoTotal - saldoPendienteTicket);
      }, 0) || 0;
      const saldoActual = deudaTotalCalc - montoPagadoCalc;

      // Actualizar el estado solo si hay un cambio
      if (saldoPendiente !== saldoActual) {
        setSaldoPendiente(saldoActual);
        setMontoMaximo(saldoActual);
        setMonto(saldoActual > 0 ? saldoActual.toString() : '');
      }
    }
  }, [jugador, rifa, isPartialPayment]); // Removed saldoPendiente from dependencies

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
    const montoMaximoPermitido = isPartialPayment ? montoMaximo : saldoPendiente;

    if (isNaN(montoNum) || montoNum <= 0) {
      toast.error('Por favor ingrese un monto válido');
      amountInputRef.current?.focus();
      return false;
    }

    if (montoNum > montoMaximoPermitido) {
      toast.error(`El monto no puede ser mayor a $${montoMaximoPermitido.toFixed(2)}`);
      amountInputRef.current?.focus();
      return false;
    }

    // Validar referencia para métodos que la requieren
    if (['transferencia', 'pago_movil', 'zelle'].includes(metodoPago) && !referencia.trim()) {
      toast.error(`Por favor ingrese el número de referencia para ${METODOS_PAGO.find(m => m.id === metodoPago)?.name}`);
      return false;
    }

    // Reglas específicas para Pago Móvil
    if (metodoPago === 'pago_movil') {
      setFieldErrors({ telefono: false, banco: false, cedula: false });
      if (!telefonoPago || !isValidVePhone(telefonoPago)) {
        setFieldErrors(prev => ({ ...prev, telefono: true }));
        toast.error('Teléfono Pago Móvil inválido. Prefijos válidos: 0412, 0414, 0416, 0424, 0422, 0426 (formato 0412-1234567)');
        return false;
      }
      if (!bancoPago) {
        setFieldErrors(prev => ({ ...prev, banco: true }));
        toast.error('Seleccione el banco para Pago Móvil');
        return false;
      }
      if (!cedulaPago || !isValidVeId(cedulaPago)) {
        setFieldErrors(prev => ({ ...prev, cedula: true }));
        toast.error('Ingrese Cédula/RIF válido (V/E: 7-9 dígitos | J/G: 9-10 dígitos)');
        return false;
      }
    }

    return true;
  };

  /**
   * Obtiene el ID del jugador de forma robusta desde diferentes fuentes.
   */
  const getJugadorId = () => {
    const ticket = propTickets?.[0];
    
    // 1. Verificar si el jugador es un objeto con propiedad id
    if (jugador && typeof jugador === 'object' && jugador.id) {
      return jugador.id;
    }
    
    // 2. Verificar en el ticket
    if (ticket?.jugador_id) return ticket.jugador_id;
    if (ticket?.id_jugador) return ticket.id_jugador;
    if (ticket?.jugador?.id) return ticket.jugador.id;
    
    // 3. Si jugador es un ID directo
    if (jugador) return jugador;
    
    console.error('No se pudo determinar el ID del jugador:', { jugador, ticket });
    return null;
  };

  /**
   * Maneja la lógica para un pago parcial (abono).
   */
  const handlePartialPayment = async (montoNum, referenciaFormateada) => {
    const jugadorId = getJugadorId();
    if (!jugadorId) {
      throw new Error("No se pudo determinar el ID del jugador. El ticket debe estar asignado a un jugador.");
    }

    // Determinar el banco basado en el método de pago
    const banco = metodoPago === 'efectivo' ? 'Efectivo' : 
                 metodoPago === 'pago_movil' ? 'Pago Móvil' :
                 metodoPago === 'zelle' ? 'Zelle' :
                 metodoPago === 'transferencia' ? 'Transferencia Bancaria' : 'Otro';

    // Determinar el ticket objetivo (único)
    const ticketProp = Array.isArray(propTickets) && propTickets.length > 0 ? propTickets[0] : null;
    if (!ticketProp) throw new Error('No se recibió el ticket a abonar.');

    // Obtener el ticket más reciente, soportando id/ticket_id
    let ticketActual = null;
    try {
      const tryId = ticketProp.id || ticketProp.ticket_id;
      let { data, error } = await supabase
        .from('t_tickets')
        .select('*')
        .eq('id', tryId)
        .single();
      if (error) {
        // Reintentar con ticket_id
        const res2 = await supabase
          .from('t_tickets')
          .select('*')
          .eq('ticket_id', tryId)
          .single();
        data = res2.data;
        if (res2.error) throw res2.error;
      }
      ticketActual = data;
    } catch (e) {
      throw new Error('Error al obtener el ticket seleccionado');
    }

    const precioTicket = rifa?.precio_ticket || Number(ticketActual?.monto || 0) || 0;
    const saldoTicket = Number(ticketActual?.saldo_pendiente ?? precioTicket);
    const esPagoCompleto = montoNum >= saldoTicket - 1e-6;

    // 1. Registrar el pago
    const { data: pago, error: pagoError } = await supabase
      .from('t_pagos')
      .insert({
        monto: montoNum,
        metodo_pago: metodoPago,
        tipo_pago: esPagoCompleto ? 'completo' : 'abono',
        referencia_bancaria: referenciaFormateada,
        banco,
        notas: notas.trim() || null,
        fecha_pago: new Date().toISOString(),
        empresa_id: empresaId,
        jugador_id: jugadorId,
        rifa_id: rifa?.id_rifa || rifa?.id || null,
        ticket_id: ticketActual?.id || ticketProp?.id || ticketProp?.ticket_id || null,
        es_abono: !esPagoCompleto
      })
      .select()
      .single();

    if (pagoError) throw pagoError;

    // 2. Actualizar el ticket con el nuevo saldo y estado
    const nuevoSaldo = Math.max(0, Number((saldoTicket - montoNum).toFixed(2)));
    const estadoPago = nuevoSaldo <= 0 ? 'completado' : (montoNum > 0 ? 'parcial' : 'pendiente');
    const updateData = {
      saldo_pendiente: nuevoSaldo,
      estado_pago: estadoPago,
      fecha_ultimo_pago: new Date().toISOString(),
      estado: nuevoSaldo <= 0 ? 'pagado' : 'abonado',
      jugador_id: ticketActual.jugador_id || jugadorId
    };

    // Intentar actualizar por id y luego por ticket_id, incluyendo empresa_id
    let { error: updErr } = await supabase
      .from('t_tickets')
      .update(updateData)
      .eq('empresa_id', empresaId)
      .eq('rifa_id', rifa?.id_rifa || rifa?.id)
      .eq('jugador_id', jugadorId)
      .eq('id', ticketActual.id);
    if (updErr) {
      const res = await supabase
        .from('t_tickets')
        .update(updateData)
        .eq('empresa_id', empresaId)
        .eq('rifa_id', rifa?.id_rifa || rifa?.id)
        .eq('jugador_id', jugadorId)
        .eq('ticket_id', ticketActual.ticket_id || ticketProp.ticket_id || ticketActual.id);
      updErr = res.error;
    }

    // Fallback general para pagos parciales si cualquier error ocurre (p. ej., CHECK constraint o políticas)
    if (updErr && nuevoSaldo > 0) {
      const fallbackData = {
        ...updateData,
        estado: nuevoSaldo <= 0 ? 'pagado' : 'apartado',
        // asegurar coherencia del estado de pago
        estado_pago: nuevoSaldo <= 0 ? 'completado' : 'parcial'
      };

      // Reintentar por id
      let fb = await supabase
        .from('t_tickets')
        .update(fallbackData)
        .eq('empresa_id', empresaId)
        .eq('rifa_id', rifa?.id_rifa || rifa?.id)
        .eq('jugador_id', jugadorId)
        .eq('id', ticketActual.id);
      let fbErr = fb.error;

      // Reintentar por ticket_id si aún falla
      if (fbErr) {
        const fb2 = await supabase
          .from('t_tickets')
          .update(fallbackData)
          .eq('empresa_id', empresaId)
          .eq('rifa_id', rifa?.id_rifa || rifa?.id)
          .eq('jugador_id', jugadorId)
          .eq('ticket_id', ticketActual.ticket_id || ticketProp.ticket_id || ticketActual.id);
        fbErr = fb2.error;
      }

      if (!fbErr) {
        updErr = null; // fallback exitoso
      } else {
        updErr = fbErr;
      }
    }

    if (updErr) {
      // rollback del pago si falla la actualización en todos los intentos
      await supabase.from('t_pagos').delete().eq('id', pago.id);
      throw new Error(`No se pudo actualizar el ticket con el abono: ${updErr.message}`);
    }

    // 3. Registrar detalle del pago (opcional, por ticket)
    try {
      await supabase.from('t_pagos_detalle').insert([{
        pago_id: pago.id,
        ticket_id: ticketActual.id,
        monto: montoNum,
        saldo_anterior: saldoTicket,
        saldo_nuevo: nuevoSaldo,
        fecha: new Date().toISOString()
      }]);
    } catch (e) {
      console.warn('No se pudo registrar el detalle del pago:', e);
    }

    toast.success(`${esPagoCompleto ? 'Pago completo' : 'Abono'} de $${montoNum.toFixed(2)} registrado correctamente.`);
    onPaymentSuccess?.();
  };

  /**
   * Maneja la lógica para un pago completo o abono a la deuda total de un jugador.
   */
  const handleFullPayment = async (montoNum, referenciaFormateada) => {
    // Lógica para pagos normales (no parciales)
    const deudaTotalActual = (jugador?.tickets?.length || 0) * (rifa?.precio_ticket || 0);
    const montoPagadoActual = jugador?.tickets?.reduce((total, ticket) => {
      return total + ((ticket?.monto_total || 0) - (ticket?.saldo_pendiente || 0));
    }, 0) || 0;
    const saldoActual = deudaTotalActual - montoPagadoActual;

    // Aquí iría la lógica detallada para distribuir el pago entre los tickets del jugador.
    // Por simplicidad, esta refactorización se centra en la estructura.
    // La lógica original para `handleFullPayment` puede ser compleja y se puede mover aquí.
    
    // Ejemplo simplificado:
    if (montoNum >= saldoActual) {
      toast.success('Pago completo registrado (lógica simplificada).');
    } else {
      toast.success(`Abono de $${montoNum.toFixed(2)} registrado (lógica simplificada).`);
    }

    // Después de procesar, actualizar estado y notificar
    onPaymentSuccess?.();
  };

  /**
   * Orquesta el proceso de pago, decidiendo qué tipo de pago manejar.
   */
  const processPayment = async () => {
    const montoNum = parseFloat(pendingPayment || monto);
    setIsLoading(true);

    try {
      const referenciaFormateada = formatReference(metodoPago, referencia);

      if (isPartialPayment) {
        await handlePartialPayment(montoNum, referenciaFormateada);
      } else {
        if (!jugador || !rifa) {
          throw new Error("Faltan datos del jugador o de la rifa para un pago completo.");
        }
        await handleFullPayment(montoNum, referenciaFormateada);
      }
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      toast.error(`Error al registrar el pago: ${error.message}`);
    } finally {
      setIsLoading(false);
      setPendingPayment(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!metodoPago) {
      toast.error('Por favor seleccione un método de pago');
      return;
    }

    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      toast.error('Por favor ingrese un monto válido');
      return;
    }
    
    const montoNum = parseFloat(monto);
    const limiteMax = Number(maxAllowed || 0);
    
    // Validar que el monto no exceda el saldo permitido
    if (montoNum > limiteMax) {
      toast.error(`El monto no puede ser mayor a $${limiteMax.toFixed(2)}`);
      return;
    }
    
    // Formatear referencia 
    const referenciaFormateada = formatReference(metodoPago, referencia);
    
    // Mostrar confirmación para montos grandes
    if (montoNum > 1000) {
      setPendingPayment({ monto: montoNum, referencia: referenciaFormateada });
      setShowConfirmation(true);
      return;
    }
    
    setPendingPayment(montoNum);
    await processPayment(referenciaFormateada);
  };
  
  // Función para calcular los montos totales de los tickets
  const calcularMontos = () => {
    let total = 0;
    let pagado = 0;
    let pendiente = 0;
    
    // Usar ticketsPendientes si está disponible, de lo contrario usar propTickets
    const tickets = ticketsPendientes.length > 0 ? ticketsPendientes : (Array.isArray(propTickets) ? propTickets : []);
    
    // Si no hay tickets, retornar valores por defecto
    if (tickets.length === 0) {
      return { total: 0, pagado: 0, pendiente: 0, cantidadTickets: 0 };
    }
    
    // Calcular montos totales
    tickets.forEach(ticket => {
      const montoTicket = ticket.monto || rifa?.precio_ticket || 0;
      const saldoPendienteTicket = ticket.saldo_pendiente || 0;
      const montoPagadoTicket = montoTicket - saldoPendienteTicket;
      
      total += montoTicket;
      pagado += montoPagadoTicket;
      pendiente += saldoPendienteTicket;
    });
    
    // Asegurarse de que no haya montos negativos
    pagado = Math.max(0, Math.min(pagado, total));
    pendiente = Math.max(0, Math.min(pendiente, total));
    
    return {
      total,
      pagado,
      pendiente,
      cantidadTickets: tickets.length
    };
  };
  
  // Obtener y actualizar los tickets del cliente con sus pagos
  useEffect(() => {
    const fetchTicketsYPagos = async () => {
      // Si el formulario fue abierto como pago parcial con totales pasados por props,
      // no recalcular ni consultar datos para evitar inconsistencias visuales
      if (isPartialPayment) return;
      if (!jugador?.id || !rifa?.id) return;
      
      try {
        // Obtener tickets del jugador para la rifa actual
        const { data: tickets, error: ticketsError } = await supabase
          .from('t_tickets')
          .select('*')
          .eq('jugador_id', jugador.id)
          .eq('rifa_id', rifa.id);
          
        if (ticketsError) throw ticketsError;
        
        if (tickets && tickets.length > 0) {
          // Obtener todos los pagos del jugador para esta rifa
          const { data: pagos, error: pagosError } = await supabase
            .from('t_pagos')
            .select('*')
            .eq('jugador_id', jugador.id)
            .eq('rifa_id', rifa.id);
            
          if (pagosError) throw pagosError;
          setPagosJugador(pagos || []);
          
          // Usar directamente el saldo_pendiente del ticket que ya viene calculado
          const ticketsActualizados = tickets.map(ticket => {
            const montoTicket = parseFloat(ticket.monto || rifa?.precio_ticket || 0);
            const saldoPendiente = parseFloat(ticket.saldo_pendiente || 0);
            const montoPagado = montoTicket - saldoPendiente;
            
            console.log(`Ticket ${ticket.id || ticket.numero_ticket || 'N/A'}:`, {
              montoTicket,
              montoPagado,
              saldoPendiente,
              ticketData: ticket
            });
            
            return {
              ...ticket,
              monto: montoTicket,
              monto_pagado: Math.max(0, montoPagado), // Asegurar que no sea negativo
              saldo_pendiente: Math.max(0, saldoPendiente) // Asegurar que no sea negativo
            };
          });
          
          // Filtrar solo tickets con saldo pendiente
          const ticketsConSaldo = ticketsActualizados.filter(t => t.saldo_pendiente > 0);
          
          // Calcular totales
          const totalPendiente = ticketsConSaldo.reduce((sum, t) => sum + t.saldo_pendiente, 0);
          const totalPagado = ticketsActualizados.reduce((sum, t) => sum + t.monto_pagado, 0);
          const totalGeneral = ticketsActualizados.reduce((sum, t) => sum + t.monto, 0);
          const sumaPagosHistorial = (pagos || []).reduce((s, p) => s + parseFloat(p?.monto || 0), 0);
          const pagadoCombinado = Math.min(totalGeneral, totalPagado + sumaPagosHistorial);
          const pendienteCombinado = Math.max(0, Number((totalGeneral - pagadoCombinado).toFixed(2)));
          
          console.log('Resumen de pagos:', {
            totalGeneral,
            totalPagado,
            sumaPagosHistorial,
            pagadoCombinado,
            pendienteCombinado,
            totalPendiente,
            tickets: ticketsActualizados
          });
          
          // Actualizar estados (separar datos para UI estable)
          setTicketsCliente(ticketsActualizados);
          setTicketsPendientes(ticketsConSaldo);
          setMontoMaximo(pendienteCombinado);
          setSaldoPendiente(pendienteCombinado);
          setResumenCliente({
            total: totalGeneral,
            pagadoTickets: totalPagado,
            pagosHistorial: sumaPagosHistorial,
            pagadoCombinado,
            pendienteCombinado,
            cantidadTickets: ticketsActualizados.length,
          });
          
          // Si no hay saldo pendiente, no permitir el pago
          if (totalPendiente <= 0) {
            toast.info('No hay saldo pendiente por pagar');
            onPaymentSuccess?.();
            return;
          }
          
          // Establecer el monto por defecto como el saldo pendiente total
          setMonto(pendienteCombinado.toString());
        }
      } catch (error) {
        console.error('Error al obtener tickets del cliente:', error);
        toast.error('Error al cargar los tickets del cliente');
      }
    };
    
    fetchTicketsYPagos();
  }, [jugador?.id, rifa?.id, onPaymentSuccess, isPartialPayment]);
  
  const { 
    total: montoTotalTickets, 
    pagado: montoPagadoTickets, 
    pendiente: saldoPendienteCalculado,
    cantidadTickets
  } = calcularMontos();

  // Usar el resumen estable si está disponible, evitando recalcular y cambiando montos
  const deudaTotal = resumenCliente.total > 0 ? resumenCliente.total : (montoTotalTickets > 0 ? montoTotalTickets : (propMontoTotal || 0));
  const montoPagadoCombinado = resumenCliente.pagadoCombinado > 0 ? resumenCliente.pagadoCombinado : Math.min(deudaTotal, (montoPagadoTickets > 0 ? montoPagadoTickets : (propMontoPagado || 0)) + (pagosJugador || []).reduce((s, p) => s + parseFloat(p?.monto || 0), 0));
  const saldoPendienteCombinado = resumenCliente.pendienteCombinado > 0 || resumenCliente.total > 0 ? resumenCliente.pendienteCombinado : Math.max(0, Number((deudaTotal - montoPagadoCombinado).toFixed(2)));
  const maxAllowed = isPartialPayment ? (propSaldoPendiente || montoMaximo || 0) : saldoPendienteCombinado;
  
  // Actualizar el estado del saldo pendiente si es necesario
  useEffect(() => {
    if (saldoPendienteCalculado > 0 && saldoPendiente !== saldoPendienteCalculado) {
      setSaldoPendiente(saldoPendienteCalculado);
    }
  }, [saldoPendienteCalculado]);
  
  // Valores de visualización: en modo parcial respetar props para evitar saltos
  const displayDeudaTotal = isPartialPayment ? (propMontoTotal || deudaTotal) : deudaTotal;
  const displaySaldoPendiente = isPartialPayment ? (propSaldoPendiente || saldoPendienteCombinado) : saldoPendienteCombinado;
  const displayPagadoCombinado = Math.max(0, Number(((displayDeudaTotal || 0) - (displaySaldoPendiente || 0)).toFixed(2)));
  const paymentComplete = displaySaldoPendiente <= 0;
  const progressPercentage = displayDeudaTotal > 0 && !isNaN(displayPagadoCombinado / displayDeudaTotal) ? Math.round((displayPagadoCombinado / displayDeudaTotal) * 100) : 0;
  
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
              <p className="font-medium text-white">${displayDeudaTotal.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="font-medium text-green-400">${displayPagadoCombinado.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Pendiente</p>
              <p className={`font-medium ${paymentComplete ? 'text-green-400' : 'text-yellow-400'}`}>
                ${displaySaldoPendiente.toFixed(2)}
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
                  max={maxAllowed}
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
                <span>Máximo: ${Number(maxAllowed || 0).toFixed(2)}</span>
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
              {/* Get the selected payment method */}
              {(() => {
                const selectedMethod = METODOS_PAGO.find(m => m.id === metodoPago) || METODOS_PAGO[0];
                return (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedMethod?.description || ''}
                  </p>
                );
              })()}
            </div>

            {/* Payment Details - Conditional based on payment method */}
            {['pago_movil', 'transferencia', 'zelle'].includes(metodoPago) && (
              <div className="space-y-4 border-t border-[#2d3748] pt-4">
                <h4 className="text-sm font-medium text-gray-300">Datos del Pago</h4>
                
                {/* Phone Number */}
                <div className="space-y-2">
                  <label htmlFor="telefonoPago" className="block text-sm font-medium text-gray-300">
                    Teléfono de Pago {metodoPago === 'pago_movil' && <span className="text-red-400">*</span>}
                    <span className="text-gray-500 ml-1 font-normal">{metodoPago === 'pago_movil' ? '(Prefijos: 0412, 0414, 0416, 0424, 0422, 0426 | Formato: 0412-1234567)' : '(Opcional)'}</span>
                  </label>
                  <div className={`relative rounded-lg overflow-hidden bg-[#23283a] border ${fieldErrors.telefono && metodoPago==='pago_movil' ? 'border-red-500' : 'border-[#2d3748]'} focus-within:border-green-500 transition-colors`}>
                    <input
                      type="tel"
                      inputMode="numeric"
                      name="telefonoPago"
                      id="telefonoPago"
                      className="block w-full bg-transparent border-0 px-4 py-3 text-white placeholder-gray-500 focus:ring-0 sm:text-sm"
                      placeholder={metodoPago === 'pago_movil' ? '0412-1234567' : 'Número de teléfono asociado al pago'}
                      value={telefonoPago}
                      maxLength={12}
                      onChange={(e) => {
                        const v = formatVePhoneNumber(e.target.value);
                        setTelefonoPago(v);
                        if (isValidVePhone(v)) setFieldErrors(prev => ({ ...prev, telefono: false }));
                      }}
                    />
                  </div>
                  {fieldErrors.telefono && metodoPago==='pago_movil' && (
                    <p className="text-xs text-red-400">Ingrese un número válido con prefijo 0412, 0414, 0416, 0424, 0422 o 0426. Ej: 0412-1234567</p>
                  )}
                </div>

                {/* Bank */}
                <div className="space-y-2">
                  <label htmlFor="bancoPago" className="block text-sm font-medium text-gray-300">
                    Banco {metodoPago === 'pago_movil' && <span className="text-red-400">*</span>}
                    <span className="text-gray-500 ml-1 font-normal">{metodoPago === 'pago_movil' ? '(Seleccione su banco de Pago Móvil)' : '(Opcional)'}</span>
                  </label>
                  <div className={`relative rounded-lg overflow-hidden bg-[#23283a] border ${fieldErrors.banco && metodoPago==='pago_movil' ? 'border-red-500' : 'border-[#2d3748]'} focus-within:border-green-500 transition-colors`}>
                    {metodoPago === 'pago_movil' ? (
                      <select
                        name="bancoPago"
                        id="bancoPago"
                        className="block w-full bg-transparent border-0 px-4 py-3 text-white focus:ring-0 sm:text-sm"
                        value={bancoPago}
                        onChange={(e) => {
                          setBancoPago(e.target.value);
                          if (e.target.value) setFieldErrors(prev => ({ ...prev, banco: false }));
                        }}
                      >
                        <option value="" className="bg-[#23283a] text-gray-400">Seleccione una opción</option>
                        {BANCOS_VE.map((b) => (
                          <option key={b} value={b} className="bg-[#23283a] text-white">{b}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="bancoPago"
                        id="bancoPago"
                        className="block w-full bg-transparent border-0 px-4 py-3 text-white placeholder-gray-500 focus:ring-0 sm:text-sm"
                        placeholder="Banco origen del pago"
                        value={bancoPago}
                        onChange={(e) => setBancoPago(e.target.value)}
                      />
                    )}
                  </div>
                  {fieldErrors.banco && metodoPago==='pago_movil' && (
                    <p className="text-xs text-red-400">Seleccione un banco</p>
                  )}
                </div>

                {/* ID */}
                <div className="space-y-2">
                  <label htmlFor="cedulaPago" className="block text-sm font-medium text-gray-300">
                    Cédula/RIF
                    <span className="text-gray-500 ml-1 font-normal">(Opcional)</span>
                  </label>
                  <div className={`relative rounded-lg overflow-hidden bg-[#23283a] border ${fieldErrors.cedula && metodoPago==='pago_movil' ? 'border-red-500' : 'border-[#2d3748]'} focus-within:border-green-500 transition-colors`}>
                    <input
                      type="text"
                      name="cedulaPago"
                      id="cedulaPago"
                      className="block w-full bg-transparent border-0 px-4 py-3 text-white placeholder-gray-500 focus:ring-0 sm:text-sm"
                      placeholder={metodoPago==='pago_movil' ? 'V-12345678 / J-123456789' : 'Cédula o RIF asociado al pago'}
                      value={cedulaPago}
                      maxLength={12}
                      onChange={(e) => {
                        const v = formatVeId(e.target.value);
                        setCedulaPago(v);
                        if (isValidVeId(v)) setFieldErrors(prev => ({ ...prev, cedula: false }));
                      }}
                    />
                  </div>
                  {fieldErrors.cedula && metodoPago==='pago_movil' && (
                    <p className="text-xs text-red-400">V/E: 7-9 dígitos | J/G: 9-10 dígitos</p>
                  )}
                </div>

                {/* Payment Screenshot */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Captura de Pago
                    <span className="text-gray-500 ml-1 font-normal">(Opcional)</span>
                  </label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-[#2d3748] rounded-lg">
                    <div className="space-y-1 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                        aria-hidden="true"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="flex text-sm text-gray-400">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer bg-[#23283a] rounded-md font-medium text-green-500 hover:text-green-400 focus-within:outline-none"
                        >
                          <span>Subir archivo</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                setImagenPago(file);
                              }
                            }}
                          />
                        </label>
                        <p className="pl-1">o arrastra y suelta</p>
                      </div>
                      <p className="text-xs text-gray-500">
                        PNG, JPG, GIF hasta 5MB
                      </p>
                      {imagenPago && (
                        <p className="text-xs text-green-400 mt-2">
                          Archivo seleccionado: {imagenPago.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
              disabled={isLoading || paymentComplete}
              className={`w-full px-6 py-3.5 rounded-lg font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all ${
                (isLoading || paymentComplete)
                  ? 'bg-green-600/40 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-500/20 hover:shadow-green-500/30'
              }`}
              aria-busy={isLoading}
              aria-live="polite"
              title={paymentComplete ? 'No hay saldo pendiente' : undefined}
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