import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import {
    TicketIcon,
    XMarkIcon,
    UserIcon,
    ChatBubbleLeftRightIcon,
    DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

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

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
        }
    }, [isOpen]);

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

    const handleShareWhatsApp = () => {
        if (!ticket || !rifa) return;
        
        const ticketNumber = formatTicketNumber(ticket.numero_ticket, rifa.total_tickets);
        const ticketPrice = rifa.precio_ticket;
        const raffleName = rifa.nombre;
        
        const message = `🎫 *TICKET DE RIFA* 🎫\n\n` +
                       `📋 *Rifa:* ${raffleName}\n` +
                       `🎯 *Número:* #${ticketNumber}\n` +
                       `💰 *Precio:* $${ticketPrice}\n\n` +
                       `¡Gracias por tu participación! 🎉`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopyTicketImage = async () => {
        if (!ticket || !rifa) return;
        
        try {
            // Create a canvas element to generate the ticket image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = 400;
            canvas.height = 600;
            
            // Background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#7c3bed');
            gradient.addColorStop(1, '#d54ff9');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // White content area with rounded corners
            ctx.fillStyle = '#ffffff';
            const cornerRadius = 15;
            const x = 20;
            const y = 20;
            const width = canvas.width - 40;
            const height = canvas.height - 40;
            
            ctx.beginPath();
            ctx.moveTo(x + cornerRadius, y);
            ctx.lineTo(x + width - cornerRadius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
            ctx.lineTo(x + width, y + height - cornerRadius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
            ctx.lineTo(x + cornerRadius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
            ctx.lineTo(x, y + cornerRadius);
            ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
            ctx.closePath();
            ctx.fill();
            
            // Reset for text
            ctx.fillStyle = '#000000';
            ctx.textAlign = 'center';
            
            // Title
            ctx.font = 'bold 24px Arial';
            ctx.fillText('TICKET DE RIFA', canvas.width / 2, 80);
            
            // Raffle name
            ctx.font = '18px Arial';
            ctx.fillText(rifa.nombre, canvas.width / 2, 120);
            
            // Ticket number (large)
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#7c3bed';
            ctx.fillText(`#${formatTicketNumber(ticket.numero_ticket, rifa.total_tickets)}`, canvas.width / 2, 220);
            
            // Price
            ctx.font = 'bold 20px Arial';
            ctx.fillStyle = '#16a249';
            ctx.fillText(`$${rifa.precio_ticket}`, canvas.width / 2, 280);
            
            // Status
            ctx.font = '16px Arial';
            ctx.fillStyle = '#000000';
            const statusText = ticket.estado_ticket.charAt(0).toUpperCase() + ticket.estado_ticket.slice(1);
            ctx.fillText(`Estado: ${statusText}`, canvas.width / 2, 320);
            
            // Date
            if (ticket.fecha_creacion_ticket || ticket.created_at) {
                const date = new Date(ticket.fecha_creacion_ticket || ticket.created_at);
                ctx.font = '14px Arial';
                ctx.fillText(`Fecha: ${date.toLocaleDateString('es-ES')}`, canvas.width / 2, 350);
            }
            
            // Convert canvas to blob and copy to clipboard
            canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    toast.success('Imagen del ticket copiada al portapapeles');
                } catch (err) {
                    console.error('Error copying image to clipboard:', err);
                    toast.error('No se pudo copiar la imagen del ticket');
                }
            }, 'image/png');
            
        } catch (error) {
            console.error('Error generating ticket image:', error);
            toast.error('Error al generar la imagen del ticket');
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
                    <div className="flex-1 p-6 overflow-y-auto">
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
                                onClick={handleShareWhatsApp}
                                className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                title="Compartir por WhatsApp"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                                <ChatBubbleLeftRightIcon className="w-5 h-5 relative z-10 group-hover:animate-pulse" />
                                <span className="relative z-10 text-sm">WhatsApp</span>
                            </button>
                            <button
                                onClick={handleCopyTicketImage}
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
                        <h3 className="text-base font-semibold text-white mb-4">
                            Cambiar estado_ticket del Ticket #{formatTicketNumber(ticket.numero_ticket, rifa?.total_tickets)}
                        </h3>
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
