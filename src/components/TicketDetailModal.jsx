import { useState, useEffect, useRef } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import {
    TicketIcon,
    XMarkIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    DocumentDuplicateIcon,
    ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import { toBlob } from "html-to-image";
import logoRifasPlus from "../assets/RifasPlus.png";
import { useAuth } from "../context/AuthContext";

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
    { key: "familiares", label: "Familiares", color: "bg-purple-500", textColor: "text-white" }
];

export function TicketDetailModal({ isOpen, onClose, ticket, playerGroup, rifa, onStatusUpdate }) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [generatedTicketInfo, setGeneratedTicketInfo] = useState(null);
    const [isReleasing, setIsReleasing] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [ticketToRelease, setTicketToRelease] = useState(null);
    const ticketRef = useRef();
    const { empresaId } = useAuth();
    
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

    const handleClose = () => {
        setIsAnimating(false);
        setTimeout(() => {
            onClose();
        }, 300); // Wait for animation
    };

    const handleUpdateSingleTicketStatus = async (newStatus) => {
        if (!ticket) return;

        setLoading(true);
        const { id, numero_ticket } = ticket;
        let updateData = { estado: newStatus };

        if (newStatus === 'disponible') {
            updateData.jugador_id = null;
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

        console.log('Deleting ticket:', { id, numero_ticket });

        try {
            // Try to delete using id first, if that fails, try ticket_id
            let { error } = await supabase
                .from("t_tickets")
                .delete()
                .eq("empresa_id", empresaId)
                .eq("id", id);

            // If error suggests invalid column, try with ticket_id
            if (error && error.message.includes('column "id" does not exist')) {
                console.log('Trying with ticket_id column instead');
                const result = await supabase
                    .from("t_tickets")
                    .delete()
                    .eq("empresa_id", empresaId)
                    .eq("ticket_id", id);
                error = result.error;
            }

            if (error) {
                console.error('Supabase delete error:', error);
                toast.error(`Error al liberar el ticket: ${error.message}`);
                return;
            }

            console.log('Delete successful');
            toast.success(`Ticket #${numero_ticket} liberado exitosamente`);
            onStatusUpdate();
            handleClose(); // Close modal after successful deletion
        } catch (err) {
            console.error('Unexpected error deleting ticket:', err);
            toast.error('Error inesperado al liberar el ticket');
        } finally {
            setLoading(false);
            setIsReleasing(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!generatedTicketInfo?.telefono) return toast.error("Este jugador no tiene un número de teléfono registrado.");
        const { jugador, rifa: nombreRifa, numeros, total } = generatedTicketInfo;
        const message = `Te escribimos de ${empresa}\nGracias por tu participación ${jugador}! 🎟️\nHas participado en la rifa *${nombreRifa}*.\n\n*Tus números son:* ${numeros.join(', ')}\n*Total Pagado:* $${total}\n\n¡Mucha suerte! 🍀`.trim().replace(/\n/g, '%0A');
        const whatsappUrl = `https://wa.me/${generatedTicketInfo.telefono.replace(/\D/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopyTicket = async () => {
        if (!ticketRef.current) return toast.error("No se encontró la referencia del ticket.");
        try {
            const blob = await toBlob(ticketRef.current, { cacheBust: true, quality: 0.95, pixelRatio: 2, backgroundColor: '#0f131b' });
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

    return (
        <>
            <div ref={ticketRef} className="bg-[#0f131b] border border-[#23283a] rounded-lg p-4 sm:p-6 space-y-4">
                {generatedTicketInfo ? (
                    <>
                        {/* Header con logos */}
                        <div className="flex justify-between items-center border-b border-solid border-gray-600 pb-4">
                            <div className="flex items-center space-x-3">
                                <img src={LogoUrl} alt="Logo Cliente" className="h-8 w-auto" />
                                <div>
                                    <h3 className="text-lg font-bold text-[#7c3bed]">{generatedTicketInfo.rifa}</h3>
                                    <p className="text-xs text-gray-400">Comprobante de Participación</p>
                                </div>
                            </div>
                            <img src={logoRifasPlus} alt="RifasPlus" className="h-10 w-auto" />
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Jugador:</span><span className="text-white font-medium text-left sm:text-right">{generatedTicketInfo.jugador}</span></div>
                            <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Teléfono:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.telefono || 'N/A'}</span></div>
                            <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Método de Pago:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.metodoPago || 'N/A'}</span></div>
                            {generatedTicketInfo.referencia && generatedTicketInfo.referencia !== 'N/A' && (<div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Referencia:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.referencia}</span></div>)}
                            <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Fecha:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.fecha?.toLocaleDateString('es-ES') || 'N/A'}</span></div>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center"><span className="text-gray-400">Total Pagado:</span><span className="text-green-400 font-bold text-lg sm:text-base">${generatedTicketInfo.total}</span></div>
                        </div>
                        <div className="border-t border-solid border-gray-600 pt-4"><p className="text-gray-400 text-sm mb-2">Números Adquiridos:</p><div className="flex flex-wrap gap-2 justify-center">{generatedTicketInfo.numeros.map(num => (<span key={num} className="bg-[#7c3bed] text-white font-mono font-bold px-3 py-1.5 rounded-md text-base">{formatTicketNumber(num, rifa?.total_tickets)}</span>))}</div></div>
                        {/* Footer con branding */}
                        <div className="text-center pt-4 mt-4 border-t border-gray-700">
                            <p className="text-xs text-gray-500 mb-2">¡Mucha suerte! 🍀</p>
                            <div className="flex justify-center items-center space-x-4">
                                <span className="text-xs text-gray-400">Organizado por:</span>
                                <img src={LogoUrl} alt="Logo Cliente" className="h-6 w-auto" />
                                <span className="text-xs text-gray-400">|</span>
                                <span className="text-xs text-gray-400">Sistema:</span>
                                <img src={logoRifasPlus} alt="RifasPlus" className="h-6 w-auto" />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-400 py-8">
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
                                Detalles del Ticket #{formatTicketNumber(ticket.numero_ticket, rifa?.total_tickets)}
                            </h2>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center"><TicketIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />Información del Tickets</h3>
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
                            <button onClick={() => handleUpdateSingleTicketStatus("pagado")} disabled={loading || ticket.estado_ticket === 'pagado'} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">Pagado</button>
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