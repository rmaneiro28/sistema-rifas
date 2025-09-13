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
                    <Icon className="w-7 h-7 text-purple-400" />
                )}
                <div>
                    <div className="font-bold text-white text-base flex items-center gap-1">{label}</div>
                    <div className="text-sm text-gray-300 break-all">{value}</div>
                </div>
            </div>
            <button
                onClick={handleCopy}
                className="ml-4 bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all"
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

// --- Subcomponentes para mejorar la legibilidad ---
const formatTicketNumber = (number, totalTickets) => {
  if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
    return number;
  }
  const numDigits = String(totalTickets - 1).length;
  return String(number).padStart(Math.max(3, numDigits), "0");
};

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

const RaffleHeader = ({ rifa }) => (
    <div className="grid max-md:grid-cols-1 md:grid-cols-5 gap-0 items-center bg-[#181c24] border border-[#23283a] rounded-2xl overflow-hidden mb-10">
        {/* Columna de la Imagen */}
        <div className="md:col-span-3 w-full h-full">
            <img src={rifa.imagen_url} alt={rifa.nombre} className="w-full h-[90vh] object-cover" />
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
                    vendidos={rifa.tickets_vendidos}
                    total={rifa.total_tickets}
                    progreso={(rifa.tickets_vendidos / rifa.total_tickets) * 100}
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

    // Función para formatear números de tickets con ceros a la izquierda
    const formatTicketNumber = (number) => {
        return number.toString().padStart(4, '0');
    };

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

            console.log('🎫 DEBUG - ticketsData:', ticketsData);
            console.log('🎫 DEBUG - Primer ticket:', ticketsData?.[0]);
            console.log('🎫 DEBUG - Estructura de ticketsData:', ticketsData?.map(t => ({
                numero_ticket: t.numero_ticket,
                estado_ticket: t.estado_ticket,
                nombre_jugador: t.nombre_jugador
            })));

            const ticketsMap = new Map(ticketsData.map(t => [t.numero_ticket, t]));
            console.log('🎫 DEBUG - ticketsMap keys:', Array.from(ticketsMap.keys()));
            
            const generatedTickets = Array.from({ length: rifaData.total_tickets }, (_, i) => {
                const existingTicket = ticketsMap.get(i + 1); // Los tickets probablemente empiezan en 1, no en 0
                const ticket = existingTicket ?
                    { ...existingTicket, numero: i, estado: existingTicket.estado_ticket, numero_ticket: existingTicket.numero_ticket, estado_ticket: existingTicket.estado_ticket, nombre_jugador: existingTicket.nombre_jugador } :
                    { numero: i, estado: "disponible", numero_ticket: i, estado_ticket: "disponible" };
                
                return ticket;
            });
            
            console.log('🎫 DEBUG - generatedTickets (primeros 10):', generatedTickets.slice(0, 10));
            console.log('🎫 DEBUG - generatedTickets (últimos 10):', generatedTickets.slice(-10));
            console.log('🎫 DEBUG - Estados encontrados:', [...new Set(generatedTickets.map(t => t.estado))]);
            
            setAllTickets(generatedTickets);

        } catch (error) {
            toast.error("Error al cargar los datos de la rifa.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [id]);


    useEffect(() => { fetchRaffleAndTickets(); }, [fetchRaffleAndTickets]);

    const { vendidos, disponibles, progreso } = useMemo(() => {
        const vendidosCount = allTickets.filter(t => t.estado !== 'disponible').length;
        const total = rifa?.total_tickets || 0;
        return {
            vendidos: vendidosCount,
            disponibles: total - vendidosCount,
            progreso: total > 0 ? (vendidosCount / total) * 100 : 0,
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
        toast.info(`Ticket #${formatTicketNumber(ticketNumber)} - ${ticketStatus === "disponible" ? "Disponible" : ticketStatus === "apartado" ? "Apartado" : ticketStatus === "pagado" ? "Pagado" : ticketStatus === "familiares" ? "Familiares" : ""}`);
    };

    // Filtrar tickets según el estado seleccionado y búsqueda
    const filteredTickets = useMemo(() => {
        let filtered = allTickets;
        
        if (ticketFilter !== 'all') {
            const filterMap = {
                'disponible': 'disponible',
                'apartado': 'apartado',
                'pagado': 'pagado',
                'familiares': 'familiares'
            };
            filtered = filtered.filter(t => t.estado === filterMap[ticketFilter]);
        }
        
        if (searchQuery) {
            filtered = filtered.filter(ticket => 
                ticket.numero_ticket?.toString().includes(searchQuery)
            );
        }
        
        console.log('🎫 DEBUG - filteredTickets:', {
            total: filtered.length,
            ticketFilter,
            searchQuery,
            muestra: filtered.slice(0, 5).map(t => ({ numero: t.numero, estado: t.estado }))
        });
        
        return filtered;
    }, [allTickets, ticketFilter, searchQuery]);

    if (loading) return <LoadingScreen message="Cargando rifa..." />;
    if (!rifa) return <div className="flex items-center justify-center min-h-screen bg-[#0f131b] text-red-500">No se pudo encontrar la rifa.</div>;
    return (
        <div className="min-h-screen bg-[#0f131b] text-white font-sans bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
            {ganador && <Confetti width={width} height={height} recycle={false} numberOfPieces={400} />}
            <div className="container mx-auto p-4 sm:p-8">
                <RaffleHeader rifa={rifa} />

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
                    <div className="lg:col-span-2 bg-[#181c24]/50 backdrop-blur-sm border border-[#23283a] p-6 rounded-xl flex flex-col">
                        {/* Mapa de tickets */}
                        <div ref={pdfRef} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg overflow-auto">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
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

                                {/* Leyenda de colores */}
                                <div className="flex flex-wrap gap-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-[#23283a] border border-[#4a5568] rounded"></div>
                                        <span className="text-gray-300">Disponible</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded"></div>
                                        <span className="text-gray-300">Apartado</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
                                        <span className="text-gray-300">Pagado</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-purple-500 border border-purple-600 rounded opacity-75"></div>
                                        <span className="text-gray-300">Familiares</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barra de búsqueda y filtros */}
                            <div className="max-md:grid max-md:grid-cols-1 min-md:flex gap-4 mb-6">
                                <div className="relative flex-1 max-w-prose">
                                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        placeholder="Buscar tickets..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
                                    />
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    <button
                                        onClick={() => setTicketFilter("all")}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${ticketFilter === "all" ? "bg-[#7c3bed] text-white" : "bg-[#23283a] text-white border border-[#7c3bed]"}`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("disponible")}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${ticketFilter === "disponible" ? "bg-gray-600 text-white" : "bg-[#23283a] text-white border border-gray-600"}`}
                                    >
                                        Disponible
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("apartado")}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${ticketFilter === "apartado" ? "bg-yellow-500 text-yellow-900" : "bg-[#23283a] text-white border border-yellow-500"}`}
                                    >
                                        Apartado
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("pagado")}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${ticketFilter === "pagado" ? "bg-green-500 text-white" : "bg-[#23283a] text-white border border-green-500"}`}
                                    >
                                        Pagado
                                    </button>
                                    <button
                                        onClick={() => setTicketFilter("familiares")}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold ${ticketFilter === "familiares" ? "bg-purple-500 text-white" : "bg-[#23283a] text-white border border-purple-500"}`}
                                    >
                                        Familiares
                                    </button>
                                </div>
                            </div>

                            <div className="grid max-md:grid-cols-6 max-lg:grid-cols-10 min-lg:grid-cols-15 gap-2 max-h-100 overflow-y-scroll">
                                {filteredTickets.map((ticket) => (
                                    <div key={ticket.numero} className="relative">
                                        <div
                                            onClick={() => handleTicketClick(ticket)}
                                            title={`N°${formatTicketNumber(ticket.numero)} - ${ticket.estado_ticket === "disponible" ? "Disponible - Haz clic para ver información"
                                                : ticket.estado_ticket === "apartado" ? `Apartado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                                                    : ticket.estado_ticket === "pagado" ? `Pagado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                                                        : ticket.estado_ticket === "familiares" ? "Familiares - Haz clic para ver detalles"
                                                            : ""
                                                }`}
                                            className={`
                                            w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                                            text-xs font-bold transition-all duration-200 transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed] hover:shadow-lg
                                            ${ticket.estado_ticket === "disponible" ? "bg-[#23283a] text-white hover:bg-[#2d3748] border border-[#4a5568]" : ""}
                                            ${ticket.estado_ticket === "apartado" ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md border border-yellow-500" : ""}
                                            ${ticket.estado_ticket === "pagado" ? "bg-green-500 text-green-900 hover:bg-green-400 shadow-md border border-green-600" : ""}
                                            ${ticket.estado_ticket === "familiares" ? "bg-purple-500 text-purple-100 hover:bg-purple-400 shadow-md border border-purple-600 opacity-75" : ""}
                                            ${selectedTicketsFromMap.includes(ticket.numero) ? "!bg-[#d54ff9] ring-2 ring-white" : ""}
                                            ${ganador && ganador.numero_ganador === ticket.numero ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold ring-4 ring-white shadow-2xl animate-pulse" : ""}
                                          `}
                                        >
                                            <div className="flex flex-col items-center justify-center">
                                                <span className="leading-none">{formatTicketNumber(ticket.numero)}</span>
                                                {ticket.estado !== "disponible" && (
                                                    <div className="w-1 h-1 bg-current rounded-full mt-0.5 opacity-60"></div>
                                                )}
                                            </div>
                                        </div>
                                        {ganador && ganador.numero_ganador === ticket.numero && (
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
            </div>

            <TicketVerifierModal
                isOpen={isVerifierOpen}
                onClose={() => setIsVerifierOpen(false)}
                allTickets={allTickets}
            />
            <Footer/>
        </div>
    );
}
