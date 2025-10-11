import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, CheckCircleIcon, InformationCircleIcon, TicketIcon, UserIcon, PhoneIcon, CreditCardIcon, CalendarIcon } from "@heroicons/react/24/outline";

const formatTicketNumber = (number, totalTickets) => {
    if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
        return String(number);
    }
    const numDigits = String(totalTickets - 1).length;
    return String(number).padStart(Math.max(3, numDigits), "0");
};

const formatPartialPhone = (phone) => {
    if (!phone) return 'No especificado';
    // Eliminar todos los caracteres no numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    // Si tiene al menos 4 dígitos, mostrar solo los últimos 4
    if (cleanPhone.length >= 4) {
        const lastFour = cleanPhone.slice(-4);
        return `***-***-${lastFour}`;
    }
    // Si tiene menos de 4 dígitos, mostrar asteriscos para todos excepto el último
    return cleanPhone.length > 0 ? `${'*'.repeat(cleanPhone.length - 1)}${cleanPhone.slice(-1)}` : 'No especificado';
};

export function TicketVerifierModal({ isOpen, onClose, allTickets, rifa }) {
    const [query, setQuery] = useState("");
    const [result, setResult] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);

    const handleVerify = () => {
        if (!query) {
            setResult({ status: 'info', message: 'Por favor, ingresa un dato para buscar.' });
            return;
        }
        setIsVerifying(true);
        const searchQuery = query.toLowerCase().trim();
        
        // Convertir búsqueda numérica a formato padded
        let paddedSearchQuery = searchQuery;
        const searchNumber = parseInt(searchQuery, 10);
        if (!isNaN(searchNumber)) {
            paddedSearchQuery = formatTicketNumber(searchNumber, rifa?.total_tickets);
        }
        
        const results = allTickets.filter(ticket => {
            if (ticket.estado === 'disponible') return false;

            const normalizeText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const searchTerms = normalizeText(searchQuery).split(' ').filter(term => term);

            // Si la búsqueda es un solo término numérico, hacer coincidencia exacta con el ticket
            if (searchTerms.length === 1 && !isNaN(searchTerms[0])) {
                return ticket.numero_ticket === paddedSearchQuery;
            }

            const searchableString = normalizeText(
                `${ticket.nombre_jugador || ''} ${ticket.apellido_jugador || ''} ${ticket.telefono_jugador || ''} ${ticket.cedula_jugador || ''}`
            );
            return searchTerms.every(term => searchableString.includes(term));
        });

        setTimeout(() => {
            if (results.length > 0) {
                setResult({ status: 'found', tickets: results });
            } else {
                const isNumericQuery = /^\d+$/.test(searchQuery);
                if (isNumericQuery) {
                    const ticket = allTickets.find(t => {
                        const ticketNumber = (t.numero_ticket || t.numero || '').toString();
                        return ticketNumber === paddedSearchQuery;
                    });
                    if (ticket && ticket.estado === 'disponible') {
                        setResult({ status: 'available', message: `El ticket #${formatTicketNumber(searchNumber, rifa?.total_tickets)} está disponible. ¡Anímate a comprarlo!` });
                    } else {
                        setResult({ status: 'not_found', message: 'No se encontraron tickets con ese criterio.' });
                    }
                } else {
                    setResult({ status: 'not_found', message: 'No se encontraron tickets con ese criterio.' });
                }
            }
            setIsVerifying(false);
        }, 800); // Simula un retraso de red para una mejor UX
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setQuery("");
            setResult(null);
            setSelectedTicket(null);
        }, 300);
    };

    const handleViewTicket = (ticket) => {
        setSelectedTicket(ticket);
    };

    const handleBackToResults = () => {
        setSelectedTicket(null);
    };

    if (!isOpen) return null;

    // Vista detallada del ticket
    if (selectedTicket) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClose}>
                <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-lg shadow-2xl relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {/* Imagen de fondo del premio */}
                    <div className="absolute inset-0 opacity-10">
                        <img 
                            src={rifa?.imagen_url || '/default-prize.jpg'} 
                            alt="Premio" 
                            className="w-full h-full object-cover"
                        />
                    </div>
                    
                    <div className="relative z-10 p-6">
                        <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2d3748]"><XMarkIcon className="w-6 h-6" /></button>
                        <button onClick={handleBackToResults} className="absolute top-3 left-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2d3748]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </button>
                        
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                                <TicketIcon className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">Ticket #{formatTicketNumber(selectedTicket.numero_ticket || selectedTicket.numero, rifa?.total_tickets)}</h2>
                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                                <span className="text-white font-semibold capitalize">{selectedTicket.estado}</span>
                            </div>
                        </div>
                        
                        <div className="bg-[#23283a]/80 backdrop-blur-sm rounded-xl p-6 border border-[#353a4d]">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <UserIcon className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Nombre del Jugador</p>
                                        <p className="text-white font-semibold">{`${selectedTicket.nombre_jugador || ''} ${selectedTicket.apellido_jugador || ''}`.trim() || 'No especificado'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                        <PhoneIcon className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Teléfono</p>
                                        <p className="text-white font-semibold">
                                            {formatPartialPhone(selectedTicket.telefono_jugador)}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Status</p>
                                        <p className="text-white font-semibold capitalize">{selectedTicket.estado || 'disponible'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0 w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                                        <CalendarIcon className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400">Fecha de Pago</p>
                                        <p className="text-white font-semibold">
                                            {selectedTicket.fecha_pago ? new Date(selectedTicket.fecha_pago).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : selectedTicket.fecha_compra ? new Date(selectedTicket.fecha_compra).toLocaleDateString('es-ES', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : 'No especificada'}
                                        </p>
                                    </div>
                                </div>
                                
                                {rifa?.fecha_fin && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                            <CalendarIcon className="w-5 h-5 text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Fecha del Sorteo</p>
                                            <p className="text-white font-semibold">
                                                {new Date(rifa.fecha_fin).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-400 mb-2">Participando en:</p>
                            <p className="text-lg font-bold text-white">{rifa?.nombre || 'Rifa'}</p>
                            <p className="text-sm text-gray-300 mt-1">{rifa?.premio || 'Premio'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Vista de búsqueda
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={handleClose}>
            <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-md p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#2d3748]"><XMarkIcon className="w-6 h-6" /></button>
                <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                        <MagnifyingGlassIcon className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Verifica tu Ticket</h2>
                    <p className="text-gray-400 text-sm">Ingresa tu número de ticket, nombre o teléfono.</p>
                </div>

                <div className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        placeholder="Ej: 0001 o Juan Pérez" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()} 
                        className="flex-grow w-full pl-4 pr-4 py-3 rounded-lg bg-[#23283a] border border-[#2d3748] text-white focus:outline-none focus:border-purple-500 transition-colors" 
                    />
                    <button 
                        onClick={handleVerify} 
                        disabled={isVerifying} 
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-50 shadow-lg"
                    >
                        {isVerifying ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Buscando
                            </div>
                        ) : 'Buscar'}
                    </button>
                </div>

                <div className="min-h-[200px]">
                    {isVerifying && (
                        <div className="text-center text-gray-400 pt-8">
                            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                            <p>Buscando tu ticket...</p>
                        </div>
                    )}
                    
                    {result && !isVerifying && (
                        <div className="space-y-4 animate-fade-in">
                            {result.status === 'found' && (
                                <>
                                    <div className="text-center">
                                        <h3 className="text-lg font-semibold text-green-400">¡Tickets Encontrados!</h3>
                                        <p className="text-sm text-gray-400">{result.tickets.length} tickets asociados a tu búsqueda.</p>
                                    </div>
                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                        {result.tickets.map(ticket => (
                                            <div 
                                                key={ticket.numero_ticket || ticket.numero} 
                                                className="bg-[#23283a] p-4 rounded-lg border-l-4 border-green-500 hover:bg-[#2a2f3a] transition-colors cursor-pointer group"
                                                onClick={() => handleViewTicket(ticket)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <span className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                                                            #{formatTicketNumber(ticket.numero_ticket || ticket.numero, rifa?.total_tickets)}
                                                        </span>
                                                        <p className="text-gray-300 text-sm mt-1">
                                                            <span className="font-medium text-white">{ticket.nombre_jugador} {ticket.apellido_jugador}</span>
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="capitalize text-sm font-semibold px-3 py-1 bg-green-500/20 text-green-400 rounded-full">
                                                            {ticket.estado}
                                                        </span>
                                                        <p className="text-xs text-gray-400 mt-1">Ver detalles →</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                            
                            {result.status === 'available' && (
                                <div className="text-center bg-[#23283a] p-6 rounded-lg border border-blue-500/50">
                                    <CheckCircleIcon className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                                    <p className="text-blue-300 font-medium">{result.message}</p>
                                </div>
                            )}
                            
                            {(result.status === 'not_found' || result.status === 'info') && (
                                <div className="text-center bg-[#23283a] p-6 rounded-lg border border-yellow-500/50">
                                    <InformationCircleIcon className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                                    <p className="text-yellow-300 font-medium">{result.message}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}