import { MagnifyingGlassIcon, TrophyIcon, TicketIcon, CalendarIcon, ExclamationTriangleIcon, XMarkIcon, UserIcon, StarIcon } from "@heroicons/react/24/outline";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import JugadorFormModal from "../components/JugadorFormModal";
import { PlusIcon } from "@heroicons/react/16/solid";
import { toast } from "sonner";
import { Pagination } from "../components/Pagination";
import { LoadingScreen } from "../components/LoadingScreen";
import { useAuth } from "../context/AuthContext";

const STATUS_BADGES = {
  winner: { label: "GANADOR", color: "bg-[#0ea5e9] text-white" },
  active: { label: "ACTIVO", color: "bg-[#23283a] text-white" },
  inactive: { label: "INACTIVO", color: "bg-[#6b7280] text-white" }
};

// Componente SortIndicator
const SortIndicator = ({ direction }) => {
  return direction === 'ascending' ? '↑' : '↓';
};

// Función para calcular el status dinámico del jugador basado en su actividad
const calculatePlayerStatus = (jugador, isWinner, winnerInfo, ultimaActividad) => {
  const now = new Date();
  const diasInactividad = new Date(ultimaActividad) ?
    Math.floor((now - new Date(ultimaActividad)) / (1000 * 60 * 60 * 24)) : 999;
  // 1. Si es ganador, status es 'winner' (prioridad más alta)
  if (isWinner) {
    return {
      status: 'winner',
      badge: 'GANADOR',
      color: 'bg-[#0ea5e9] text-white',
      description: `Ganó: ${winnerInfo?.premio || 'Premio'}`,
      premio: winnerInfo?.premio || null,
      numero_ganador: winnerInfo?.numero_ganador || null
    };
  }

  // Si es ganador, siempre tiene prioridad
  if (isWinner) {
    return {
      status: 'winner',
      badge: 'GANADOR',
      color: 'bg-[#0ea5e9] text-white',
      description: `Ganó: ${winnerInfo?.premio || 'Premio'}`,
      premio: winnerInfo?.premio || null,
      numero_ganador: winnerInfo?.numero_ganador || null
    };
  }

  // Si no hay información de tickets, mostrar como inactivo
  return {
    status: 'inactive',
    badge: 'SIN TICKETS',
    color: 'bg-gray-600 text-white',
    description: 'Sin tickets asignados',
    premio: null,
    numero_ganador: null
  };
};

export function Jugadores() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [isActive, setIsActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12); // 12 tarjetas por página
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  const { empresaId } = useAuth();

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      // Obtener todos los jugadores registrados
      const { data: registeredPlayers, error: playersError } = await supabase
        .from("t_jugadores")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("id", { ascending: false });

      if (playersError) {
        console.error("Error fetching players:", playersError);
        toast.error("Error al cargar los jugadores.");
        setLoading(false);
        return;
      }

      // Obtener ganadores
      const { data: winners, error: winnersError } = await supabase
        .from("t_ganadores")
        .select("jugador_id, premio, numero_ganador");

      if (winnersError) {
        console.error("Error fetching winners:", winnersError);
        toast.error("Error al cargar información de ganadores.");
        setLoading(false);
        return;
      }

      // Obtener tickets SOLO de rifas ACTIVAS
      // Usamos ticket_id desc y un rango amplio para asegurar capturar todo.
      const { data: tickets, error: ticketsError } = await supabase
        .from("vw_tickets")
        .select("ticket_id, jugador_id, estado_ticket, rifa_id, monto_pagado, precio_ticket, nombre_jugador, apellido_jugador, telefono, email_jugador, cedula, estado_rifa")
        .eq("empresa_id", empresaId)
        .eq("estado_rifa", "activa")
        .order('ticket_id', { ascending: false })
        .range(0, 9999);

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        toast.error("Error al cargar información de tickets.");
        setLoading(false);
        return;
      }

      // 1. Identificar jugadores registrados
      const registeredIds = new Set(registeredPlayers.map(p => p.id));
      const ghostPlayersMap = new Map();

      // 4. Procesar tickets para agrupar y encontrar fantasmas
      const ticketsPorJugador = {};

      tickets?.forEach(ticket => {
        const jId = ticket.jugador_id;
        if (!jId) return;

        // Agrupar tickets
        if (!ticketsPorJugador[jId]) {
          ticketsPorJugador[jId] = [];
        }

        // Normalizar ticket de vista a formato esperado por lógica existente (estado vs estado_ticket)
        const normalizedTicket = {
          ...ticket,
          estado: ticket.estado_ticket // La vista usa estado_ticket, la lógica usa estado
        };

        ticketsPorJugador[jId].push(normalizedTicket);

        // Si NO está en registrados y NO lo hemos procesado ya como fantasma, agregarlo
        if (!registeredIds.has(jId) && !ghostPlayersMap.has(jId)) {
          ghostPlayersMap.set(jId, {
            id: jId,
            nombre: ticket.nombre_jugador || 'Sin Nombre',
            apellido: ticket.apellido_jugador || '',
            email: ticket.email_jugador || '',
            telefono: ticket.telefono || '',
            cedula: ticket.cedula || '',
            empresa_id: empresaId,
            created_at: new Date().toISOString(), // Dummy date
            is_ghost: true // Flag para identificar visualmente si se desea
          });
        }
      });

      // 3. Unificar listas (Registrados + Fantasmas)
      const allPlayersBase = [...registeredPlayers, ...Array.from(ghostPlayersMap.values())];

      console.log('--- DEBUG INFO ---');
      console.log('Registered Players:', registeredPlayers.length);
      console.log('Total Tickets Fetched:', tickets?.length);
      console.log('Ghost Players Found:', ghostPlayersMap.size);
      console.log('Total Players Base:', allPlayersBase.length);
      console.log('Ghost Players Sample:', Array.from(ghostPlayersMap.values()).slice(0, 3));
      console.log('------------------');

      // Crear un mapa de ganadores para búsqueda rápida
      const winnersMap = new Map();
      winners.forEach(winner => {
        winnersMap.set(winner.jugador_id, winner);
      });

      // Procesar jugadores y asignar status dinámico y calcular estadísticas
      const processedPlayers = allPlayersBase.map(jugador => {
        const isWinner = winnersMap.has(jugador.id);
        const winnerInfo = winnersMap.get(jugador.id);
        const ticketsJugador = ticketsPorJugador[jugador.id] || [];

        // Calcular estadísticas manualmente
        const totalTicketsComprados = ticketsJugador.length;
        const montoTotalGastado = ticketsJugador.reduce((sum, t) => sum + (t.monto_pagado || 0), 0);
        // Opcional: Calcular deuda si se quisiera mostrar. 
        // const deuda = ticketsJugador.reduce((sum, t) => (t.estado === 'apartado') ? sum + (t.precio_ticket || 0) : sum, 0);

        // Verificar si el jugador tiene tickets
        const tieneTickets = ticketsJugador.length > 0;

        // Verificar si todos los tickets están pagados
        const todosPagados = tieneTickets &&
          ticketsJugador.every(ticket => ticket.estado === 'pagado');

        // Verificar si tiene tickets por pagar EN RIFAS ACTIVAS (Lógica del usuario)
        // Query del usuario: COUNT(CASE WHEN estado_ticket = 'apartado' THEN 1 END) > 0
        const tienePorPagar = ticketsJugador.some(ticket =>
          (ticket.estado === 'apartado' || ticket.estado === 'abonado') &&
          ticket.estado_rifa === 'activa'
        );

        // Determinar el estado del jugador
        let status = 'inactive';
        let badge = 'SIN TICKETS';
        let color = 'bg-gray-600 text-white';
        let description = 'Sin tickets asignados';

        if (isWinner) {
          status = 'winner';
          badge = 'GANADOR';
          color = 'bg-[#0ea5e9] text-white';
          description = `Ganó: ${winnerInfo?.premio || 'Premio'}`;
        } else if (todosPagados) {
          status = 'active';
          badge = 'PAGADO';
          color = 'bg-green-600 text-white';
          description = 'Todos los tickets pagados';
        } else if (tienePorPagar) {
          status = 'inactive';
          badge = 'POR PAGAR';
          color = 'bg-yellow-600 text-white';
          description = 'Tiene tickets pendientes de pago';
        }

        return {
          ...jugador,
          status,
          badge,
          color,
          description,
          // Sobrescribir o asignar estadísticas calculadas
          total_tickets_comprados: totalTicketsComprados,
          monto_total_gastado: montoTotalGastado,
          premio: isWinner ? (winnerInfo?.premio || null) : null,
          numero_ganador: isWinner ? (winnerInfo?.numero_ganador || null) : null,
          numeros_favoritos: Array.isArray(jugador.numeros_favoritos)
            ? jugador.numeros_favoritos
            : typeof jugador.numeros_favoritos === "string"
              ? jugador.numeros_favoritos.split(",").map(n => n.trim()).filter(Boolean)
              : [],
          tieneTickets,
          todosPagados,
          tienePorPagar
        };
      });

      // Filtrar solo aquellos que tienen tickets si son fantasmas? 
      // No, mostramos todo. Los fantasmas por definición tienen tickets.

      setPlayers(processedPlayers);
    } catch (error) {
      console.error("Error in fetchPlayers:", error);
      toast.error("Error inesperado al cargar los jugadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // Filtros (status y búsqueda) y ordenamiento
  useEffect(() => {
    let filtered = [...players];

    // Aplicar filtros
    if (isActive === "active") {
      filtered = filtered.filter((p) => p.todosPagados);
    } else if (isActive === "inactive") {
      filtered = filtered.filter((p) => p.tienePorPagar);
    } else if (isActive === "winner") {
      filtered = filtered.filter((p) => p.status === 'winner');
    }

    if (search.trim() !== "") {
      const normalizeText = (text) =>
        text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Divide el término de búsqueda en palabras individuales y elimina las vacías
      const searchTerms = normalizeText(search).split(' ').filter(term => term);

      filtered = filtered.filter(player => {
        const searchableString = normalizeText(
          `${player.nombre || ''} ${player.apellido || ''} ${player.email || ''} ${player.telefono || ''} ${player.cedula || ''}`
        );
        // Verifica que TODAS las palabras de búsqueda estén presentes en la información del jugador
        return searchTerms.every(term => searchableString.includes(term));
      });
    }

    // Aplicar ordenamiento
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key] || '';
        let bValue = b[sortConfig.key] || '';

        // Manejar valores numéricos
        if (sortConfig.key === 'total_tickets_comprados' || sortConfig.key === 'monto_total_gastado') {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        }

        // Manejar strings (nombre completo)
        if (sortConfig.key === 'nombre') {
          aValue = `${a.nombre} ${a.apellido || ''}`.toLowerCase();
          bValue = `${b.nombre} ${b.apellido || ''}`.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredPlayers(filtered);
    setCurrentPage(1); // Reiniciar a la primera página al filtrar u ordenar
  }, [players, isActive, search, sortConfig]);

  const totalPages = useMemo(() =>
    Math.ceil(filteredPlayers.length / pageSize) || 1,
    [filteredPlayers.length, pageSize]
  );

  const paginatedPlayers = useMemo(() => {
    if (loading) return [];
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize;
    return filteredPlayers.slice(from, to);
  }, [filteredPlayers, currentPage, pageSize, loading]);


  const handleFilter = (filter) => {
    setIsActive(filter);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, player: null });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [isPlayerModalAnimating, setIsPlayerModalAnimating] = useState(false);

  // Effect to handle URL-based modal opening
  useEffect(() => {
    const playerId = searchParams.get("player");
    if (playerId && players.length > 0) {
      const player = players.find((p) => p.id.toString() === playerId);
      if (player) {
        setSelectedPlayer(player);
        setShowPlayerModal(true);
        setTimeout(() => setIsPlayerModalAnimating(true), 10);
      }
    } else if (!playerId && showPlayerModal) {
      // If param is removed (e.g. back button), close modal
      closePlayerModal();
    }
  }, [searchParams, players]);

  // Crear o actualizar jugador
  const handleSavePlayer = async (data) => {
    if (editPlayer) {
      // Editar
      const { error } = await supabase
        .from("t_jugadores")
        .update(data)
        .eq("empresa_id", empresaId)
        .eq("id", editPlayer.id);
      if (!error) {
        toast.success("Jugador actualizado con éxito");
        fetchPlayers();
      } else {
        toast.error(`Error al actualizar el jugador: ${error.message}`);
      }
    } else {
      // Crear
      const { data: newJugador, error } = await supabase
        .from("t_jugadores")
        .insert([data])
        .select()
        .single();
      if (!error && newJugador) {
        toast.success("Jugador creado con éxito");
        fetchPlayers();
      } else {
        toast.error(`Error al crear el jugador: ${error.message}`);
      }
    }
    setModalOpen(false);
    setEditPlayer(null);
  };
  // Eliminar jugador
  const handleDeletePlayer = async () => {
    if (!confirmDelete.player) return;
    setLoading(true);
    const { error } = await supabase
      .from("t_jugadores")
      .delete()
      .eq("empresa_id", empresaId)
      .eq("id", confirmDelete.player.id);
    if (!error) {
      toast.success("Jugador eliminado con éxito");
      fetchPlayers();
    } else {
      toast.error(`Error al eliminar el jugador: ${error.message}`);
      setLoading(false);
    }
    setConfirmDelete({ open: false, player: null });
  };

  // Funciones para manejar el panel de detalles del jugador
  const handlePlayerClick = (player) => {
    setSearchParams({ player: player.id });
  };

  const closePlayerModal = () => {
    setIsPlayerModalAnimating(false);
    // Esperar a que termine la animación antes de cerrar
    setTimeout(() => {
      setShowPlayerModal(false);
      setSelectedPlayer(null);
      setSearchParams({});
    }, 300);
  };

  if (loading) {
    return <LoadingScreen message="Cargando jugadores..." />;
  }

  return (
    <div className="animate-fade-in max-md:w-full">
      <div className="flex mb-6 max-sm:flex-col min-md:flex-row min-md:items-center min-md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">Jugadores</h1>
          <p className="text-gray-400">Administra tu comunidad y rastrea la actividad de los jugadores.</p>
        </div>
        <button
          onClick={() => {
            setEditPlayer(null);
            setModalOpen(true);
          }}
          className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <PlusIcon className="w-5 h-5 inline-block mr-2" />Nuevo Jugador</button>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-8">
        {/* Barra de búsqueda */}
        <div className="relative mb-6">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar jugadores por nombre o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-[#181c24] border border-[#23283a] text-white placeholder-gray-400 focus:outline-none focus:border-[#7c3bed] focus:ring-2 focus:ring-[#7c3bed]/20 transition-all text-base"
          />
        </div>
        <div className="flex flex-1 w-full min-md:max-w-xs  gap-2 max-md:overflow-x-auto">
          <button onClick={() => handleFilter("all")} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${isActive === "all" ? "bg-[#7c3bed] text-white border-transparent" : "bg-[#23283a] text-white border-[#d54ff9]"}`}>
            Todos
          </button>
          <button onClick={() => handleFilter("active")} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${isActive === "active" ? "bg-[#7c3bed] text-white border-transparent" : "bg-[#23283a] text-white border-[#d54ff9]"}`}>
            Pagados
          </button>
          <button onClick={() => handleFilter("winner")} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${isActive === "winner" ? "bg-[#7c3bed] text-white border-transparent" : "bg-[#23283a] text-white border-[#d54ff9]"}`}>
            Ganadores
          </button>
          <button onClick={() => handleFilter("inactive")} className={`px-4 py-2 rounded-lg border text-xs font-semibold ${isActive === "inactive" ? "bg-[#7c3bed] text-white border-transparent" : "bg-[#23283a] text-white border-[#d54ff9]"}`}>
            Por Pagar
          </button>
        </div>
      </div>

      {/* Controles de Ordenamiento */}
      <div className="md:flex items-center justify-between mt-6 mb-4">
        <p className="text-sm text-gray-400">
          Mostrando <span className="font-bold text-white">{filteredPlayers.length}</span> jugadores.
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="font-semibold">Ordenar por:</span>
          <button className={`px-3 py-1 rounded-md transition-colors ${sortConfig.key === 'nombre' ? 'bg-[#23283a] text-white' : 'hover:bg-[#23283a]'}`} onClick={() => handleSort('nombre')}>
            Nombre {sortConfig.key === 'nombre' && <SortIndicator direction={sortConfig.direction} />}
          </button>
          <button className={`px-3 py-1 rounded-md transition-colors ${sortConfig.key === 'total_tickets_comprados' ? 'bg-[#23283a] text-white' : 'hover:bg-[#23283a]'}`} onClick={() => handleSort('total_tickets_comprados')}>
            Tickets {sortConfig.key === 'total_tickets_comprados' && <SortIndicator direction={sortConfig.direction} />}
          </button>
          <button className={`px-3 py-1 rounded-md transition-colors ${sortConfig.key === 'monto_total_gastado' ? 'bg-[#23283a] text-white' : 'hover:bg-[#23283a]'}`} onClick={() => handleSort('monto_total_gastado')}>
            Gastado {sortConfig.key === 'monto_total_gastado' && <SortIndicator direction={sortConfig.direction} />}
          </button>
        </div>
      </div>

      {/* Player Cards */}
      <div className="grid max-sm:grid-cols-1 max-md:grid-cols-2 min-md:grid-cols-3  gap-4">
        {paginatedPlayers.map((player) => (
          <div
            key={player.id}
            onClick={() => handlePlayerClick(player)}
            className="bg-[#141821] border border-[#23283a] rounded-xl p-4 hover:bg-[#1a1f2e] transition-colors cursor-pointer flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-[#7c3bed] to-[#d54ff9] rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {player.nombre.charAt(0)}{player.apellido?.charAt(0) || ''}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate">
                    {player.nombre} {player.apellido}
                  </h3>
                  <p className="text-sm text-gray-400 truncate">{player.telefono}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[player.status]?.color || "bg-gray-700 text-white"}`}>
                {STATUS_BADGES[player.status]?.label || 'Activo'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center border-y border-y-[#23283a] py-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Tickets</p>
                <div className="flex items-center justify-center space-x-1">
                  <TicketIcon className="w-4 h-4 text-[#7c3bed]" />
                  <span className="text-white font-semibold">{player.total_tickets_comprados || 0}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Gastado</p>
                <div className="flex items-center justify-center space-x-1">
                  <TrophyIcon className="w-4 h-4 text-[#16a249]" />
                  <span className="text-white font-semibold">${player.monto_total_gastado || 0}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button onClick={(e) => { e.stopPropagation(); setEditPlayer(player); setModalOpen(true); }} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" title="Editar jugador">
                Editar
              </button>
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, player }); }} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" title="Eliminar jugador">
                Eliminar
              </button>
            </div>
          </div>
        ))}

        {/* Estado vacío */}
        {filteredPlayers.length === 0 && !loading && (
          <div className="md:col-span-2 lg:col-span-3 xl:col-span-4 px-6 py-12 text-center">
            <div className="w-16 h-16 bg-[#23283a] rounded-full flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-white text-lg font-semibold mb-2">No se encontraron jugadores</h3>
            <p className="text-gray-400 text-sm">
              {search ? `No hay jugadores que coincidan con "${search}"` : "No hay jugadores registrados"}
            </p>
          </div>
        )}
      </div>

      {/* Paginación */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredPlayers.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        loading={loading}
      />
      <JugadorFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditPlayer(null); }}
        onSave={handleSavePlayer}
        initialData={editPlayer}
      />

      {confirmDelete.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-[#181c24] border border-[#23283a] rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#23283a]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmar Eliminación</h3>
              </div>
              <button
                onClick={() => setConfirmDelete({ open: false, player: null })}
                disabled={loading}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a] disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="text-center space-y-4">
                {/* Player Info */}
                <div className="bg-[#23283a] rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                      <span className="text-red-500 font-bold text-lg">
                        {confirmDelete.player?.nombre?.charAt(0)}{confirmDelete.player?.apellido?.charAt(0)}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-white font-semibold">
                        {confirmDelete.player?.nombre} {confirmDelete.player?.apellido}
                      </p>
                      <p className="text-gray-400 text-sm">{confirmDelete.player?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 font-medium mb-2">⚠️ Esta acción es irreversible</p>
                  <p className="text-gray-300 text-sm">
                    Se eliminará permanentemente toda la información del jugador, incluyendo:
                  </p>
                  <ul className="text-gray-400 text-sm mt-2 space-y-1">
                    <li>• Datos personales y de contacto</li>
                    <li>• Números favoritos configurados</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 p-6 border-t border-[#23283a]">
              <button
                className="flex-1 bg-[#23283a] hover:bg-[#2d3748] text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setConfirmDelete({ open: false, player: null })}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                onClick={handleDeletePlayer}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    <span>Eliminar Jugador</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel lateral de detalles del jugador */}
      {showPlayerModal && selectedPlayer && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-[#181c24d8] transition-opacity duration-300"
            onClick={closePlayerModal}
          />

          {/* Panel lateral */}
          <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isPlayerModalAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#181c24]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#7c3bed] to-[#d54ff9] rounded-full flex items-center justify-center text-lg font-bold text-white">
                    {selectedPlayer.nombre?.charAt(0)}{selectedPlayer.apellido?.charAt(0)}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedPlayer.nombre} {selectedPlayer.apellido}
                  </h2>
                </div>
                <button
                  onClick={closePlayerModal}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Información Personal */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información Personal
                    </h3>

                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre completo:</span>
                        <span className="text-white font-medium">{selectedPlayer.nombre} {selectedPlayer.apellido}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{selectedPlayer.email}</span>
                      </div>

                      {selectedPlayer.telefono && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Teléfono:</span>
                          <span className="text-white">{selectedPlayer.telefono}</span>
                        </div>
                      )}

                      {selectedPlayer.cedula && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Cédula:</span>
                          <span className="text-white">{selectedPlayer.cedula}</span>
                        </div>
                      )}

                      {selectedPlayer.direccion && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400">Dirección:</span>
                          <span className="text-white text-right max-w-xs">{selectedPlayer.direccion}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[selectedPlayer.status]?.color || "bg-gray-700 text-white"}`}>
                          {STATUS_BADGES[selectedPlayer.status]?.label || 'Activo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TrophyIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Estadísticas
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#23283a] p-4 rounded-lg text-center">
                        <TicketIcon className="w-8 h-8 text-[#7c3bed] mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Tickets Comprados</p>
                        <p className="text-2xl font-bold text-white">{selectedPlayer.total_tickets_comprados || 0}</p>
                      </div>
                      <div className="bg-[#23283a] p-4 rounded-lg text-center">
                        <TrophyIcon className="w-8 h-8 text-[#16a249] mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Total Gastado</p>
                        <p className="text-2xl font-bold text-white">${selectedPlayer.monto_total_gastado || 0}</p>
                      </div>
                    </div>
                  </div>


                  {/* DEBUG PANEL - TEMPORAL */}
                  <div className="bg-red-900/50 p-4 rounded-lg mb-6 text-xs text-white font-mono break-all">
                    <p>DEBUG INFO:</p>
                    <p>Active Filter: {isActive}</p>
                    <p>Registered Players (DB): {debugInfo?.registered || 0}</p>
                    <p>Tickets Fetched (View): {debugInfo?.tickets || 0}</p>
                    <p>Ghost Players Detected: {debugInfo?.ghosts || 0}</p>
                    <p>Total Players Processed: {debugInfo?.total || 0}</p>
                    <p>Filtered Count: {filteredPlayers.length}</p>
                    <p>Search Query: "{search}"</p>
                  </div>

                  {/* Números Favoritos */}
                  {selectedPlayer.numeros_favoritos && selectedPlayer.numeros_favoritos.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <StarIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                        Números Favoritos
                      </h3>

                      <div className="bg-[#23283a] rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedPlayer.numeros_favoritos.map((num, index) => (
                            <span key={index} className="bg-[#7c3bed] text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold">
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4">Acciones</h3>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setEditPlayer(selectedPlayer);
                          setModalOpen(true);
                          closePlayerModal();
                        }}
                        className="flex-1 bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Editar Jugador</span>
                      </button>
                      <button
                        onClick={() => {
                          setConfirmDelete({ open: true, player: selectedPlayer });
                          closePlayerModal();
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Jugadores;