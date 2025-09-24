import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, NavLink } from "react-router-dom";
import { ArrowLeftIcon, Cog6ToothIcon, TicketIcon, XMarkIcon, MagnifyingGlassIcon, TrophyIcon, ShareIcon, PencilIcon, PlusIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { LoadingScreen } from "../components/LoadingScreen";
import { TicketRegistrationWizard } from "../components/TicketRegistrationWizard";
import { WinnerRegistrationModal } from "../components/WinnerRegistrationModal";
import { TicketDetailModal } from "../components/TicketDetailModal";
import { useAuth } from '../context/AuthContext';

const formatTicketNumber = (number, totalTickets) => {
  if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
    return number;
  }
  const numDigits = String(totalTickets - 1).length;
  return String(number).padStart(Math.max(3, numDigits), "0");
};

export function DetalleRifa() {
  const { id } = useParams();
  const [rifa, setRifa] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [ganador, setGanador] = useState(null);
  const [selectedTicketsFromMap, setSelectedTicketsFromMap] = useState([]);
  const { empresaId } = useAuth();

  // Modal states
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showPlayerGroupModal, setShowPlayerGroupModal] = useState(false);
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);

  const pdfRef = useRef(); // For the map export

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

  const fetchRaffle = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase.from("t_rifas").select("*").eq("id_rifa", id).eq("empresa_id", empresaId).single();
    if (!error) setRifa(data);
    else toast.error("Error al cargar los datos de la rifa.");
    setLoading(false);
  }, [id, empresaId]);

  // Fetch rifas info
  useEffect(() => {
    fetchRaffle();
  }, [fetchRaffle]);

  // Fetch winner info if exists
  useEffect(() => {
    const fetchGanador = async () => {
      if (!empresaId) return;
      const { data, error } = await supabase
        .from('t_ganadores')
        .select('*, t_jugadores(nombre, apellido, telefono)')
        .eq('rifa_id', id)
        .eq("empresa_id", empresaId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching winner:", error);
      } else if (data) {
        setGanador(data);
      }
    };
    fetchGanador();
  }, [id, rifa?.estado, empresaId]); // Re-fetch if raffle state changes
  // Fetch tickets for this rifas
  const fetchTickets = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase.from("vw_tickets").select("*").eq("rifa_id", id).eq("empresa_id", empresaId);
    if (!error) {
      console.log('Tickets loaded:', data);
      setTickets(data || []);
    } else {
      console.error('Error loading tickets:', error);
    }
    setLoading(false);
  };

  const handleRegistrationSuccess = (softRefresh = false) => {
    fetchTickets();
    if (!softRefresh) {
      setShowRegistrationWizard(false);
      setSelectedTicketsFromMap([]);
    }
  };

  // Ticket stats

  // Ticket filters
  const filterOptions = [
    { key: "all", label: "Todos", color: "bg-[#7c3bed]", textColor: "text-white" },
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", textColor: "text-white" },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", textColor: "text-yellow-900" },
    { key: "pagado", label: "Pagados", color: "bg-green-500", textColor: "text-white" },
    { key: "familiares", label: "Familiares", color: "bg-purple-500", textColor: "text-white" }
  ];

  // Unified function to generate all tickets with proper status
  const generateAllTickets = () => {
    if (!rifa?.total_tickets) return [];

    // Create a Map for efficient lookups. This is much faster than .find() in a loop.
    // Use the formatted ticket number as key for lookup since database stores formatted numbers
    const ticketsMap = new Map(tickets.filter((ticket) => ticket.rifa_id === id).map(t => [t.numero_ticket, t]));
    return Array.from({ length: rifa.total_tickets }, (_, i) => {
      const rawNumero = i;
      const formattedNumero = formatTicketNumber(rawNumero, rifa.total_tickets);
      const existingTicket = ticketsMap.get(formattedNumero);
      
      if (existingTicket) {
        // This ticket exists in the database, so it's occupied.
        // Map the database fields to our expected structure with formatted ticket number
        return {
          id: existingTicket.id || existingTicket.ticket_id, // Use id if available, fallback to ticket_id
          numero_ticket: formattedNumero,
          estado_ticket: existingTicket.estado_ticket,
          nombre_jugador: existingTicket.nombre_jugador,
          apellido_jugador: existingTicket.apellido_jugador,
          email_jugador: existingTicket.email_jugador,
          telefono_jugador: existingTicket.telefono,
          cedula_jugador: existingTicket.cedula,
          fecha_pago: existingTicket.fecha_pago,
          rifa_id: existingTicket.rifa_id
        };
      } else {
        // This ticket number is not in the database, so it's available.
        return {
          id: null,
          numero_ticket: formattedNumero,
          estado_ticket: "disponible",
          nombre_jugador: null,
          email_jugador: null,
          telefono_jugador: null,
          cedula_jugador: null,
          fecha_pago: null,
          rifa_id: rifa.id_rifa
        };
      }
    });
  };

  const allTickets = generateAllTickets();
  const ticketStatusMap = useMemo(() => new Map(allTickets.map(t => [t.numero_ticket, t.estado_ticket])), [allTickets]);
  const filteredTickets = allTickets.filter(ticket => {
    const matchesStatus = ticketFilter === "all" || ticket.estado_ticket === ticketFilter;
    const matchesSearch = !searchQuery ||
      ticket.numero_ticket.includes(searchQuery) ||
      (ticket.nombre_jugador && ticket.nombre_jugador.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ticket.cedula && ticket.cedula.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleProceedWithSelection = () => {
    if (selectedTicketsFromMap.length === 0) {
      toast.info("Selecciona al menos un ticket del mapa.");
      return;
    }
    setShowRegistrationWizard(true);
  };

  const handleTicketClick = (ticket) => {
    console.log('Ticket clicked:', ticket);
    
    // Validación para evitar abrir modal con ticket null
    if (!ticket) {
      console.error('Ticket is null in handleTicketClick');
      return;
    }
    
    console.log('Ticket estado:', ticket.estado_ticket);
    console.log('Ticket jugador_id:', ticket.jugador_id);
    console.log('Ticket nombre_jugador:', ticket.nombre_jugador);
    
    if (ticket.estado_ticket === 'disponible') {
      console.log('Ticket is available, adding to selection');
      setSelectedTicketsFromMap(prev =>
        prev.includes(ticket.numero_ticket)
          ? prev.filter(n => n !== ticket.numero_ticket)
          : [...prev, ticket.numero_ticket]
      );
    } else {
      console.log('Ticket is not available, opening detail modal');
      openTicketDetail(ticket);
    }
  };

  const openTicketDetail = (ticket) => {
    console.log('Opening ticket detail for:', ticket);
    
    // Validación para evitar abrir modal con ticket null
    if (!ticket) {
      console.error('Ticket is null in openTicketDetail');
      toast.error('Error: No se pudo cargar la información del ticket');
      return;
    }
    
    // Si no hay jugador_id pero hay información del jugador, crear un playerGroup con los datos disponibles
    if (!ticket.jugador_id) {
      console.log('No jugador_id found, but creating player group with available data');
      
      const playerGroupData = {
        info: {
          nombre_jugador: ticket.nombre_jugador || 'N/A',
          apellido_jugador: ticket.apellido_jugador || '',
          cedula_jugador: ticket.cedula_jugador || 'N/A',
          telefono_jugador: ticket.telefono_jugador || ticket.email_jugador || 'N/A',
          email_jugador: ticket.email_jugador || 'N/A',
          jugador_id: ticket.jugador_id || null,
          metodo_pago: ticket.metodo_pago || 'N/A',
          referencia_pago: ticket.referencia_pago || ticket.referencia || 'N/A'
        },
        tickets: [ticket] // Solo este ticket ya que no podemos agrupar por jugador_id
      };
      
      console.log('Setting player group with available data:', playerGroupData);
      setSelectedPlayerGroup(playerGroupData);
      setSelectedTicketForDetail(ticket);
      setShowPlayerGroupModal(true);
      return;
    }

    const playerTickets = allTickets.filter(t => t.jugador_id === ticket.jugador_id);
    console.log('Found player tickets:', playerTickets);

    if (playerTickets.length === 0) {
      console.log('No player tickets found, creating single ticket group');
      const playerGroupData = {
        info: {
          nombre_jugador: ticket.nombre_jugador || 'N/A',
          apellido_jugador: ticket.apellido_jugador || '',
          cedula_jugador: ticket.cedula_jugador || 'N/A',
          telefono_jugador: ticket.telefono_jugador || ticket.email_jugador || 'N/A',
          email_jugador: ticket.email_jugador || 'N/A',
          jugador_id: ticket.jugador_id,
          metodo_pago: ticket.metodo_pago || 'N/A',
          referencia_pago: ticket.referencia_pago || ticket.referencia || 'N/A'
        },
        tickets: [ticket]
      };
      
      setSelectedPlayerGroup(playerGroupData);
      setSelectedTicketForDetail(ticket);
      setShowPlayerGroupModal(true);
      return;
    }

    const playerGroupData = {
      info: {
        nombre_jugador: ticket.nombre_jugador,
        apellido_jugador: ticket.apellido_jugador,
        cedula_jugador: ticket.cedula_jugador,
        telefono_jugador: ticket.telefono_jugador,
        email_jugador: ticket.email_jugador,
        jugador_id: ticket.jugador_id,
        metodo_pago: ticket.metodo_pago || 'N/A',
        referencia_pago: ticket.referencia_pago || ticket.referencia || 'N/A'
      },
      tickets: playerTickets.sort((a, b) => a.numero_ticket - b.numero_ticket)
    };
    
    console.log('Setting player group:', playerGroupData);
    setSelectedPlayerGroup(playerGroupData);
    setSelectedTicketForDetail(ticket);
    
    console.log('Setting modal to open');
    setShowPlayerGroupModal(true);
  };
  const closePlayerGroupModal = () => {
    setShowPlayerGroupModal(false);
    setSelectedPlayerGroup(null);
    setSelectedTicketForDetail(null);
  };

  const handleOpenRegistrationModal = () => {
    if (disponibles === 0) {
      toast.error("No hay tickets disponibles para registrar.");
      return;
    }
    setShowRegistrationWizard(true);
  };

  const handleOpenWinnerModal = () => {
    if (rifa?.estado === 'finalizada' || ganador) {
      toast.info(`Esta rifa ya ha finalizado. El ganador fue el número #${ganador?.numero_ganador}.`);
      return;
    } if (pagados !== rifa?.total_tickets) {
      toast.error('No se pueden registrar ganadores. Todos los tickets deben estar pagados.');
      return;
    }
    setShowWinnerModal(true);
  };

  // Fallback para copiar en portapapeles en entornos no seguros (http)
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success("Enlace copiado al portapapeles");
        return true;
      }
    } catch (err) {
      console.error('Fallback: Error al copiar', err);
    } finally {
      document.body.removeChild(textArea);
    }
    return false;
  };

  const handleShareLink = async () => {
    const publicUrl = `${window.location.origin}/public-rifa/${id}`;
    try {
      // Intento moderno (requiere HTTPS o localhost)
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Enlace público copiado al portapapeles");
    } catch (error) {
      console.warn("Error al copiar con la API moderna, intentando fallback:", error);
      // Si falla, intentar el método antiguo. Si también falla, mostrar prompt.
      if (!fallbackCopyTextToClipboard(publicUrl)) {
        toast.error("No se pudo copiar automáticamente.");
        window.prompt("Copia este enlace manualmente:", publicUrl);
      }
    }
  };

  useEffect(() => {
    fetchRaffle();
    fetchTickets();
  }, [id, fetchRaffle]);
  // Calculate ticket statistics correctly
  const disponibles = allTickets.filter((t) => t.estado_ticket === "disponible").length;
  const apartados = allTickets.filter((t) => t.estado_ticket === "apartado").length;
  const pagados = allTickets.filter((t) => t.estado_ticket === "pagado").length;
  const familiares = allTickets.filter((t) => t.estado_ticket === "familiares").length
  const ticketStats = [
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", count: disponibles },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", count: apartados },
    { key: "pagado", label: "Pagados", color: "bg-green-500", count: pagados },
    { key: "familiares", label: "Familiares", color: "bg-purple-500", count: familiares }
  ];

  if (loading && !rifa) {
    return <LoadingScreen message="Cargando detalles de la rifa..." />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <NavLink to="/rifas" className="flex items-center gap-2 text-[#d54ff9] hover:underline text-sm w-full">
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Rifas
        </NavLink>
      </div>
      <div className="mb-6 flex justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-left bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">
          {rifa?.nombre}
        </h1>

        <NavLink to={`/rifas/editar/${id}`} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#23283a] text-[#d54ff9] text-xs font-semibold">
          <PencilIcon className="w-4 h-4" />
          <span>Editar</span>
        </NavLink>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2   gap-4 mb-4">
        <div className="flex items-center gap-4 bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Ticket Price</span>
            <span className="text-[#16a249] text-xl font-bold">$ {rifa?.precio_ticket}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <div className="flex items-center gap-2 bg-[#7c3bed]/20 p-2 rounded-lg">
            <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Tickets Sold</span>
            <span className="text-white text-xl font-bold">{tickets.length} / {rifa?.total_tickets}</span>
          </div>
        </div>
      </div>

      {/* Ticket stats */}
      <div className="mb-4">
        <div className="gap-4 grid min-md:grid-cols-4 max-md:grid-cols-2 mb-4">
          {ticketStats.map(stat => (
            <div key={stat.key} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg flex-1">
              <span className={`text-xs text-white`}>{stat.label}</span>
              <span className={`block text-2xl font-bold text-white`}>{stat.count}</span>
            </div>
          ))}
        </div>
        
        {/* Action buttons */}
        <div className="md:flex md:items-end md:justify-end max-md:grid max-md:grid-cols-3 gap-4 w-full">
          <button 
          onClick={handleOpenRegistrationModal}
            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0"
            title="Registrar ganador de la rifa"
            aria-label="Registrar ganador de la rifa">
            <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-pulse" />
          </button>
          <button
            onClick={handleOpenWinnerModal}
            className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0"
            title="Registrar ganador de la rifa"
            aria-label="Registrar ganador de la rifa"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-bounce" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </button>
          <button
            onClick={handleShareLink}
            className="group relative overflow-hidden bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0"
            title="Compartir enlace público"
            aria-label="Compartir enlace público"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <ShareIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-pulse" />
            <span className="hidden sm:inline relative z-10">Compartir</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </button>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row max-md:w-full gap-4 mb-4">
        {/* Buscador */}
        <div className="relative flex-1  max-md:w-full ">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ticket... (Ej: 123, Juan, email@ejemplo.com)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition-colors placeholder-gray-500"
            title="Busca por número de ticket, nombre del jugador o email. Usa Ctrl+F para enfocar o Escape para limpiar."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTicketFilter(opt.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${ticketFilter === opt.key
                ? `${opt.color} ${opt.textColor} border-transparent shadow-md`
                : "bg-transparent text-gray-400 border-[#23283a] hover:border-[#7c3bed] hover:text-white"
                }`}
            >
              <span>{opt.label}</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${ticketFilter === opt.key
                ? "bg-black/20"
                : "bg-[#23283a] text-gray-300"
                }`}>
                {searchQuery ? (
                  // Show filtered count when searching
                  opt.key === "all"
                    ? filteredTickets.length
                    : filteredTickets.filter(t => t.estado === opt.key).length
                ) : (
                  // Show total count when not searching
                  opt.key === "all"
                    ? allTickets.length
                    : opt.key === "disponible"
                      ? disponibles
                      : opt.key === "apartado"
                        ? apartados
                        : opt.key === "pagado"
                          ? pagados
                          : allTickets.filter(t => t.estado_ticket === "familiares").length
                )}
              </span>
            </button>
          ))}
          <div className="flex gap-2 mt-2 sm:mt-0 sm:ml-auto">
            {selectedTicketsFromMap.length > 0 ? (
              <>
                <button
                  onClick={handleProceedWithSelection}
                  className="bg-gradient-to-r from-green-500 to-[#16a249] text-white px-4 py-2 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 shadow-lg hover:scale-105"
                  style={{ minWidth: '140px' }}
                >
                  <TicketIcon className="w-6 h-6 animate-bounce" />
                  <span>Registrar</span>
                  <span className="ml-2 text-xs bg-black/20 px-2 py-1 rounded">
                    {selectedTicketsFromMap.map(n => formatTicketNumber(n, rifa?.total_tickets)).join(", ")}
                  </span>
                </button>
                <button
                  onClick={() => setSelectedTicketsFromMap([])}
                  className="bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 py-2 rounded-xl font-bold transition-all hover:scale-105 shadow"
                  style={{ minWidth: '100px' }}
                >
                  <XMarkIcon className="w-5 h-5 mr-1" />
                  Limpiar
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mapa de tickets */}
      <div ref={pdfRef} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-white text-lg font-bold mb-1 sm:mb-0">
              Mapa de Tickets
            </h2>
            {(searchQuery || ticketFilter !== "all") && (
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

        <motion.div
          layout
          className="grid max-md:grid-cols-6 max-lg:grid-cols-10 min-lg:grid-cols-15 gap-2 max-h-100 overflow-y-scroll"
        >
          <AnimatePresence>
          {filteredTickets.map((ticket) => (
            <motion.div
              layout
              key={ticket.numero_ticket}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <div
                onClick={() => handleTicketClick(ticket)}
                title={`N°${ticket.numero_ticket} - ${ticket.estado_ticket === "disponible" ? "Disponible - Haz clic para comprar"
                  : ticket.estado_ticket === "apartado" ? `Apartado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                    : ticket.estado_ticket === "pagado" ? `Pagado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                      : ticket.estado_ticket === "familiares" ? "Familiares"
                        : ""
                  }`}
                className={`
                w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                text-xs font-bold transition-all duration-200 transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed] hover:shadow-lg
                ${ticket.estado_ticket === "disponible" ? "bg-[#23283a] text-white hover:bg-[#2d3748] border border-[#4a5568]" : ""}
                ${ticket.estado_ticket === "apartado" ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md border border-yellow-500" : ""}
                ${ticket.estado_ticket === "pagado" ? "bg-green-500 text-white hover:bg-green-400 shadow-md border border-green-600" : ""}
                ${ticket.estado_ticket === "familiares" ? "bg-purple-500 text-white hover:bg-purple-400 shadow-md border border-purple-600 opacity-75" : ""}
                ${selectedTicketsFromMap.includes(ticket.numero_ticket) ? "!bg-[#d54ff9] ring-2 ring-white" : ""}
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
            </motion.div>
          ))}
          </AnimatePresence>

          {/* Mensaje cuando no hay resultados */}
          {filteredTickets.length === 0 && (
            <AnimatePresence>
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
                  : `No hay tickets con el estado "${filterOptions.find(f => f.key === ticketFilter)?.label}"`
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
            </AnimatePresence>
          )}
        </motion.div>
      </div>

      <TicketRegistrationWizard
        isOpen={showRegistrationWizard}
        onClose={() => {
          setShowRegistrationWizard(false);
          setSelectedTicketsFromMap([]);
        }}
        rifa={rifa}
        ticketStatusMap={ticketStatusMap}
        onSuccess={handleRegistrationSuccess}
        initialSelectedNumbers={selectedTicketsFromMap}
      />

      <WinnerRegistrationModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        rifa={rifa}
        allTickets={allTickets}
        onSuccess={() => {
          fetchRaffle();
          fetchTickets();
          setShowWinnerModal(false);
        }}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={showPlayerGroupModal}
        onClose={closePlayerGroupModal}
        ticket={selectedTicketForDetail}
        playerGroup={selectedPlayerGroup}
        rifa={rifa}
        onStatusUpdate={() => {
          fetchTickets();
          closePlayerGroupModal();
        }}
      />
    </div>
  );
}