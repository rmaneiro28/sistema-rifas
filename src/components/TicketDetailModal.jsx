import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import {
    TicketIcon,
    XMarkIcon,
    UserIcon,
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
        const { ticket_id, numero } = ticket;
        let updateData = { estado: newStatus };

        if (newStatus === 'disponible') {
            updateData.jugador_id = null;
        }

        const { error } = await supabase
            .from("t_tickets")
            .update(updateData)
            .eq("id", ticket_id);

        if (!error) {
            toast.success(`Ticket #${numero} actualizado a ${newStatus}`);
            onStatusUpdate();
        } else {
            toast.error("Error al actualizar el ticket");
        }
        setLoading(false);
    };

    if (!isOpen || !ticket || !playerGroup) {
        return null;
    }

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
                                Detalles del Ticket #{formatTicketNumber(ticket.numero, rifa?.total_tickets)}
                            </h2>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"><XMarkIcon className="w-6 h-6" /></button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center"><TicketIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />Información del Ticket</h3>
                                <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Número:</span>
                                        <span className="text-white font-bold text-lg">
                                            #{formatTicketNumber(ticket.numero, rifa?.total_tickets)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400">Precio:</span><span className="text-white font-bold">${rifa?.precio_ticket}</span></div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-400">Estado:</span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${filterOptions.find(f => f.key === ticket.estado)?.color || 'bg-gray-500'} ${filterOptions.find(f => f.key === ticket.estado)?.textColor || 'text-white'}`}>{ticket.estado}</span>
                                    </div>
                                    {(ticket.fecha_creacion_ticket || ticket.created_at) && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-400">Fecha de compra:</span>
                                            <span className="text-white text-sm">{new Date(ticket.fecha_creacion_ticket || ticket.created_at).toLocaleString('es-ES')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-white flex items-center"><UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />Información del Jugador</h3>
                                <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-center"><span className="text-gray-400">Nombre:</span><span className="text-white font-medium">{playerGroup.info.nombre_jugador || 'No asignado'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400">Email:</span><span className="text-white">{playerGroup.info.email_jugador || 'N/A'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-gray-400">Teléfono:</span><span className="text-white">{formatTelephone(playerGroup.info.telefono_jugador)}</span></div>
                                </div>
                            </div>

                            {playerGroup.tickets.filter(t => t.numero !== ticket.numero).length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-white">Otros números de este jugador</h3>
                                    <div className="bg-[#23283a] rounded-lg p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {playerGroup.tickets.filter(t => t.numero !== ticket.numero).map(otherTicket => (
                                                <span key={otherTicket.numero} className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${filterOptions.find(f => f.key === otherTicket.estado)?.color || 'bg-gray-600'} ${filterOptions.find(f => f.key === otherTicket.estado)?.textColor || 'text-white'}`}>{formatTicketNumber(otherTicket.numero, rifa?.total_tickets)}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 border-t border-[#23283a]">
                        <h3 className="text-base font-semibold text-white mb-4">
                            Cambiar estado del Ticket #{formatTicketNumber(ticket.numero, rifa?.total_tickets)}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleUpdateSingleTicketStatus("pagado")} disabled={loading || ticket.estado === 'pagado'} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Pagado</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("apartado")} disabled={loading || ticket.estado === 'apartado'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Apartado</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("familiares")} disabled={loading || ticket.estado === 'familiares'} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Familiar</button>
                            <button onClick={() => handleUpdateSingleTicketStatus("disponible")} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Liberar</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
