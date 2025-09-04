import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, NavLink } from "react-router-dom";
import { ArrowLeftIcon, Cog6ToothIcon, TicketIcon, XMarkIcon, MagnifyingGlassIcon, TrophyIcon, ShareIcon } from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { LoadingScreen } from "../components/LoadingScreen";
import { TicketRegistrationWizard } from "../components/TicketRegistrationWizard";
import { WinnerRegistrationModal } from "../components/WinnerRegistrationModal";
import { TicketDetailModal } from "../components/TicketDetailModal";

const formatTicketNumber = (number, totalTickets) => {
  if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
    return number;
  }
  const numDigits = String(totalTickets).length;
  return String(number).padStart(numDigits, "0");
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
    setLoading(true);
    const { data, error } = await supabase.from("t_rifas").select("*").eq("id_rifa", id).single();
    if (!error) setRifa(data);
    else toast.error("Error al cargar los datos de la rifa.");
    setLoading(false);
  }, [id]);

  // Fetch rifas info
  useEffect(() => {
    fetchRaffle();
  }, [fetchRaffle]);

  // Fetch winner info if exists
  useEffect(() => {
    const fetchGanador = async () => {
      const { data, error } = await supabase
        .from('t_ganadores')
        .select('*, t_jugadores(nombre, apellido, telefono)')
        .eq('rifa_id', id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching winner:", error);
      } else if (data) {
        setGanador(data);
      }
    };
    fetchGanador();
  }, [id, rifa?.estado]); // Re-fetch if raffle state changes
  // Fetch tickets for this rifas
  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vw_tickets").select("*").eq("rifa_id", id);
    if (!error) setTickets(data || []);
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
    const ticketsMap = new Map(tickets.filter((ticket) => ticket.rifa_id === id).map(t => [t.numero_ticket, t]));
    console.log(ticketsMap);
    return Array.from({ length: rifa.total_tickets - 1 }, (_, i) => {
      const numero = i + 1;
      const existingTicket = ticketsMap.get(numero);

      if (existingTicket) {
        // This ticket exists in the database, so it's occupied.
        // We use its status directly from the database to show the "true status".
        // A ticket in the DB should always have a valid status ('apartado', 'pagado', 'familiares').
        return {
          ...existingTicket,
          numero: existingTicket.numero_ticket,
          estado: existingTicket.estado_ticket, // Using the real status from the database.
        };
      } else {
        // This ticket number is not in the database, so it's available.
        return {
          numero,
          estado: "disponible",
          ticket_id: null,
          nombre_jugador: null,
          email_jugador: null,
          telefono_jugador: null,
          fecha_compra: null,
          rifa_id: rifa.id_rifa
        };
      }
    });
  };

  const allTickets = generateAllTickets();
  const ticketStatusMap = useMemo(() => new Map(allTickets.map(t => [t.numero, t.estado])), [allTickets]);
  const filteredTickets = allTickets.filter(ticket => {
    const matchesStatus = ticketFilter === "all" || ticket.estado === ticketFilter;
    const matchesSearch = !searchQuery ||
      ticket.numero.toString().includes(searchQuery) ||
      (ticket.nombre_jugador && ticket.nombre_jugador.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ticket.email_jugador && ticket.email_jugador.toLowerCase().includes(searchQuery.toLowerCase()));

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
    if (ticket.estado === 'disponible') {
      setSelectedTicketsFromMap(prev =>
        prev.includes(ticket.numero)
          ? prev.filter(n => n !== ticket.numero)
          : [...prev, ticket.numero]
      );
    } else {
      openTicketDetail(ticket);
    }
  };

  const openTicketDetail = (ticket) => {
    if (!ticket.jugador_id) return;

    const playerTickets = allTickets.filter(t => t.jugador_id === ticket.jugador_id);

    if (playerTickets.length === 0) return;

    setSelectedPlayerGroup({
      info: {
        nombre_jugador: ticket.nombre_jugador,
        email_jugador: ticket.email_jugador,
        telefono_jugador: ticket.telefono_jugador,
        jugador_id: ticket.jugador_id
      },
      tickets: playerTickets.sort((a, b) => a.numero - b.numero)
    });

    setSelectedTicketForDetail(ticket);

    setShowPlayerGroupModal(true);;
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

  const handleShareLink = () => {
    const publicUrl = `${window.location.origin}/public-rifa/${id}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast.success("Enlace público copiado al portapapeles");
    }, () => {
      toast.error("No se pudo copiar el enlace");
    });
  };

  useEffect(() => {
    fetchRaffle();
    fetchTickets();
  }, [id, fetchRaffle]);

  // Calculate ticket statistics correctly
  const disponibles = allTickets.filter((t) => t.estado === "disponible").length;
  const apartados = allTickets.filter((t) => t.estado === "apartado").length;
  const pagados = allTickets.filter((t) => t.estado === "pagado").length;
  const familiares = allTickets.filter((t) => t.estado === "familiares").length

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
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-center">
          {rifa?.nombre}
        </h1>

        <NavLink to={`/rifas/editar/${id}`} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#23283a] text-[#d54ff9] text-xs font-semibold">
          <Cog6ToothIcon className="w-4 h-4" />
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
      <div className="gap-4 mb-4 grid min-md:grid-cols-4 max-md:grid-cols-2">
        {ticketStats.map(stat => (
          <div key={stat.key} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg flex-1">
            <span className={`text-xs text-white`}>{stat.label}</span>
            <span className={`block text-2xl font-bold text-white`}>{stat.count}</span>
          </div>
        ))}
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
                          : allTickets.filter(t => t.estado === "familiares").length
                )}
              </span>
            </button>
          ))}
          <div className="flex gap-2 mt-2 sm:mt-0 sm:ml-auto">
            {selectedTicketsFromMap.length > 0 ? (
              <>
                <button
                  onClick={handleProceedWithSelection}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <TicketIcon className="w-5 h-5" />
                  Registrar Selección ({selectedTicketsFromMap.length})
                </button>
                <button
                  onClick={() => setSelectedTicketsFromMap([])}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Limpiar
                </button>
              </>
            ) : (
              <button
                className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleOpenRegistrationModal}
                disabled={disponibles === 0}
              >
                Registrar Ticket
              </button>
            )}
            <button
              onClick={handleOpenWinnerModal}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <TrophyIcon className="w-5 h-5" />
              Registrar Ganador
            </button>
            <button
              onClick={handleShareLink}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <ShareIcon className="w-5 h-5" />
              Compartir
            </button>
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

        <div className="grid max-md:grid-cols-6 max-lg:grid-cols-10 min-lg:grid-cols-15 gap-2 max-h-100 overflow-y-scroll">
          {filteredTickets.map((ticket) => (
            <div className="relative">
              <div
                key={ticket.numero}
                onClick={() => handleTicketClick(ticket)}
                title={`N°${formatTicketNumber(ticket.numero, rifa?.total_tickets)} - ${ticket.estado === "disponible" ? "Disponible - Haz clic para comprar"
                  : ticket.estado === "apartado" ? `Apartado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                    : ticket.estado === "pagado" ? `Pagado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                      : ticket.estado === "familiares" ? "Familiares"
                        : ""
                  }`}
                className={`
                w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                text-xs font-bold transition-all duration-200 transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed] hover:shadow-lg
                ${ticket.estado === "disponible" ? "bg-[#23283a] text-white hover:bg-[#2d3748] border border-[#4a5568]" : ""}
                ${ticket.estado === "apartado" ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md border border-yellow-500" : ""}
                ${ticket.estado === "pagado" ? "bg-green-500 text-white hover:bg-green-400 shadow-md border border-green-600" : ""}
                ${ticket.estado === "familiares" ? "bg-purple-500 text-white hover:bg-purple-400 shadow-md border border-purple-600 opacity-75" : ""}
                ${selectedTicketsFromMap.includes(ticket.numero) ? "!bg-[#d54ff9] ring-2 ring-white" : ""}
                ${ganador && ganador.numero_ganador === ticket.numero ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold ring-4 ring-white shadow-2xl animate-pulse" : ""}
              `}
              >
                <div className="flex flex-col items-center justify-center">
                  <span className="leading-none">{formatTicketNumber(ticket.numero, rifa?.total_tickets)}</span>
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
            <div className="text-center py-12">
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
          )}
        </div>
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