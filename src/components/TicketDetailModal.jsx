import { useState, useEffect, useRef } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import {
    TicketIcon,
    XMarkIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { toPng, toBlob } from "html-to-image";

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
    const ticketRef = useRef();

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (ticket && playerGroup) {
            setGeneratedTicketInfo({
                jugador: playerGroup?.info?.nombre_jugador || ticket.jugador || 'Jugador',
                rifa: rifa?.nombre || 'Rifa',
                numeros: [ticket.numero_ticket],
                total: rifa?.precio_ticket || 0,
                telefono: playerGroup?.info?.telefono_jugador || ticket.telefono
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
                .eq("id", id)
                .select();

            // If error suggests invalid column, try with ticket_id
            if (error && error.message.includes('column "id" does not exist')) {
                console.log('Trying with ticket_id column instead');
                const result = await supabase
                    .from("t_tickets")
                    .update(updateData)
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

    const handleSendWhatsApp = () => {
        if (!generatedTicketInfo?.telefono) return toast.error("Este jugador no tiene un número de teléfono registrado.");
        const { jugador, rifa: nombreRifa, numeros, total } = generatedTicketInfo;
        const message = `Gracias por tu participación ${jugador}! 🎟️\nHas participado en la rifa *${nombreRifa}*.\n\n*Tus números son:* ${numeros.join(', ')}\n*Total Pagado:* $${total}\n\n¡Mucha suerte! 🍀`.trim().replace(/\n/g, '%0A');
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
            {/* Hidden ticket element for copying */}
            <div ref={ticketRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {ticket && rifa && (
                    <div style={{ 
                        width: '400px', 
                        height: '700px', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        borderRadius: '20px', 
                        padding: '20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontFamily: 'Arial, sans-serif', 
                        color: 'white', 
                        position: 'relative', 
                        overflow: 'hidden',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
                    }}>
                        {/* Decorative elements */}
                        <div style={{ 
                            position: 'absolute', 
                            top: '-50px', 
                            right: '-50px', 
                            width: '150px', 
                            height: '150px', 
                            background: 'rgba(255,255,255,0.1)', 
                            borderRadius: '50%' 
                        }}></div>
                        <div style={{ 
                            position: 'absolute', 
                            bottom: '-30px', 
                            left: '-30px', 
                            width: '100px', 
                            height: '100px', 
                            background: 'rgba(255,255,255,0.05)', 
                            borderRadius: '50%' 
                        }}></div>
                        
                        {/* Main ticket content */}
                        <div style={{ 
                            background: 'white', 
                            borderRadius: '15px', 
                            padding: '40px 30px', 
                            width: '100%', 
                            height: '100%', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            position: 'relative',
                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)'
                        }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <div style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 'bold', 
                                    color: '#666', 
                                    marginBottom: '8px', 
                                    textTransform: 'uppercase',
                                    letterSpacing: '2px'
                                }}>RifasPlus</div>
                                <h2 style={{ 
                                    fontSize: '28px', 
                                    fontWeight: 'bold', 
                                    marginBottom: '15px', 
                                    color: '#667eea',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
                                }}>TICKET DE RIFA</h2>
                                <div style={{ 
                                    width: '60px', 
                                    height: '3px', 
                                    background: 'linear-gradient(90deg, #667eea, #764ba2)', 
                                    margin: '0 auto 20px',
                                    borderRadius: '2px'
                                }}></div>
                            </div>
                            
                            {/* Raffle Info */}
                            <div style={{ textAlign: 'center', width: '100%' }}>
                                <h3 style={{ 
                                    fontSize: '20px', 
                                    marginBottom: '25px', 
                                    textAlign: 'center', 
                                    color: '#333',
                                    fontWeight: '600',
                                    lineHeight: '1.4'
                                }}>{rifa.nombre}</h3>
                                
                                {/* Ticket Number */}
                                <div style={{ 
                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white',
                                    fontSize: '56px', 
                                    fontWeight: 'bold', 
                                    marginBottom: '15px',
                                    padding: '20px',
                                    borderRadius: '15px',
                                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                                    fontFamily: 'Courier New, monospace'
                                }}>
                                    #{formatTicketNumber(ticket.numero_ticket, rifa.total_tickets)}
                                </div>
                                
                                {/* Price */}
                                <div style={{ 
                                    fontSize: '32px', 
                                    fontWeight: 'bold', 
                                    color: '#16a34a', 
                                    marginBottom: '20px',
                                    fontFamily: 'Arial, sans-serif'
                                }}>
                                    ${rifa.precio_ticket}
                                </div>
                            </div>
                            
                            {/* Footer Info */}
                            <div style={{ width: '100%', textAlign: 'center' }}>
                                <div style={{ 
                                    fontSize: '16px', 
                                    color: '#666', 
                                    marginBottom: '12px',
                                    fontWeight: '600'
                                }}>
                                    Estado: <span style={{ 
                                        color: ticket.estado_ticket === 'pagado' ? '#16a34a' : 
                                               ticket.estado_ticket === 'apartado' ? '#f59e0b' : 
                                               ticket.estado_ticket === 'disponible' ? '#6b7280' : '#8b5cf6',
                                        fontWeight: 'bold'
                                    }}>{ticket.estado_ticket.toUpperCase()}</span>
                                </div>
                                
                                {playerGroup?.info?.nombre_jugador && (
                                    <div style={{ 
                                        fontSize: '14px', 
                                        color: '#666', 
                                        marginBottom: '8px',
                                        fontWeight: '500'
                                    }}>
                                        Jugador: {playerGroup.info.nombre_jugador}
                                    </div>
                                )}
                                
                                {(ticket.fecha_creacion_ticket || ticket.created_at) && (
                                    <div style={{ 
                                        fontSize: '12px', 
                                        color: '#999',
                                        marginTop: '8px'
                                    }}>
                                        Fecha: {new Date(ticket.fecha_creacion_ticket || ticket.created_at).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                )}
                                
                                <div style={{ 
                                    fontSize: '10px', 
                                    color: '#bbb',
                                    marginTop: '15px',
                                    fontStyle: 'italic'
                                }}>
                                    ¡Mucha suerte! 🍀
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-300" onClick={handleClose} />
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#0f131b]">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center"><TicketIcon className="w-6 h-6 text-[#7c3bed]" /></div>
                            <h2 className="text-xl font-bold text-white">
                                Detalles del Ticket #{formatTicketNumber(ticket.numero_ticket, rifa?.total_tickets)}
                            </h2>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
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
                                        <span className="text-gray-400">estado_ticket:</span>
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
                                        <div className="flex justify-between items-center"><span className="text-gray-400">Nombre:</span><span className="text-white font-medium">{playerGroup.info.nombre_jugador || 'N/A'}</span></div>
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
                    <div className="p-6 border-t border-[#23283a] bg-[#0f131b]">
                        <h3 className="text-base font-semibold text-white mb-4">
                            Compartir Ticket
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleSendWhatsApp}
                                className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                title="Compartir por WhatsApp"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                <ChatBubbleLeftRightIcon className="w-5 h-5 relative z-10 group-hover:animate-pulse" />
                                <span className="relative z-10 text-sm">WhatsApp</span>
                            </button>
                            <button
                                onClick={handleCopyTicket}
                                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                title="Copiar imagen del ticket"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                <DocumentDuplicateIcon className="w-5 h-5 relative z-10 group-hover:animate-pulse" />
                                <span className="relative z-10 text-sm">Copiar Imagen</span>
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-[#23283a]">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleUpdateSingleTicketStatus("pagado")} disabled={loading || ticket.estado_ticket === 'pagado'} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Pagado</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("apartado")} disabled={loading || ticket.estado_ticket === 'apartado'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Apartado</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("familiares")} disabled={loading || ticket.estado_ticket === 'familiares'} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Familiar</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("disponible")} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Liberar</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
