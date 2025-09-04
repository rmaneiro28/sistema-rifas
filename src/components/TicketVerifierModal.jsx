import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, CheckCircleIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

const formatTicketNumber = (number, totalTickets) => {
    if (number === null || number === undefined || !totalTickets) return "N/A";
    const maxNumber = totalTickets > 0 ? totalTickets - 1 : 0;
    const numDigits = String(maxNumber).length;
    return String(number).padStart(numDigits, "0");
};

export function TicketVerifierModal({ isOpen, onClose, allTickets }) {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const handleVerify = () => {
        if (!query) {
            setResult({ status: 'info', message: 'Por favor, ingresa un dato para buscar.' });
            return;
        }
        setIsVerifying(true);
        const searchQuery = query.toLowerCase().trim();
        const results = allTickets.filter(ticket => {
            if (ticket.estado === 'disponible') return false;
            const phoneQuery = searchQuery.replace(/\D/g, '');
            const ticketPhone = ticket.telefono_jugador?.replace(/\D/g, '');

            return ticket.numero.toString().includes(searchQuery) ||
                (ticket.nombre_jugador?.toLowerCase().includes(searchQuery)) ||
                (ticket.cedula_jugador?.includes(searchQuery)) ||
                (ticketPhone && phoneQuery && ticketPhone.includes(phoneQuery));
        });

        setTimeout(() => {
            if (results.length > 0) {
                setResult({ status: 'found', tickets: results });
            } else {
                const isNumericQuery = /^\d+$/.test(searchQuery);
                if (isNumericQuery) {
                    const ticket = allTickets.find(t => t.numero.toString() === searchQuery);
                    if (ticket && ticket.estado === 'disponible') {
                        setResult({ status: 'available', message: `El ticket #${searchQuery} está disponible. ¡Anímate a comprarlo!` });
                    } else {
                        setResult({ status: 'not_found', message: 'No se encontraron tickets con ese criterio.' });
                    }
                } else {
                    setResult({ status: 'not_found', message: 'No se encontraron tickets con ese criterio.' });
                }
            }
            setIsVerifying(false);
        }, 500); // Simula un retraso de red para una mejor UX
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setQuery("");
            setResult(null);
        }, 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClose}>
            <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-md p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2d3748]"><XMarkIcon className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-white mb-4 text-center">Verifica tu Ticket</h2>
                <p className="text-gray-400 text-center mb-6 text-sm">Ingresa tu número de ticket, nombre o teléfono.</p>

                <div className="flex gap-2">
                    <input type="text" placeholder="Ej: 123 o Juan Perez" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerify()} className="flex-grow w-full pl-4 pr-4 py-3 rounded-lg bg-[#23283a] border border-[#2d3748] text-white focus:outline-none focus:border-purple-500 transition-colors" />
                    <button onClick={handleVerify} disabled={isVerifying} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-5 rounded-lg transition-colors disabled:opacity-50">{isVerifying ? '...' : 'Buscar'}</button>
                </div>

                <div className="mt-6 min-h-[150px]">
                    {isVerifying && <div className="text-center text-gray-400 pt-10">Buscando...</div>}
                    {result && !isVerifying && (
                        <div className="space-y-4 animate-fade-in">{result.status === 'found' && (<><h3 className="text-lg font-semibold text-green-400">¡Tickets Encontrados!</h3>{result.tickets.map(ticket => (<div key={ticket.numero} className="bg-[#23283a] p-4 rounded-lg border-l-4 border-green-500"><div className="flex justify-between items-center"><span className="text-2xl font-bold text-white">#{formatTicketNumber(ticket.numero, ticket.total_tickets_rifa)}</span><span className="capitalize text-sm font-semibold px-2 py-1 bg-green-500/20 text-green-400 rounded-full">{ticket.estado}</span></div><p className="text-gray-300 mt-2">A nombre de: <span className="font-medium text-white">{ticket.nombre_jugador}</span></p></div>))}</>)}
                            {result.status === 'available' && (<div className="text-center bg-[#23283a] p-6 rounded-lg border border-blue-500/50"><CheckCircleIcon className="w-12 h-12 text-blue-400 mx-auto mb-3" /><p className="text-blue-300">{result.message}</p></div>)}
                            {(result.status === 'not_found' || result.status === 'info') && (<div className="text-center bg-[#23283a] p-6 rounded-lg border border-yellow-500/50"><InformationCircleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-3" /><p className="text-yellow-300">{result.message}</p></div>)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}