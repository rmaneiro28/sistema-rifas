import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from "react-router-dom";
import Confetti from "react-confetti";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { MagnifyingGlassIcon, GiftIcon, CalendarDaysIcon, CurrencyDollarIcon, TrophyIcon, TicketIcon, ClipboardIcon, BanknotesIcon, CurrencyEuroIcon } from "@heroicons/react/24/outline";
import bancolombiaLogo from '../assets/Bancolombia.png';
import zelleLogo from '../assets/Zelle.png';
import venezuelaLogo from "../assets/Bdv.jpg"
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
                    <Icon className="w-7 h-7 text-yellow-400" />
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
                Copiar
            </button>
        </div>
    );
};
import { LoadingScreen } from '../components/LoadingScreen.jsx';
import { useWindowSize } from '../hooks/useWindowSize.js';
import { TicketVerifierModal } from '../components/TicketVerifierModal.jsx';

// --- Subcomponentes para mejorar la legibilidad ---

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
        <div className="md:col-span-2 w-full h-full">
            <img src={rifa.imagen_url} alt={rifa.nombre} className="w-full h-full object-cover aspect-square md:aspect-auto" />
        </div>

        {/* Columna del Texto */}
        <div className="md:col-span-3 p-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white">{rifa.nombre}</h1>
            <p className="text-gray-300 mt-2 max-w-3xl text-lg">{rifa.descripcion}</p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-white">
                <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-300 flex items-center gap-2"><GiftIcon className="w-4 h-4 text-purple-400" /> Premio</p>
                    <p className="text-xl font-bold">{rifa.premio || rifa.nombre}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/10">
                    <p className="text-sm text-gray-300 flex items-center gap-2"><CurrencyDollarIcon className="w-4 h-4 text-green-400" /> Precio</p>
                    <p className="text-xl font-bold">${rifa.precio_ticket}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl col-span-1 sm:col-span-2 border border-white/10">
                    <p className="text-sm text-gray-300 flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4 text-blue-400" /> Fecha del Sorteo</p>
                    <p className="text-xl font-bold">{rifa.fecha_sorteo && !isNaN(new Date(rifa.fecha_sorteo)) ? new Date(rifa.fecha_sorteo).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No definida'}</p>
                </div>
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

const Legend = () => (
    <div className="bg-[#181c24] border border-[#23283a] p-4 rounded-xl">
        <h3 className="font-bold text-white mb-3 text-center">Leyenda</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-400"></div><span>Pagado</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-yellow-400"></div><span>Apartado</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-purple-500 border-2 border-purple-400"></div><span>Familiar</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#2d3748] border-2 border-gray-500"></div><span>Disponible</span></div>
        </div>
    </div>
);

const Ticket = ({ ticket, ganador }) => {
    const getStatusClasses = () => {
        if (ganador?.numero_ganador === ticket.numero) {
            return 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black ring-4 ring-white/80 animate-pulse shadow-lg shadow-yellow-500/50';
        }
        switch (ticket.estado) {
            case 'pagado': return 'bg-green-500 text-white shadow-md shadow-green-500/20';
            case 'apartado': return 'bg-yellow-500 text-yellow-900 shadow-md shadow-yellow-500/20';
            case 'familiares': return 'bg-purple-500 text-white shadow-md shadow-purple-500/20';
            default: return 'bg-[#2d3748] text-gray-400';
        }
    };

    return (
        <div
            title={`#${ticket.numero} - ${ticket.estado}`}
            className={`relative w-full h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-all duration-200 transform hover:scale-105 hover:z-10 ${getStatusClasses()}`}
        >
            {/* Perforations */}
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-[#0f131b]" />)}
            </div>
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
                {[...Array(5)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-[#0f131b]" />)}
            </div>
            <span className="drop-shadow-sm">{ticket.numero}</span>
            {ganador?.numero_ganador === ticket.numero && <TrophyIcon className="w-4 h-4 absolute top-1.5 right-1.5 text-black/70" />}
        </div>
    );
};

const TicketGrid = React.memo(({ tickets, ganador }) => (
    <div className="grid max-md:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-2">
        {tickets.map((ticket) => <Ticket key={ticket.numero} ticket={ticket} ganador={ganador} />)}
    </div>
));

export function PublicRifa() {
    const { id } = useParams();
    const [rifa, setRifa] = useState(null);
    const [allTickets, setAllTickets] = useState([]);
    const [ganador, setGanador] = useState(null);
    const [loading, setLoading] = useState(true);
    const { width, height } = useWindowSize();
    const [isVerifierOpen, setIsVerifierOpen] = useState(false);
    const [ticketFilter, setTicketFilter] = useState('todos');

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

            const ticketsMap = new Map(ticketsData.map(t => [t.numero_ticket, t]));
            const generatedTickets = Array.from({ length: rifaData.total_tickets }, (_, i) => {
                const numero = i + 1;
                const existingTicket = ticketsMap.get(numero);
                return existingTicket ?
                    { ...existingTicket, numero: existingTicket.numero_ticket, estado: existingTicket.estado_ticket } :
                    { numero, estado: "disponible" };
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

    const { vendidos, disponibles, progreso } = useMemo(() => {
        const vendidosCount = allTickets.filter(t => t.estado !== 'disponible').length;
        const total = rifa?.total_tickets || 0;
        return {
            vendidos: vendidosCount,
            disponibles: total - vendidosCount,
            progreso: total > 0 ? (vendidosCount / total) * 100 : 0,
        };
    }, [allTickets, rifa]);

    // Filtrar tickets según el estado seleccionado (hook debe ir antes de cualquier return)
    const filteredTickets = useMemo(() => {
        if (ticketFilter === 'todos') return allTickets;
        if (ticketFilter === 'familiar') return allTickets.filter(t => t.estado === 'familiares');
        return allTickets.filter(t => t.estado === ticketFilter);
    }, [allTickets, ticketFilter]);

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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Columna Izquierda: Información */}
                    <div className="lg:col-span-1 space-y-8">
                        <RaffleProgressBar vendidos={vendidos} total={rifa.total_tickets} progreso={progreso} />

                        <button onClick={() => setIsVerifierOpen(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/50 flex items-center justify-center gap-2">
                            <MagnifyingGlassIcon className="w-5 h-5" />
                            Verificar mi Ticket
                        </button>

                        <Legend />

                        {/* Datos Bancarios llamativos */}
                        <div className="bg-[#181c24] border border-[#23283a] p-4 rounded-xl mt-4">
                            <h3 className="font-bold text-white mb-5 text-center text-lg">Datos Bancarios</h3>
                            <BankDataCard
                                logo={bancolombiaLogo}
                                label="Bancolombia"
                                value={import.meta.env.VITE_BANCOLOMBIA}
                            />
                            <BankDataCard
                                logo={zelleLogo}
                                label="Zelle"
                                value={import.meta.env.VITE_ZELLE}
                            />
                            <BankDataCard
                                icon={BanknotesIcon}
                                label="Pago Móvil"
                                value={import.meta.env.VITE_PAGOMOVIL}
                            />
                            <BankDataCard   
                                logo={venezuelaLogo}
                                label="Banco de Venezuela"
                                value={import.meta.env.VITE_BDV}
                            />
                        </div>
                        
                        <div className='bg-[#181c24] border border-[#232383a] p-4 rounded-xl mt-4'>
                            <h3 className="font-bold text-white mb-5 text-center text-lg">Números de contacto</h3>
                            <div className='flex items-center justify-between bg-[#23283a] rounded-xl p-4 mb-3 shadow-md border border-[#353a4d]'>
                                <p>{import.meta.env.VITE_CONTACTO_1}</p>
                            </div>
                            <div className='flex items-center justify-between bg-[#23283a] rounded-xl p-4 mb-3 shadow-md border border-[#353a4d]'>
                                <p>{import.meta.env.VITE_CONTACTO_2}</p>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Mapa de Tickets */}
                    <div className="lg:col-span-2 bg-[#181c24]/50 backdrop-blur-sm border border-[#23283a] p-6 rounded-xl flex flex-col">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 flex-shrink-0"><TicketIcon className="w-6 h-6 text-purple-400" /> Mapa de Tickets</h2>
                        {/* Filtro de tickets */}
                        <div className="mb-4 flex flex-wrap gap-2 items-center">
                            <label htmlFor="ticketFilter" className="text-sm font-semibold text-gray-300">Filtrar por estado:</label>
                            <select
                                id="ticketFilter"
                                value={ticketFilter}
                                onChange={e => setTicketFilter(e.target.value)}
                                className="bg-[#23283a] text-white rounded-lg px-3 py-2 border border-gray-600 focus:outline-none"
                            >
                                <option value="todos">Todos</option>
                                <option value="pagado">Pagado</option>
                                <option value="apartado">Apartado</option>
                                <option value="familiar">Familiar</option>
                                <option value="disponible">Disponible</option>
                            </select>
                        </div>
                        <div className="overflow-y-auto h-[75vh] pr-2">
                            <TicketGrid tickets={filteredTickets} ganador={ganador} />
                        </div>
                    </div>
                </div>
            </div>

            <TicketVerifierModal
                isOpen={isVerifierOpen}
                onClose={() => setIsVerifierOpen(false)}
                allTickets={allTickets}
            />
        </div>
    );
}
