import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from "react-router-dom";
import Confetti from "react-confetti";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { MagnifyingGlassIcon, GiftIcon, CalendarDaysIcon, CurrencyDollarIcon, TrophyIcon, TicketIcon, ClipboardIcon, BanknotesIcon, PhoneIcon, XMarkIcon } from "@heroicons/react/24/outline";
import bancolombiaLogo from '../assets/Bancolombia.png';
import zelleLogo from '../assets/Zelle.png';
import venezuelaLogo from "../assets/Bdv.jpg";
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { useWindowSize } from '../hooks/useWindowSize.js';
import { TicketVerifierModal } from '../components/TicketVerifierModal.jsx';
import { Footer } from '../App.jsx';

// Función para formatear números de tickets con ceros a la izquierda
const formatTicketNumber = (number, totalTickets) => {
    if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
        return String(number);
    }
    const numDigits = String(totalTickets - 1).length;
    return String(number).padStart(Math.max(3, numDigits), "0");
};

// Componente para mostrar y copiar datos bancarios con íconos/logos y notificación
const BankDataCard = ({ logo, icon: Icon, label, value }) => {
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        toast.success(`¡${label} copiado al portapapeles!`);
    };
    return (
        <div className="flex items-center justify-between bg-[#23283a] rounded-xl p-4 mb-3 shadow-md border border-[#353a4d]">
            <div className="flex items-center gap-3">
                {logo ? (
                    <img src={logo} alt={label} className="w-8 h-8 rounded-full bg-white p-1 border border-gray-300" />
                ) : (
                    <Icon className="w-7 h-7 text-white" />
                )}
                <div>
                    <div className="font-bold text-white text-base flex items-center gap-1">{label}</div>
                    <div className="text-sm text-gray-300 break-all">{value}</div>
                </div>
            </div>
            <button
                onClick={handleCopy}
                className="ml-4 bg-white hover:bg-gray-300 text-black px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
                title="Copiar"
            >
                <ClipboardIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const PAYMENT_METHODS = [
    {
        id: 'bdv',
        logo: venezuelaLogo,
        label: 'Banco de Venezuela',
        details: [
            { id: 'bdv_titular', label: 'Titular', value: 'Johana Márquez', icon: ClipboardIcon },
            { id: 'bdv_ci', label: 'C.I.', value: 'V-21.551.764', icon: ClipboardIcon },
            { id: 'bdv_telefono', label: 'Teléfono', value: '0416-475-1243', icon: PhoneIcon },
            { id: 'bdv_nro_cuenta', label: 'Número de Cuenta', value: '0102-0156-0201-0981-3662', icon: BanknotesIcon },
        ]
    },
    {
        id: 'bancolombia',
        logo: bancolombiaLogo,
        label: 'Bancolombia',
        details: [
            { id: 'bancolombia_titular', label: 'Titular', value: 'Yerson Arismendy', icon: ClipboardIcon },
            { id: 'bancolombia_ci', label: 'C.I.', value: '1049661169', icon: ClipboardIcon },
            { id: 'bancolombia_nro_cuenta', label: 'Número de Cuenta', value: '91228187653', icon: BanknotesIcon },
        ]
    },
    {
        id: 'zelle',
        logo: zelleLogo,
        label: 'Zelle',
        details: [
            { id: 'zelle_titular', label: 'Titular', value: 'Theo Araque', icon: ClipboardIcon },
            { id: 'zelle_ci', label: 'Teléfono', value: '+1 (631) 624-6073', icon: ClipboardIcon }
        ]
    }
];


const RaffleWinnerBanner = ({ ganador, premio }) => (
    <div className="relative bg-gradient-to-br from-yellow-400 to-orange-500 text-black p-8 rounded-2xl mb-10 text-center shadow-2xl animate-fade-in overflow-hidden">
        <TrophyIcon className="absolute -left-4 -top-4 w-24 h-24 text-white/20 transform rotate-[-20deg]" />
        <TrophyIcon className="absolute -right-6 bottom-0 w-32 h-32 text-white/20 transform rotate-[15deg]" />
        <h2 className="text-3xl font-bold">¡Felicidades al Ganador de la Rifa "{premio}"!</h2>
        <p className="text-7xl font-black my-4 tracking-tighter">#{ganador.numero_ganador}</p>
        <p className="text-2xl">El afortunado es <span className="font-bold">{ganador.t_jugadores.nombre} {ganador.t_jugadores.apellido}</span></p>
    </div>
);

const InfoItem = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-4">
        <Icon className={`w-6 h-6 text-${color}-400 flex-shrink-0`} />
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-lg font-semibold text-white">{value}</p>
        </div>
    </div>
);

const RaffleHeader = ({ rifa, vendidos, total, progreso, setIsVerifierOpen }) => (
    <div className="grid max-md:grid-cols-1 md:grid-cols-5 gap-0 items-center bg-[#181c24] border border-[#23283a] rounded-2xl overflow-hidden mb-10">
        {/* Columna de la Imagen */}
        <div className="md:col-span-3 w-full h-full">
            <img src={rifa.imagen_url} alt={rifa.nombre} className="w-full min-md:h-[90vh] object-cover" />
        </div>

        {/* Columna del Texto */}
        <div className="md:col-span-2 p-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white">{rifa.nombre}</h1>
            <p className="text-gray-300 mt-2 max-w-3xl text-sm">{rifa.descripcion}</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-white">
                <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-300 flex items-center gap-2"><GiftIcon className="w-4 h-4 text-purple-400" /> Premio</p>
                    <p className="text-xl font-bold">{rifa.premio || rifa.nombre}</p>
                </div>
                <div className='grid gap-2 md:grid-cols-2 '>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                        <p className="text-sm text-gray-300 flex items-center gap-2"><CurrencyDollarIcon className="w-4 h-4 text-green-400" /> Precio</p>
                        <p className="text-xl font-bold">${rifa.precio_ticket}</p>
                    </div>
                    <div className="bg-black/20 p-4 rounded-xl col-span-1 sm:col-span-2 border border-white/10">
                        <p className="text-sm text-gray-300 flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4 text-blue-400" /> Fecha del Sorteo</p>
                        <p className="text-xl font-bold">{rifa.fecha_fin && !isNaN(new Date(rifa.fecha_fin)) ? new Date(rifa.fecha_fin).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No definida'}</p>
                    </div>
                </div>
               
                <RaffleProgressBar
                    vendidos={vendidos}
                    total={total}
                    progreso={progreso}
                />
                <button onClick={() => setIsVerifierOpen(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2">
                    <MagnifyingGlassIcon className="w-5 h-5" />
                        Verificar mi Ticket
                </button>
            </div>
        </div>
    </div>
);


const RaffleProgressBar = ({ vendidos, total, progreso }) => (
    <div className="bg-[#181c24] border border-[#23283a] p-6 rounded-xl">
        <div className="flex justify-between items-center text-sm text-gray-300 mb-2">
            <span>Progreso</span>
            <span className="font-semibold">{vendidos} / {total}</span>
        </div>
        <div className="w-full bg-[#2d3748] rounded-full h-4">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500" style={{ width: `${progreso}%` }} />
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">{progreso.toFixed(1)}% completado</p>
    </div>
);




export function PublicRifa() {
    const { id } = useParams();
    const [rifa, setRifa] = useState(null);
    const [allTickets, setAllTickets] = useState([]);
    const [ganador, setGanador] = useState(null);
    const [loading, setLoading] = useState(true);
    const { width, height } = useWindowSize();
    const [isVerifierOpen, setIsVerifierOpen] = useState(false);
    const [ticketFilter, setTicketFilter] = useState('all');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHODS[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTicketsFromMap, setSelectedTicketsFromMap] = useState([]);
    const pdfRef = useRef();

    const fetchRaffleAndTickets = useCallback(async () => {
        setLoading(true);
        try {
            // Carga de datos en paralelo para mayor eficiencia
            const rafflePromise = supabase.from("t_rifas").select("*").eq("id_rifa", id).single();
            const ticketsPromise = supabase.from("vw_tickets").select("*").eq("rifa_id", id);

            const [raffleResult, ticketsResult] = await Promise.all([rafflePromise, ticketsPromise]);

            const { data: rifaData, error: rifaError } = raffleResult;
            if (rifaError) throw rifaError;
            setRifa(rifaData);

            if (rifaData.estado === 'finalizada') {
                const { data: winnerData, error: winnerError } = await supabase
                    .from('t_ganadores')
                    .select('numero_ganador, t_jugadores(nombre, apellido)')
                    .eq('rifa_id', rifaData.id_rifa)
                    .single();
                if (winnerError) console.error("Error fetching winner:", winnerError);
                else setGanador(winnerData);
            }

            const { data: ticketsData, error: ticketsError } = ticketsResult;
            if (ticketsError) throw ticketsError;


            // Crear Map con los tickets existentes usando el numero_ticket formateado como clave
            const ticketsMap = new Map();
            ticketsData.forEach(ticket => {
                const formattedTicketNumber = formatTicketNumber(ticket.numero_ticket, rifaData.total_tickets);
                ticketsMap.set(formattedTicketNumber, ticket);
            });
            
            const generatedTickets = Array.from({ length: rifaData.total_tickets }, (_, i) => {
                const ticketNumberFormatted = formatTicketNumber(i, rifaData.total_tickets);
                const existingTicket = ticketsMap.get(ticketNumberFormatted);
                
                const ticket = existingTicket ?
                    { 
                        ...existingTicket, 
                        estado: existingTicket.estado_ticket, 
                        numero_ticket: ticketNumberFormatted, 
                        estado_ticket: existingTicket.estado_ticket, 
                        nombre_jugador: existingTicket.nombre_jugador,
                        telefono_jugador: existingTicket.telefono,
                        cedula_jugador: existingTicket.cedula,
                        monto_pagado: existingTicket.monto_pagado,
                        fecha_compra: existingTicket.fecha_compra || existingTicket.fecha_pago,
                        fecha_pago: existingTicket.fecha_pago || existingTicket.fecha_compra
                    } :
                    { 
                        estado: "disponible", 
                        numero_ticket: ticketNumberFormatted, 
                        estado_ticket: "disponible",
                        nombre_jugador: null,
                        telefono_jugador: null,
                        cedula_jugador: null,
                        monto_pagado: null,
                        fecha_compra: null,
                        fecha_pago: null
                    };
                
                
                
                return ticket;
            });
            setAllTickets(generatedTickets);

        } catch (error) {
            toast.error("Error al cargar los datos de la rifa.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id]);


    useEffect(() => { fetchRaffleAndTickets(); }, [fetchRaffleAndTickets]);

    const { vendidos, disponibles, progreso, total } = useMemo(() => {
        const vendidosCount = allTickets.filter(t => t.estado !== 'disponible').length;
        const totalTickets = rifa?.total_tickets || 0;
        return {
            vendidos: vendidosCount,
            disponibles: totalTickets - vendidosCount,
            progreso: totalTickets > 0 ? (vendidosCount / totalTickets) * 100 : 0,
            total: totalTickets,
        };
    }, [allTickets, rifa]);

    // Handle keyboard shortcuts for search
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && searchQuery) {
                setSearchQuery("");
            }
            if (event.ctrlKey && event.key === 'f') {
                event.preventDefault();
                document.querySelector('input[placeholder*="Buscar"]')?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    const handleTicketClick = (ticket) => {
        // En la vista pública, los tickets no son seleccionables, solo informativos
        const ticketNumber = ticket.numero_ticket || ticket.numero;
        const ticketStatus = ticket.estado_ticket || ticket.estado;
        const statusText = ticketStatus === "disponible" ? "Disponible" : 
                          (ticketStatus === "apartado" || ticketStatus === "pagado") ? "Ocupado" : 
                          ticketStatus === "familiares" ? "Familiares" : "";
        toast.info(`Ticket #${formatTicketNumber(ticketNumber, rifa?.total_tickets)} - ${statusText}`);
    };

    // Filtrar tickets según el estado seleccionado y búsqueda
    const filteredTickets = useMemo(() => {
        // Verificar si hay datos para filtrar
        if (!allTickets || allTickets.length === 0) {
            return [];
        }
        
        let filtered = [...allTickets];
        
        // Aplicar filtro por estado
        if (ticketFilter === 'disponible') {
            filtered = filtered.filter(t => t.estado === 'disponible');
        } else if (ticketFilter === 'ocupados') {
            filtered = filtered.filter(t => t.estado === 'apartado' || t.estado === 'pagado');
        } else if (ticketFilter === 'familiares') {
            filtered = filtered.filter(t => t.estado === 'familiares');
        }
        
        // Aplicar búsqueda
        if (searchQuery && searchQuery.trim() !== '') {
            filtered = filtered.filter(ticket => {
                const ticketNumber = ticket.numero_ticket || '';
                
                // Convertir el searchQuery a número y formatearlo a 4 dígitos
                const searchNumber = parseInt(searchQuery.trim(), 10);
                
                if (!isNaN(searchNumber)) {
                    // Si es un número válido, formatearlo según la rifa
                    const paddedSearch = formatTicketNumber(searchNumber, rifa?.total_tickets);
                    
                    // Comparar directamente con el numero_ticket que está en formato padded
                    return ticketNumber === paddedSearch;
                }
                
                // Si no es un número, buscar coincidencia parcial
                return ticketNumber.includes(searchQuery.trim());
            });
        }

        return filtered;
    }, [allTickets, ticketFilter, searchQuery, rifa]);

    if (loading) return <LoadingScreen message="Cargando rifa..." />;
    if (!rifa) return <div className="flex items-center justify-center min-h-screen bg-[#0f131b] text-red-500">No se pudo encontrar la rifa.</div>;
    return (
        <div className="min-h-screen bg-[#0f131b] text-white font-sans bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] overflow-x-hidden">
            {ganador && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}
            <div className="container mx-auto p-4 sm:p-8 max-w-full overflow-x-hidden">
                <RaffleHeader rifa={rifa} vendidos={vendidos} total={total} progreso={progreso} setIsVerifierOpen={setIsVerifierOpen} />

                {/* Anuncio del Ganador */}
                {ganador && <RaffleWinnerBanner ganador={ganador} premio={rifa.premio || rifa.nombre} />}

                {/* Grid Principal */}
                <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

                    {/* Columna Izquierda: Información */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Datos Bancarios llamativos */}
                        <div className="bg-[#181c24] border border-[#23283a] p-4 rounded-xl mt-4">
                            <h3 className="font-bold text-white mb-5 text-center text-lg">Datos Bancarios</h3>
                            <div className="flex flex-wrap justify-center gap-4 mb-6">
                                {PAYMENT_METHODS.map((method) => (
                                    <button
                                        key={method.id}
                                        onClick={() => setSelectedPaymentMethod(method)}
                                        className={`p-3 rounded-lg flex flex-col items-center gap-2 transition-all duration-200
                                                    ${selectedPaymentMethod.id === method.id ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-[#2d3748] hover:bg-[#353a4d]'}`}
                                        title={method.label}
                                    >
                                        {method.logo ? (
                                            <img src={method.logo} alt={method.label} className="w-10 h-10 rounded-full bg-white p-1" />
                                        ) : (
                                            <method.icon className="w-10 h-10 text-white" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {selectedPaymentMethod && (
                                <div className="mt-4 space-y-3">
                                    {selectedPaymentMethod.details.map(detail => (
                                        <BankDataCard
                                            key={detail.id}
                                            icon={detail.icon}
                                            label={detail.label}
                                            value={detail.value}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                        
                        <div className='bg-[#181c24]  p-4 rounded-xl mt-4'>
                            <h3 className="font-bold text-white mb-5 text-center text-lg">Números de Contacto</h3>
                            <BankDataCard
                                icon={PhoneIcon}
                                label="Johana Márquez"
                                value="0412-5044272"
                            />
                            <BankDataCard
                                icon={PhoneIcon}
                                label="Carlos Perez"
                                value="0412-4362660"
                            />
                        </div>
                    </div>

                    {/* Columna Derecha: Mapa de Tickets */}
                    {/* Mapa de tickets */}
                    <div ref={pdfRef} className="lg:col-span-2 bg-[#181c24]/50 backdrop-blur-sm border  flex flex-col border-[#23283a] p-4 rounded-lg overflow-auto">
                        <div className="flex sm:items-center max-md:items-start max-md:justify-start sm:justify-between justify-between mb-4">
                            <div>
                                <h2 className="text-white text-lg font-bold mb-1 sm:mb-0">
                                    Mapa de Tickets
                                </h2>
                                {(searchQuery || ticketFilter !== "todos") && (
                                    <p className="text-gray-400 text-sm">
                                        {searchQuery && `Buscando: "${searchQuery}" • `}
                                        Mostrando {filteredTickets.length} de {allTickets.length} tickets
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Barra de búsqueda y filtros */}
                        <div className="space-y-4 mb-6">
                            {/* Barra de búsqueda */}
                            <div className="relative flex-1 max-w-dvw">
                                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar tickets..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                    }}
                                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
                                />
                            </div>
                            
                            
                            <div className="pb-2 -mx-4 px-4">
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setTicketFilter("all")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${ticketFilter === "all" ? "bg-blue-600 text-white" : "bg-[#23283a] text-white border border-blue-600 hover:bg-blue-600/20 transition-colors"}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("disponible")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${ticketFilter === "disponible" ? "bg-blue-500 text-white" : "bg-[#23283a] text-white border border-blue-500 hover:bg-blue-500/20 transition-colors"}`}
                                    >
                                        Disponible
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("ocupados")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${ticketFilter === "ocupados" ? "bg-blue-700 text-white" : "bg-[#23283a] text-white border border-blue-700 hover:bg-blue-700/20 transition-colors"}`}
                                    >
                                        Apartados
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("familiares")}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap ${ticketFilter === "familiares" ? "bg-blue-400 text-white" : "bg-[#23283a] text-white border border-blue-400 hover:bg-blue-400/20 transition-colors"}`}
                                    >
                                        Familiares
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid max-md:grid-cols-6 max-lg:grid-cols-10 min-lg:grid-cols-15 gap-2 max-md:max-h-140 min-md:h-[100vh] overflow-y-scroll justify-start content-start">
                            {filteredTickets.map((ticket) => (
                                <div key={ticket.numero_ticket} className="relative">
                                    <div
                                        onClick={() => handleTicketClick(ticket)}
                                        title={`N°${ticket.numero_ticket} - ${ticket.estado_ticket === "disponible" ? "Disponible"
                                            : (ticket.estado_ticket === "apartado" || ticket.estado_ticket === "pagado") ? "Ocupado"
                                                : ticket.estado_ticket === "familiares" ? "Familiares"
                                                    : ""
                                            }`}
                                        className={`
                                        w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                                        text-xs font-bold transition-all duration-200 transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed] hover:shadow-lg
                                        ${ticket.estado_ticket === "disponible" ? "bg-[#23283a] text-white hover:bg-[#2d3748] border border-[#4a5568]" : ""}
                                        ${ticket.estado_ticket === "apartado" ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md border border-blue-600" : ""}
                                        ${ticket.estado_ticket === "pagado" ? "bg-blue-500 text-white hover:bg-blue-600 shadow-md border border-blue-700" : ""}
                                        ${ticket.estado_ticket === "familiares" ? "bg-purple-400 text-white hover:bg-blue-500 shadow-md border border-blue-500" : ""}
                                        ${selectedTicketsFromMap.includes(ticket.numero_ticket) ? "!bg-[#3b82f6] ring-2 ring-white" : ""}
                                        ${ganador && ganador.numero_ganador === ticket.numero_ticket ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold ring-4 ring-white shadow-2xl animate-pulse" : ""}
                                        `}
                                    >
                                        <div className="flex flex-col items-center justify-center">
                                            <span className="leading-none">{ticket.numero_ticket}</span>
                                            {ticket.estado_ticket !== "disponible" && (
                                                <div className="w-1 h-1 bg-current rounded-full mt-0.5 opacity-60"></div>
                                            )}
                                        </div>
                                    </div>
                                    {ganador && ganador.numero_ganador === ticket.numero_ticket && (
                                        <TrophyIcon className="w-4 h-4 absolute top-1 right-1 text-black/70" />
                                    )}
                                </div>
                            ))}

                            {/* Mensaje cuando no hay resultados */}
                            {filteredTickets.length === 0 && (
                                <div className="col-span-full w-full text-center py-12">
                                    <div className="bg-[#23283a] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                        <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" /> 
                                    </div>
                                    <h3 className="text-white text-lg font-semibold mb-2">
                                        No se encontraron tickets
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-4">
                                        {searchQuery
                                            ? `No hay tickets que coincidan con "${searchQuery}"`
                                            : `No hay tickets con el estado "${ticketFilter === "all" ? "disponible" : ticketFilter}"`
                                        }
                                    </p>
                                    {(searchQuery || ticketFilter !== "all") && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setTicketFilter("all");
                                            }}
                                            className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                                        >
                                            Limpiar filtros
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <TicketVerifierModal
                isOpen={isVerifierOpen}
                onClose={() => setIsVerifierOpen(false)}
                allTickets={allTickets}
                rifa={rifa}
            />
            <Footer/>
        </div>
    );
}
