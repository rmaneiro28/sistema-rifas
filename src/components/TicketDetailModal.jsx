import { useState, useEffect, useRef } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import {
    TicketIcon,
    XMarkIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    DocumentDuplicateIcon,
    ExclamationTriangleIcon,
    CurrencyDollarIcon,
    PlusIcon
} from "@heroicons/react/24/outline";
import { toBlob } from "html-to-image";
import logoRifasPlus from "../assets/Logo Rifas Plus Dark.jpg";
import { useAuth } from "../context/AuthContext";
import { PaymentForm } from "./PaymentForm";

const formatTicketNumber = (number, totalTickets) => {
    if (number === null || number === undefined || !totalTickets) return "N/A";
    const maxNumber = totalTickets > 0 ? totalTickets - 1 : 0;
    const numDigits = String(maxNumber).length;
    return String(number).padStart(numDigits, "0");
};

const formatTelephone = (phone) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, "+58-$1-$2-$3");
};

const filterOptions = [
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", textColor: "text-white" },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", textColor: "text-yellow-900" },
    { key: "pagado", label: "Pagados", color: "bg-green-500", textColor: "text-white" },
    { key: "abonado", label: "Abonados", color: "bg-purple-500", textColor: "text-white" }
];

export function TicketDetailModal({ isOpen, onClose, ticket, playerGroup, rifa, onStatusUpdate }) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedTicketInfo, setGeneratedTicketInfo] = useState(null);
    const [isReleasing, setIsReleasing] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [ticketToRelease, setTicketToRelease] = useState(null);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [ticketPaymentInfo, setTicketPaymentInfo] = useState({ payments: [] });
    const ticketRef = useRef();
    const { empresaId } = useAuth();
    console.log("generatedTicketInfo", generatedTicketInfo);
    
  const [LogoUrl, setLogoUrl] = useState(null);
  const [empresa, setEmpresa] = useState(null);

   useEffect(() => {
    const fetchEmpresa = async () => {
      if (empresaId) {
        const { data: empresa, error } = await supabase
          .from('t_empresas')
          .select('nombre_empresa, direccion_empresa, logo_url')
          .eq('id_empresa', empresaId)
          .single();

        if (error) {
          console.error('Error fetching empresa:', error);
        } else if (empresa) {
          setLogoUrl(empresa.logo_url);
          setEmpresa(empresa.nombre_empresa);
        }
      }
    };

    fetchEmpresa();
  }, [empresaId]);

    // Validación para evitar errores cuando ticket es null
    if (!ticket && isOpen) {
        console.error('TicketDetailModal: ticket prop is null');
        return null;
    }

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
        }
    }, [isOpen]);

    useEffect(() => {
        console.log(ticket, rifa, playerGroup)
        if (ticket && rifa) {
            setGeneratedTicketInfo({
                jugador: `${playerGroup?.info?.nombre_jugador || 'Jugador'} ${playerGroup?.info?.apellido_jugador || ''}`.trim(),
                rifa: rifa?.nombre || 'Rifa',
                numeros: [ticket.numero_ticket],
                total: rifa?.precio_ticket || 0,
                telefono: playerGroup?.info?.telefono_jugador || ticket.telefono_jugador || ticket.telefono || 'N/A',
                metodoPago: playerGroup?.info?.metodo_pago || ticket.metodo_pago || 'N/A',
                referencia: playerGroup?.info?.referencia_pago || ticket.referencia_pago || ticket.referencia || 'N/A',
                fecha: new Date(ticket.fecha_creacion_ticket || ticket.created_at || Date.now())
            });
        }
    }, [ticket, playerGroup, rifa]);

    // Cargar información de pagos del ticket
    useEffect(() => {
        const loadPaymentInfo = async () => {
            if (!ticket || !ticket.id) return;

            try {
                // Obtener pagos SOLO del TICKET actual (historial individual)
                const candidateTicketIds = [ticket.id, ticket.ticket_id].filter(Boolean);
                const { data: payments, error: paymentsError } = await supabase
                    .from('t_pagos')
                    .select('*')
                    .eq('empresa_id', empresaId)
                    .in('ticket_id', candidateTicketIds)
                    .order('fecha_pago', { ascending: false });

                if (paymentsError) {
                    console.error('Error loading payments:', paymentsError);
                    return;
                }

                // Obtener el estado actual del ticket para verificar si está pagado
                const { data: ticketData, error: ticketError } = await supabase
                    .from('t_tickets')
                    .select('estado, estado_pago, saldo_pendiente')
                    .eq('id', ticket.id)
                    .single();

                if (ticketError) {
                    console.error('Error loading ticket data:', ticketError);
                    return;
                }

                // Calcular totales base del ticket actual (individual)
                const montoTotal = rifa?.precio_ticket || 0;
                const montoPagado = payments.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);
                
                // Calcular el saldo pendiente basado en los pagos realizados
            // Usar el saldo_pendiente de la base de datos si existe, de lo contrario calcularlo
            let saldoPendiente = ticketData?.saldo_pendiente !== undefined ? 
                parseFloat(ticketData.saldo_pendiente) : 
                Math.max(0, montoTotal - montoPagado);
            
            // Asegurarse de que el saldo pendiente no sea negativo
            saldoPendiente = Math.max(0, saldoPendiente);

                // Determinar el estado del pago
                let estadoPago = 'pendiente';
                if (ticketData?.estado === 'pagado' || saldoPendiente <= 0) {
                    estadoPago = 'completado';
                } else if (montoPagado > 0) {
                    estadoPago = 'parcial';
                }

                setTicketPaymentInfo({
                    montoTotal,
                    montoPagado,
                    saldoPendiente,
                    payments: payments || [],
                    estadoPago,
                    estadoTicket: ticketData?.estado || ticket.estado_ticket || 'pendiente'
                });
            } catch (error) {
                console.error('Error loading payment info:', error);
            }
        };

        if (isOpen) {
            loadPaymentInfo();
        }
    }, [ticket, rifa, empresaId, isOpen]);

    const handlePaymentSuccess = async () => {
        setShowPaymentForm(false);
        
        try {
            // Obtener datos actualizados del ticket
            const { data: ticketData, error: ticketError } = await supabase
                .from('t_tickets')
                .select('*')
                .eq('id', ticket.id)
                .single();

            if (ticketError) throw ticketError;

            // Obtener pagos actualizados SOLO del TICKET actual (historial individual)
            const candidateTicketIds = [ticket.id, ticket.ticket_id].filter(Boolean);
            const { data: payments, error: paymentsError } = await supabase
                .from('t_pagos')
                .select('*')
                .eq('empresa_id', empresaId)
                .in('ticket_id', candidateTicketIds)
                .order('fecha_pago', { ascending: false });

            if (paymentsError) throw paymentsError;

            // Calcular totales del ticket
            const montoTotal = rifa?.precio_ticket || 0;
            const montoPagado = payments.reduce((sum, pago) => sum + parseFloat(pago.monto || 0), 0);
            
            // Calcular el saldo pendiente (asegurar tipo number, no string)
            // Usar el saldo_pendiente de la base de datos si existe, de lo contrario calcularlo
            let saldoPendiente = ticketData?.saldo_pendiente !== undefined ? 
                parseFloat(ticketData.saldo_pendiente) : 
                Math.max(0, Number((montoTotal - montoPagado).toFixed(2)));
            
            // Determinar el estado del pago
            let estadoPago = 'pendiente';
            if (saldoPendiente <= 0) {
                estadoPago = 'completado';
            } else if (montoPagado > 0) {
                estadoPago = 'parcial';
            }

            // Actualizar el ticket en la base de datos
            const { error: updateError } = await supabase
                .from('t_tickets')
                .update({ 
                    saldo_pendiente: saldoPendiente,
                    estado_pago: estadoPago,
                    estado: saldoPendiente <= 0 ? 'pagado' : 'abonado',
                    fecha_ultimo_pago: new Date().toISOString()
                })
                .eq('id', ticket.id);

            if (updateError) throw updateError;

            // Actualizar el estado local
            setTicketPaymentInfo({
                montoTotal,
                montoPagado,
                saldoPendiente,
                payments: payments || [],
                estadoPago,
                estadoTicket: saldoPendiente <= 0 ? 'pagado' : 'abonado'
            });

            // Mostrar notificación de éxito
            toast.success('¡Pago registrado exitosamente!', {
                duration: 5000,
                position: 'top-center',
                style: {
                    background: '#10B981',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }
            });

            // Notificar al componente padre para actualizar la lista de tickets
            onStatusUpdate();
        } catch (error) {
            console.error('Error al actualizar la información de pagos:', error);
            toast.error('Error al actualizar la información de pagos');
        }
    };

    const handleClose = () => {
        setIsAnimating(false);
        setShowPaymentForm(false);
        setTicketPaymentInfo(null);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for animation
    };

    const handleUpdateSingleTicketStatus = async (newStatus) => {
        if (!ticket || !rifa || !playerGroup) return;

        // Si se está marcando como pagado
        if (newStatus === 'pagado') {
            // Si ya está pagado, no hacer nada
            if (ticket.estado_ticket === 'pagado') return;
            
            // Calcular totales SOLO del ticket actual (abonos por ticket individual)
            const price = rifa?.precio_ticket || 0;
            const ticketActual = ticket;
            const saldoPendienteTicket = Number(ticketActual?.saldo_pendiente ?? price);
            const montoPagadoTicket = Math.max(0, Number((price - saldoPendienteTicket).toFixed(2)));

            // Si hay saldo pendiente en el ticket, mostrar formulario de pago SOLO para este ticket
            if (saldoPendienteTicket > 0) {
                setTicketPaymentInfo({
                    montoTotal: price,
                    montoPagado: montoPagadoTicket,
                    saldoPendiente: saldoPendienteTicket,
                    payments: Array.isArray(ticketPaymentInfo?.payments) ? ticketPaymentInfo.payments : [],
                    isPartialPayment: true,
                    tickets: [
                      {
                        id: ticketActual.id || ticketActual.ticket_id,
                        numero_ticket: ticketActual.numero_ticket || ticketActual.numero_ticket_ticket,
                        monto: price,
                        estado: ticketActual.estado_ticket || ticketActual.estado,
                        ...ticketActual
                      }
                    ],
                    jugador: {
                        id: playerGroup.info.jugador_id,
                        nombre: `${playerGroup.info.nombre_jugador || ''} ${playerGroup.info.apellido_jugador || ''}`.trim(),
                        telefono: playerGroup.info.telefono_jugador
                    },
                    rifa: {
                        id: rifa.id_rifa,
                        nombre: rifa.nombre,
                        precio_ticket: rifa.precio_ticket
                    }
                });

                setShowPaymentForm(true);
                return;
            }
        }

        setLoading(true);
        const { id, numero_ticket } = ticket;
        let updateData = { estado: newStatus };

        if (newStatus === 'disponible') {
            updateData.jugador_id = null;
        } else if (newStatus === 'pagado') {
            // Si se marca como pagado sin saldo pendiente, actualizar el estado de pago
            updateData.estado_pago = 'completado';
            updateData.saldo_pendiente = 0;
            updateData.fecha_ultimo_pago = new Date().toISOString();
        } else if (newStatus === 'abonado') {
            // Abonado implica pago parcial
            updateData.estado_pago = 'parcial';
        }

        console.log('Updating ticket:', { id, numero_ticket, updateData });

        try {
            // Try to update using id first, if that fails, try ticket_id
            let { data, error } = await supabase
                .from("t_tickets")
                .update(updateData)
                .eq("empresa_id", empresaId)
                .eq("id", id)
                .select();

            // If error suggests invalid column, try with ticket_id
            if (error && error.message.includes('column "id" does not exist')) {
                console.log('Trying with ticket_id column instead');
                const result = await supabase
                    .from("t_tickets")
                    .update(updateData)
                    .eq("empresa_id", empresaId)
                    .eq("ticket_id", id)
                    .select();
                data = result.data;
                error = result.error;
            }

            if (error) {
                console.error('Supabase update error:', error);
                toast.error(`Error al actualizar el ticket: ${error.message}`);
                return;
            }

            console.log('Update successful:', data);
            toast.success(`Ticket #${numero_ticket} actualizado a ${newStatus}`);
            onStatusUpdate();
        } catch (err) {
            console.error('Unexpected error updating ticket:', err);
            toast.error('Error inesperado al actualizar el ticket');
        } finally {
            setLoading(false);
        }
    };

    const handleReleaseClick = () => {
        if (!ticket) return;
        setTicketToRelease(ticket);
        setShowConfirmDialog(true);
    };

    const handleConfirmRelease = async () => {
        if (!ticketToRelease) return;
        
        setLoading(true);
        setIsReleasing(true);
        setShowConfirmDialog(false);
        
        const { id, numero_ticket } = ticketToRelease;
        const ticketIdAlt = ticketToRelease.ticket_id;

        console.log('Releasing ticket (delete with cascade):', { id, numero_ticket });

        try {
            // 1) Borrar pagos asociados al ticket por ticket_id directamente (considerando id y ticket_id)
            const candidateTicketIds = [id, ticketIdAlt].filter(Boolean);
            const { data: pagosBorrados, error: pagosDelErr } = await supabase
                .from('t_pagos')
                .delete()
                .in('ticket_id', candidateTicketIds)
                .select('id');
            if (pagosDelErr) {
                toast.error(`Error al eliminar pagos del ticket: ${pagosDelErr.message}`);
                throw pagosDelErr;
            }

            // 2) Desasociar cualquier pago remanente para romper la FK
            const { error: nullifyErr } = await supabase
                .from('t_pagos')
                .update({ ticket_id: null })
                .in('ticket_id', candidateTicketIds);
            if (nullifyErr) {
                toast.error('No se pudo desasociar ticket_id de pagos: ' + nullifyErr.message);
                throw nullifyErr;
            }

            // 3) Verificar que no existan pagos aún referenciando el ticket
            const { data: pagosRemanentes, error: checkErr } = await supabase
                .from('t_pagos')
                .select('id')
                .in('ticket_id', candidateTicketIds);
            if (checkErr) {
                console.warn('No se pudo verificar pagos remanentes:', checkErr);
            }
            if (Array.isArray(pagosRemanentes) && pagosRemanentes.length > 0) {
                toast.error('No se pudo liberar porque aún hay pagos referenciando el ticket. Intenta nuevamente o revisa RLS/Permisos.');
                setLoading(false);
                setIsReleasing(false);
                return;
            }

            // 4) Borrar el ticket
            let { error } = await supabase
                .from('t_tickets')
                .delete()
                .eq('empresa_id', empresaId)
                .eq('id', id);

            if (error && error.message.includes('column "id" does not exist')) {
                const result = await supabase
                    .from('t_tickets')
                    .delete()
                    .eq('empresa_id', empresaId)
                    .eq('ticket_id', id);
                error = result.error;
            }

            if (error) {
                console.error('Supabase release (delete) error:', error);
                toast.error(`Error al liberar el ticket: ${error.message}`);
                return;
            }

            console.log('Release (delete) successful');
            toast.success(`Ticket #${numero_ticket} liberado exitosamente`);
            onStatusUpdate();
            handleClose(); // Close modal after successful deletion
        } catch (err) {
            console.error('Unexpected error releasing (deleting) ticket:', err);
            toast.error('Error inesperado al liberar el ticket');
        } finally {
            setLoading(false);
            setIsReleasing(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!generatedTicketInfo?.telefono) return toast.error("Este jugador no tiene un número de teléfono registrado.");
        
        const { jugador, rifa: nombreRifa } = generatedTicketInfo;
        const pricePerTicket = rifa?.precio_ticket || 0;
        const playerTickets = playerGroup?.tickets?.length > 0 ? playerGroup.tickets : [ticket];
        
        // Calcular totales para todos los tickets del jugador
        const totalTickets = playerTickets.length;
        const totalAmountNumber = pricePerTicket * totalTickets;
        
        // Obtener pagos del historial para el ticket actual
        const currentTicketPayments = ticketPaymentInfo?.payments || [];
        const totalPaidFromHistory = currentTicketPayments.reduce(
            (sum, p) => sum + parseFloat(p.monto || 0), 0
        );

        // Calcular montos pagados y pendientes de forma consistente
        const { paid: combinedPaid, pending: pendingAmountNumber } = playerTickets.reduce((acc, t) => {
            const ticketPrice = pricePerTicket;
            let paid = 0;
            let pending = ticketPrice;
            
            // Si el ticket está marcado como pagado, considerar el monto completo
            if (t.estado_pago === 'pagado' || t.estado_ticket === 'pagado') {
                paid = ticketPrice;
                pending = 0;
            } 
            // Si el ticket tiene un monto pagado, usarlo
            else if (t.monto_pagado !== undefined && t.monto_pagado !== null) {
                // Sumar monto_pagado, monto_abonado y pagos del historial
                paid = Number(t.monto_pagado) + Number(t.monto_abonado || 0);
                
                // Si este es el ticket actual, sumar los pagos del historial
                if (t.id === ticket.id) {
                    paid += totalPaidFromHistory;
                }
                
                pending = Math.max(0, ticketPrice - paid);
            } 
            // Si solo tenemos saldo pendiente, calcular el monto pagado
            else if (t.saldo_pendiente !== undefined && t.saldo_pendiente !== null) {
                pending = Number(t.saldo_pendiente);
                paid = Math.max(0, ticketPrice - pending);
                
                // Si este es el ticket actual, sumar los pagos del historial
                if (t.id === ticket.id) {
                    paid += totalPaidFromHistory;
                    pending = Math.max(0, ticketPrice - paid);
                }
            } else if (t.estado_ticket === 'pagado') {
                // Si está marcado como pagado pero no tiene monto_pagado
                paid = ticketPrice;
                pending = 0;
            }
            
            return {
                paid: acc.paid + paid,
                pending: acc.pending + pending
            };
        }, { paid: 0, pending: 0 });
        
        const isFullyPaid = pendingAmountNumber <= 0.000001;

        // Lista de todos los números de ticket con sus estados
        const ticketNumbers = playerTickets.map(t => {
            const statusEmoji = {
                'pagado': '✅',
                'abonado': '🔵',
                'apartado': '⏳',
                'disponible': '❌',
                'familiares': '👨‍👩‍👧‍👦'
            }[t.estado_ticket] || '❓';
            
            return `${formatTicketNumber(t.numero_ticket || t.numero_ticket_ticket, rifa?.total_tickets)} ${statusEmoji}`;
        }).join('\n• ');
        
        let message = `*${empresa}*\n\n`;
        message += `Hola ${jugador}! 👋\n\n`;
        message += `*Rifa:* ${nombreRifa}\n`;
        message += `*Fecha de Sorteo:* ${rifa?.fecha_fin ? new Date(rifa.fecha_fin).toLocaleDateString('es-ES') : new Date().toLocaleDateString('es-ES')}\n\n`;
        message += `*Tus números (${totalTickets}):*\n• ${ticketNumbers}\n\n`;

        if (isFullyPaid) {
            message += `*Estado del pago:* ✅ *Completo*\n`;
            message += `*Total (${totalTickets} tickets):* $${totalAmountNumber.toFixed(2)}\n`;
            message += `*Pagado:* $${combinedPaid.toFixed(2)} (100%)\n`;
            message += `*Pendiente:* $0.00\n\n`;
            message += `¡Muchas gracias por tu pago! Tu participación está confirmada. 🎉\n\n`;
        } else {
            const paidPercentage = ((combinedPaid / totalAmountNumber) * 100).toFixed(0);
            message += `*Estado del pago:* ⚠️ *Pendiente*\n`;
            message += `*Total (${totalTickets} tickets):* $${totalAmountNumber.toFixed(2)}\n`;
            message += `*Pagado:* $${combinedPaid.toFixed(2)} (${paidPercentage}%)\n`;
            message += `*Pendiente:* $${pendingAmountNumber.toFixed(2)}\n\n`;
            message += `*Recordatorio de pago:*\n`;
            message += `Por favor, completa tu pago para asegurar tus números. Puedes realizar el pago mediante:\n`;
            message += `• Transferencia bancaria\n`;
            message += `• Efectivo en nuestras oficinas\n\n`;
            message += `¡No pierdas la oportunidad de ganar! 🏆\n\n`;
        }
        
        message += `¡Mucha suerte! 🍀\n`;
        message += `_Equipo ${empresa}_`;
        const whatsappUrl = `https://wa.me/${generatedTicketInfo.telefono.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopyTicket = async () => {
        if (!ticketRef.current) return toast.error("No se encontró la referencia del ticket.");
        try {
            const blob = await toBlob(ticketRef.current, { cacheBust: true, quality: 0.95, pixelRatio: 2, backgroundColor: '#FFF' });
            if (blob) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast.success('¡Imagen del ticket copiada al portapapeles!');
            }
        } catch (error) {
            console.error('Error al copiar la imagen:', error);
            toast.error('No se pudo copiar la imagen. Tu navegador podría no ser compatible.');
        }
    };

    if (!isOpen || !ticket) {
        return null;
    }
    
    // Debug logging
    console.log('Modal props:', { isOpen, ticket: !!ticket, playerGroup: !!playerGroup, rifa: !!rifa });
    console.log('Ticket data:', ticket);
    console.log('Player group data:', playerGroup);

    // Obtener todos los tickets del jugador
    const playerTickets = playerGroup?.tickets?.length > 0 ? playerGroup.tickets : [ticket];
    const pricePerTicket = rifa?.precio_ticket || 0;
    
    // Calcular totales agrupados para todos los tickets del jugador
    const totalTickets = playerTickets.length;
    const combinedTotal = pricePerTicket * totalTickets;
    
    // 1. Para el ticket actual (mostrar en el modal)
    const currentPayment = ticketPaymentInfo?.payments?.length > 0 
        ? ticketPaymentInfo.payments.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0)
        : 0;
    const ticketPaid = (parseFloat(ticket?.monto_pagado || 0) + parseFloat(ticket?.monto_abonado || 0)) + currentPayment;
    const ticketPending = Math.max(0, pricePerTicket - ticketPaid);

    // 2. Para el resumen de todos los tickets (usar en WhatsApp y resumen)
    let combinedPaid = 0;
    
    if (playerGroup?.tickets?.length > 0) {
        // Calcular total pagado en todos los tickets del jugador
        combinedPaid = playerGroup.tickets.reduce((total, t) => {
            // Si el ticket está pagado, sumar el precio completo
            if (t.estado_pago === 'pagado' || t.estado_ticket === 'pagado') {
                return total + pricePerTicket;
            }
            // Sumar monto_pagado, monto_abonado y pagos del historial
            let ticketPaid = parseFloat(t.monto_pagado || 0) + parseFloat(t.monto_abonado || 0);
            
            // Si es el ticket actual, sumar los pagos del historial
            if (t.id === ticket.id && ticketPaymentInfo?.payments?.length > 0) {
                const historyPayments = ticketPaymentInfo.payments.reduce(
                    (sum, p) => sum + parseFloat(p.monto || 0), 0
                );
                ticketPaid += historyPayments;
            }
            
            return total + ticketPaid;
        }, 0);
    } else {
        // Si no hay grupo, usar solo el ticket actual con su historial
        combinedPaid = ticketPaid;
    }
    
    // Calcular pendiente total (precio total - pagado)
    const combinedPending = Math.max(0, combinedTotal - combinedPaid);
    const displayPaid = Math.min(combinedPaid, combinedTotal);

    return (
        <>
            <div ref={ticketRef} className="bg-[#FFF] w-[400px] border border-[#23283a] rounded-lg p-4 sm:p-6 space-y-4">
                {generatedTicketInfo ? (
                    <>
                        {/* Header con logos */}
                        <div className="flex justify-between items-center border-b border-solid border-gray-600 pb-4">
                            <div className="flex items-center space-x-3">
                                <img src={LogoUrl} alt="Logo Cliente" className="h-8 w-auto" />
                                <div>
                                    <h3 className="text-lg font-bold text-[#23283a]">{generatedTicketInfo.rifa}</h3>
                                    <p className="text-xs text-[#23283a]">Comprobante de Participación</p>
                                </div>
                            </div>
                            <img src={logoRifasPlus} alt="RifasPlus" className="h-10 w-auto" />
                        </div>
                        <div className="space-y-3 text-sm">
                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                    <span className="text-[#23283a]">Jugador:</span>
                                    <span className="text-[#23283a] font-medium text-left sm:text-right">{generatedTicketInfo.jugador}</span>
                                </div>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <div className="flex flex-col sm:flex-row sm:justify-between">
                                    <span className="text-[#23283a]">Teléfono:</span>
                                    <span className="text-[#23283a] text-left sm:text-right">{generatedTicketInfo.telefono || 'N/A'}</span>
                                </div>
                            
                                    <div className="flex flex-col sm:flex-row sm:justify-between">
                                        <span className="text-[#23283a]">Método de Pago:</span>
                                        <span className="text-[#23283a] text-left sm:text-right">{generatedTicketInfo.metodoPago || 'N/A'}</span>
                                    </div>
                                    {generatedTicketInfo.referencia && generatedTicketInfo.referencia !== 'N/A' && (
                                        <div className="flex flex-col sm:flex-row sm:justify-between">
                                            <span className="text-[#23283a]">Referencia:</span>
                                            <span className="text-[#23283a] text-left sm:text-right">{generatedTicketInfo.referencia}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col sm:flex-row sm:justify-between">
                                        <span className="text-[#23283a]">Precio por ticket:</span>
                                        <span className="text-[#23283a]">${rifa?.precio_ticket || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:justify-between">
                                        <span className="text-[#23283a]">Cantidad de tickets:</span>
                                        <span className="text-[#23283a]">{playerGroup?.tickets?.length || 1}</span>
                                    </div>
                            </div>
                                    <div className="flex flex-col items-center justify-center border-t border-gray-700 pt-2 mt-1 w-full">
                                        <div className="w-full">
                                            <div className="flex justify-between w-full mb-1">
                                                <span className="text-[#23283a] font-medium">Total General:</span>
                                                <span className="text-[#23283a] font-bold">${combinedTotal.toFixed(2)}</span>
                                            </div>
                                            {ticketPaymentInfo?.montoTotal !== undefined && (
                                                <>
                                                    <div className="flex justify-between w-full text-sm">
                                                        <span className="text-[#23283a]">Pagado:</span>
                                                        <span className="text-green-600 font-medium">
                                                            ${displayPaid.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between w-full text-sm">
                                                        <span className="text-[#23283a]">Saldo pendiente:</span>
                                                        <span className={`font-medium ${combinedPending > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                                                            ${combinedPending.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col sm:flex-row sm:justify-between">
                                            <span className="text-[#23283a]">Fecha de Sorteo:</span>
                                            <span className="text-[#23283a] text-left sm:text-right">{rifa?.fecha_fin ? new Date(rifa.fecha_fin).toLocaleDateString('es-ES') : 'Por confirmar'}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:justify-between">
                                            <span className="text-[#23283a]">Fecha de Compra:</span>
                                            <span className="text-[#23283a] text-left sm:text-right">{generatedTicketInfo.fecha?.toLocaleDateString('es-ES') || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                        <div className="border-t border-solid border-gray-600 pt-3">
                            <p className="text-[#23283a] text-sm mb-3 font-medium">Números Adquiridos</p>
                            <div className={'grid grid-cols-5 gap-1.5 px-1'}>
                                {playerTickets.map((t, index) => {
                                    const statusEmoji = {
                                        'pagado': '✅',
                                        'abonado': '🔵',
                                        'apartado': '⏳',
                                        'disponible': '❌',
                                        'familiares': '👨‍👩‍👧‍👦'
                                    }[t.estado_ticket] || '❓';
                                    
                                    return (
                                        <div key={index} className="flex flex-col items-center group relative">
                                            <div 
                                                className={`w-9 h-9 rounded-sm flex items-center justify-center text-xs font-bold border border-opacity-30 shadow-sm hover:scale-105 transition-transform
                                                    ${t.estado_ticket === 'pagado' ? 'bg-green-500 text-white' : 
                                                      t.estado_ticket === 'abonado' ? 'bg-blue-500 text-white' :
                                                      t.estado_ticket === 'apartado' ? 'bg-yellow-400 text-yellow-900' :
                                                      'bg-gray-200 text-gray-700'}`}
                                            >
                                                {formatTicketNumber(t.numero_ticket || t.numero_ticket_ticket, rifa?.total_tickets)}
                                            </div>
                                            <span className="text-[9px] text-gray-600 mt-1 text-center leading-none opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-5">
                                                {statusEmoji} {filterOptions.find(f => f.key === t.estado_ticket)?.label || t.estado_ticket || 'N/A'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Footer con branding */}
                        <div className="text-center pt-4 mt-4 border-t border-gray-700">
                            <p className="text-xs text-gray-500 mb-2">¡Mucha suerte! 🍀</p>
                            <div className="flex justify-center items-center space-x-4">
                                <span className="text-xs text-[#23283a]">Organizado por:</span>
                                <img src={LogoUrl} alt="Logo Cliente" className="h-6 w-auto" />
                                <span className="text-xs text-[#23283a]">|</span>
                                <span className="text-xs text-[#23283a]">Sistema:</span>
                                <img src={logoRifasPlus} alt="RifasPlus" className="h-6 w-auto" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-[#23283a] py-8">
                        <p>Cargando información del ticket...</p>
                    </div>
                )}
            </div>
            <div className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-300" onClick={handleClose} />
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'} overflow-hidden`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[#23283a] bg-[#0f131b] flex-shrink-0">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center"><TicketIcon className="w-6 h-6 text-[#7c3bed]" /></div>
                            <h2 className="text-xl font-bold text-white">
                                Detalles del Ticket <span className={`${ticket.estado_ticket === 'apartado' ? 'text-[#ffdf20]' : 'text-[#05df72]'}`}>#{formatTicketNumber(ticket.numero_ticket, rifa?.total_tickets)}</span>
                            </h2>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="space-y-6">
                            {playerGroup && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center"><UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />Información del Jugador</h3>
                                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                                        <div className="flex justify-between items-center"><span className="text-gray-400">Nombre:</span><span className="text-white font-medium">{`${playerGroup.info.nombre_jugador || 'N/A'} ${playerGroup.info.apellido_jugador || ''}`.trim()}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-gray-400">Cédula de Identidad:</span><span className="text-white">{playerGroup.info.cedula_jugador || 'N/A'}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-gray-400">Teléfono:</span><span className="text-white">{formatTelephone(playerGroup.info.telefono_jugador)}</span></div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center"><TicketIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />Información del Ticket</h3>
                                <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Número:</span>
                                        <span className="text-white font-bold text-lg">
                                            #{formatTicketNumber(ticket.numero_ticket, rifa?.total_tickets)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400">Precio:</span><span className="text-white font-bold">${rifa?.precio_ticket}</span></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Estado:</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${filterOptions.find(f => f.key === ticket.estado_ticket)?.color || 'bg-gray-500'} ${filterOptions.find(f => f.key === ticket.estado_ticket)?.textColor || 'text-white'}`}>{ticket.estado_ticket}</span>
                                    </div>
                                    {(ticket.fecha_creacion_ticket || ticket.created_at) && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Fecha de compra:</span>
                                            <span className="text-white text-sm">{new Date(ticket.fecha_creacion_ticket || ticket.created_at).toLocaleString('es-ES')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            

                            {ticketPaymentInfo?.montoTotal !== undefined && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white flex items-center">
                                        <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                                        Información de Pagos
                                    </h3>
                                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total (${totalTickets} tickets):</span>
                                                <span className="text-white font-bold">${combinedTotal.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Pagado:</span>
                                                <span className="text-green-400 font-bold">
                                                    ${combinedPaid.toFixed(2)} {combinedPaid > 0 && `(${((combinedPaid / combinedTotal) * 100).toFixed(0)}%)`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Pendiente:</span>
                                                <span className={`font-bold ${combinedPending > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                                    ${combinedPending.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        {ticketPaymentInfo.payments.length > 0 && (
                                            <div className="mt-4">
                                                <span className="text-gray-400 text-sm block mb-2">Historial de Pagos:</span>
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {ticketPaymentInfo.payments.slice(0, 3).map((pago, index, array) => {
                                                        // Calcular el total acumulado hasta este pago
                                                        const totalHastaAhora = array
                                                            .slice(0, index + 1)
                                                            .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
                                                            
                                                        return (
                                                            <div key={index} className="flex flex-col text-sm bg-[#181c24] p-2 rounded mb-1">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-gray-300 font-medium">
                                                                        ${pago.monto.toFixed(2)}
                                                                    </span>
                                                                    <span className="text-gray-400">
                                                                        {new Date(pago.fecha_pago).toLocaleDateString('es-ES')}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    {pago.metodo_pago} • Total: ${totalHastaAhora.toFixed(2)}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {ticketPaymentInfo.payments.length > 3 && (
                                                        <div className="text-center text-gray-400 text-sm">
                                                            +{ticketPaymentInfo.payments.length - 3} pagos más
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {playerGroup && playerGroup.tickets && playerGroup.tickets.filter(t => t.numero_ticket_ticket !== ticket.numero_ticket_ticket).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Otros números de este jugador</h3>
                                    <div className="bg-[#23283a] rounded-lg p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {playerGroup.tickets.filter(t => t.numero_ticket_ticket !== ticket.numero_ticket_ticket).map(otherTicket => (
                                                <span key={otherTicket.numero_ticket_ticket} className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${filterOptions.find(f => f.key === otherTicket.estado_ticket)?.color || 'bg-gray-600'} ${filterOptions.find(f => f.key === otherTicket.estado_ticket)?.textColor || 'text-white'}`}>{formatTicketNumber(otherTicket.numero_ticket_ticket, rifa?.total_tickets)}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Info */}
                    {ticketPaymentInfo && combinedPending > 0 && (
                        <div className="p-4 border-t border-[#23283a] bg-[#0f131b]">
                            <h3 className="text-base font-semibold text-white mb-3">
                                Estado de Pago
                            </h3>
                            <div className="space-y-2">
                                <div className="bg-[#1a1e2e] p-3 rounded-lg">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400">Saldo pendiente:</span>
                                        <span className="font-medium text-yellow-400">
                                            ${combinedPending.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                                        <div 
                                            className="bg-yellow-500 h-2 rounded-full" 
                                            style={{ 
                                                width: `${Math.min(100, (combinedTotal > 0 ? ((combinedPaid / combinedTotal) * 100) : 0))}%` 
                                            }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>
                                            Pagado: ${combinedPaid.toFixed(2)} {combinedPaid > 0 && `(${((combinedPaid / combinedTotal) * 100).toFixed(0)}%)`}
                                        </span>
                                        <span>
                                            Total: ${combinedTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Share Actions */}
                    <div className="p-4 border-t border-[#23283a] bg-[#0f131b]">
                        <h3 className="text-base font-semibold text-white mb-3">
                            Compartir Ticket
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleSendWhatsApp}
                                className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm"
                                title="Compartir por WhatsApp"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                <ChatBubbleLeftRightIcon className="w-4 h-4 relative z-10 group-hover:animate-pulse" />
                                <span className="relative z-10">WhatsApp</span>
                            </button>
                            <button
                                onClick={handleCopyTicket}
                                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2 px-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-sm"
                                title="Copiar imagen del ticket"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                <DocumentDuplicateIcon className="w-4 h-4 relative z-10 group-hover:animate-pulse" />
                                <span className="relative z-10">Copiar Imagen</span>
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t border-[#23283a] bg-[#0f131b]">
                        <h3 className="text-base font-semibold text-white mb-3">
                            Cambiar Estado
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => handleUpdateSingleTicketStatus("pagado", ticketPaymentInfo?.saldoPendiente || rifa?.precio_ticket || 0)} 
                                disabled={loading || ticket.estado_ticket === 'pagado'} 
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                title={ticket.estado_ticket === 'pagado' ? 'Ya está pagado' : 'Marcar como pagado'}
                            >
                                {ticket.estado_ticket === 'pagado' ? 'Pagado' : 'Marcar como Pagado'}
                            </button>
                            <button onClick={() => handleUpdateSingleTicketStatus("apartado")} disabled={loading || ticket.estado_ticket === 'apartado'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 py-2 px-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">Apartado</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("familiares")} disabled={loading || ticket.estado_ticket === 'familiares'} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">Familiar</button>
                            <button 
                                onClick={handleReleaseClick} 
                                disabled={loading || isReleasing} 
                                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                {isReleasing ? 'Liberando...' : 'Liberar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Form Modal */}
            {showPaymentForm && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-[#181c24] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
                        <button 
                            onClick={() => setShowPaymentForm(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            aria-label="Cerrar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <PaymentForm
                            jugador={ticketPaymentInfo?.jugador}
                            rifa={ticketPaymentInfo?.rifa}
                            tickets={ticketPaymentInfo?.tickets}
                            montoTotal={combinedTotal ?? ticketPaymentInfo?.montoTotal}
                            montoPagado={combinedPaid ?? ticketPaymentInfo?.montoPagado}
                            saldoPendiente={combinedPending ?? ticketPaymentInfo?.saldoPendiente}
                            isPartialPayment={ticketPaymentInfo?.isPartialPayment}
                            onPaymentSuccess={handlePaymentSuccess}
                            empresaId={empresaId}
                        />
                        <div className="p-4 border-t border-[#23283a] bg-[#0f131b]">
                            <button
                                onClick={() => setShowPaymentForm(false)}
                                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Diálogo de confirmación personalizado */}
            {showConfirmDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-[#1e2139] rounded-xl max-w-md w-full p-6 shadow-2xl border border-red-500/30">
                        <div className="flex flex-col items-center text-center">
                            <div className="bg-red-500/20 p-3 rounded-full mb-4">
                                <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">¿Estás seguro?</h3>
                            <p className="text-gray-300 mb-6">
                                El ticket #{ticketToRelease?.numero_ticket} será liberado.
                                <span className="block text-red-400 mt-1">Esta acción no se puede deshacer.</span>
                            </p>
                            
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setShowConfirmDialog(false)}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2.5 px-4 rounded-lg font-medium transition-colors"
                                    disabled={loading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmRelease}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                    disabled={loading}
                                >
                                    {isReleasing ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Liberando...
                                        </>
                                    ) : 'Sí, liberar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}