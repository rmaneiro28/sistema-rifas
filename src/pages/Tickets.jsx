import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ClockIcon,
  XMarkIcon,
  UserIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { RequestModal } from "./../components/RequestModal";
import { Pagination } from "./../components/Pagination";
import { SearchAndFilter } from "./../components/SearchAndFilter";
import { useNavigate } from "react-router-dom";
import { LoadingScreen } from "../components/LoadingScreen";

// Utilidad para formatear números telefónicos
const formatTelephone = (phone) => {
  if (!phone) return '';
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
};

// Utilidad para formatear números de tickets
const formatTicketNumber = (number, totalTickets) => {
  if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
    return number;
  }
  const numDigits = String(totalTickets - 1).length;
  return String(number).padStart(Math.max(3, numDigits), "0");
};

// Utilidad para exportar CSV
const exportToCSV = (data, filename) => {
  const headers = ["ID Jugador", "Jugador", "Telefono", "Ticket", "Rifa", "Precio", "Fecha", "Estado"];
  const csvData = data.map(ticket => [
    ticket.jugador_id,
    ticket.nombre_jugador || "Sin asignar",
    ticket.telefono || "Sin telefono",
    ticket.numero_ticket,
    ticket.nombre_rifa,
    ticket.precio_ticket,
    ticket.fecha_creacion_ticket ? new Date(ticket.fecha_creacion_ticket).toLocaleDateString() : "Sin fecha",
    ticket.estado || "Activo"
  ]);

  const csvContent = [
    headers.join(","),
    ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function Tickets() {
  const [search, setSearch] = useState("");
  const [groupedTickets, setGroupedTickets] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [rafflesList, setRafflesList] = useState([]);
  const [selectedRaffle, setSelectedRaffle] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "nombre_jugador", direction: "asc" });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeTab, setActiveTab] = useState("tickets");
  const navigate = useNavigate();

  // Memoized values
  const filteredTickets = useMemo(() => {
    if (!groupedTickets.length) return [];

    let result = [...groupedTickets];

    // Aplicar búsqueda
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      result = result.filter(group =>
        group.nombre_jugador.toLowerCase().includes(s) ||
        (group.telefono && group.telefono.toLowerCase().includes(s)) ||
        group.tickets.some(t => String(t.numero_ticket).includes(s))
      );
    }

    // Aplicar ordenamiento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = sortConfig.key === 'total_tickets' ? a.tickets.length : a[sortConfig.key];
        const valB = sortConfig.key === 'total_tickets' ? b.tickets.length : b[sortConfig.key];

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [groupedTickets, debouncedSearch, sortConfig]);

  const paginatedGroups = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize;
    return filteredTickets.slice(from, to);
  }, [filteredTickets, currentPage, pageSize]);

  const totalPages = useMemo(() =>
    Math.ceil(filteredTickets.length / pageSize) || 1,
    [filteredTickets.length, pageSize]
  );

  const pendingRequestsCount = useMemo(() =>
    paymentRequests.filter(req => req.estado === "pendiente").length,
    [paymentRequests]
  );

  console.log(paginatedGroups)

  // Debounce para la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch raffles
  useEffect(() => {
    async function fetchRaffles() {
      const { data, error } = await supabase.from("vw_rifas").select("id_rifa, nombre");
      if (error) {
        console.error("Error fetching raffles:", error);
        toast.error("Error al cargar las rifas");
      } else {
        setRafflesList(data || []);
      }
    }
    fetchRaffles();
  }, []);

  // Fetch tickets
  const fetchAndGroupTickets = useCallback(async () => {
    if (activeTab !== "tickets") return;

    setLoading(true);

    try {
      let query = supabase.from("vw_tickets").select("*");

      if (selectedRaffle !== "all") {
        query = query.eq("rifa_id", selectedRaffle);
      }

      const { data, error } = await query;

      if (error) throw error;

      const groups = (data || []).reduce((acc, ticket) => {
        if (!ticket.jugador_id) return acc;

        const playerId = ticket.jugador_id;
        if (!acc[playerId]) {
          acc[playerId] = {
            jugador_id: ticket.jugador_id,
            nombre_jugador: ticket.nombre_jugador,
            email_jugador: ticket.email_jugador,
            telefono: ticket.telefono,
            tickets: [],
            total_gastado: 0,
          };
        }
        acc[playerId].tickets.push(ticket);
        acc[playerId].total_gastado += ticket.precio_ticket;
        return acc;
      }, {});

      setGroupedTickets(Object.values(groups));
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Error al cargar los tickets");
      setGroupedTickets([]);
    } finally {
      setLoading(false);
    }
  }
    , [activeTab, selectedRaffle]);

  useEffect(() => {
    fetchAndGroupTickets();
  }, [fetchAndGroupTickets]);

  // Fetch payment requests
  useEffect(() => {
    async function fetchPaymentRequests() {
      if (activeTab !== "requests") return;

      setLoadingRequests(true);
      try {
        const { data: requests, error: requestsError } = await supabase
          .from("t_solicitudes")
          .select("*")
          .order("fecha_solicitud", { ascending: false });

        if (requestsError) throw requestsError;

        const requestsWithDetails = await Promise.all(
          (requests || []).map(async (request) => {
            const { data: ticketData, error: ticketError } = await supabase
              .from("vw_tickets")
              .select("*")
              .eq("ticket_id", request.ticket_id)
              .single();

            if (ticketError) {
              console.error("Error fetching ticket details:", ticketError);
              return { ...request, ticket: null };
            }

            return { ...request, ticket: ticketData };
          })
        );

        setPaymentRequests(requestsWithDetails);
      } catch (error) {
        console.error("Error fetching payment requests:", error);
        toast.error("Error al cargar las solicitudes");
        setPaymentRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    }

    fetchPaymentRequests();
  }, [activeTab]);

  // Handlers
  const handleSort = useCallback((key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc"
    }));
    setCurrentPage(1);
  }, []);

  const toggleGroup = useCallback((jugadorId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [jugadorId]: !prev[jugadorId]
    }));
  }, []);

  const handleTicketClick = useCallback((ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    setTimeout(() => setIsModalAnimating(true), 10);
  }, []);

  const closeTicketModal = useCallback(() => {
    setIsModalAnimating(false);
    setTimeout(() => {
      setShowTicketModal(false);
      setSelectedTicket(null);
    }, 300);
  }, []);

  const handleEditTicket = useCallback((ticket) => {
    navigate(`/tickets/editar/${ticket.ticket_id}`);
  }, [navigate]);

  const handleDeleteTicket = useCallback(async (ticket) => {
    if (window.confirm(`¿Estás seguro de eliminar el ticket #${formatTicketNumber(ticket.numero_ticket, 1000)}?`)) {
      try {
        const { error } = await supabase.from("t_tickets").delete().eq("id", ticket.ticket_id);
        if (error) throw error;
        toast.success("Ticket eliminado exitosamente");
        closeTicketModal();
        fetchAndGroupTickets();
      } catch (error) {
        toast.error("Error al eliminar el ticket: " + error.message);
      }
    }
  }, [closeTicketModal, fetchAndGroupTickets]);

  const openRequestModal = useCallback((request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
  }, []);

  const closeRequestModal = useCallback(() => {
    setShowRequestModal(false);
    setTimeout(() => setSelectedRequest(null), 300);
  }, []);

  const approvePaymentRequest = useCallback(async (requestId, ticketId) => {
    try {
      const { error: ticketError } = await supabase
        .from("t_tickets")
        .update({ estado: "pagado" })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      const { error: requestError } = await supabase
        .from("t_solicitudes")
        .update({
          estado: "aprobado",
          fecha_resolucion: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      setPaymentRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success("Solicitud aprobada correctamente");
    } catch (error) {
      console.error("Error approving payment request:", error);
      toast.error("Error al aprobar la solicitud");
    }
  }, []);

  const rejectPaymentRequest = useCallback(async (requestId, ticketId) => {
    try {
      const { error: ticketError } = await supabase
        .from("t_tickets")
        .update({
          estado: "disponible",
          usuario_id: null
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      const { error: requestError } = await supabase
        .from("t_solicitudes")
        .update({
          estado: "rechazado",
          fecha_resolucion: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      setPaymentRequests(prev => prev.filter(req => req.id !== requestId));
      toast.success("Solicitud rechazada y números liberados");
    } catch (error) {
      console.error("Error rejecting payment request:", error);
      toast.error("Error al rechazar la solicitud");
    }
  }, []);

  const copyToClipboard = useCallback((text) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Copiado al portapapeles"),
      () => toast.error("Error al copiar")
    );
  }, []);

  const handleExportCSV = useCallback(() => {
    const allTickets = groupedTickets.flatMap(group => group.tickets);
    exportToCSV(allTickets, "tickets");
  }, [groupedTickets]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handleRowClick = (e, group) => {
    if (e.target.closest('button')) return;
    toggleGroup(group.jugador_id);
  };

  const SortIndicator = ({ direction }) => {
    if (!direction) return null;
    return direction === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex mb-6 max-sm:flex-col min-md:flex-row min-md:items-center min-md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">
            Tickets
          </h1>
          <p className="text-gray-400">
            Visualiza y gestiona todos los tickets vendidos.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
          disabled={groupedTickets.length === 0}
        >
          <ArrowDownTrayIcon className="w-5 h-5 inline-block mr-2" />
          Exportar CSV
        </button>
      </div>

      {/* Tabs para Tickets y Solicitudes */}
      <div className="mb-6 flex border-b border-[#23283a]">
        <button
          className={`px-4 py-2 font-medium text-sm ${activeTab === "tickets" ? "text-[#7c3bed] border-b-2 border-[#7c3bed]" : "text-gray-400 hover:text-white"}`}
          onClick={() => setActiveTab("tickets")}
        >
          Todos los Tickets
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm flex items-center ${activeTab === "requests" ? "text-[#7c3bed] border-b-2 border-[#7c3bed]" : "text-gray-400 hover:text-white"}`}
          onClick={() => setActiveTab("requests")}
        >
          <ClockIcon className="w-4 h-4 mr-1" />
          Solicitudes de Pago
          {pendingRequestsCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === "tickets" ? (
        <>
          <SearchAndFilter
            search={search}
            onSearchChange={setSearch}
            selectedRaffle={selectedRaffle}
            onRaffleChange={setSelectedRaffle}
            rafflesList={rafflesList}
          />
          {/* Controles de Ordenamiento */}
          <div className="md:flex items-center justify-between mt-6 mb-4">
            <p className="text-sm text-gray-400">
              Mostrando <span className="font-bold text-white">{filteredTickets.length}</span> grupos de tickets.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="font-semibold">Ordenar por:</span>
              <button className={`px-3 py-1 rounded-md transition-colors ${sortConfig.key === 'nombre_jugador' ? 'bg-[#23283a] text-white' : 'hover:bg-[#23283a]'}`} onClick={() => handleSort('nombre_jugador')}>
                Jugador {sortConfig.key === 'nombre_jugador' && <SortIndicator direction={sortConfig.direction} />}
              </button>
              <button className={`px-3 py-1 rounded-md transition-colors ${sortConfig.key === 'total_tickets' ? 'bg-[#23283a] text-white' : 'hover:bg-[#23283a]'}`} onClick={() => handleSort('total_tickets')}>
                Tickets {sortConfig.key === 'total_tickets' && <SortIndicator direction={sortConfig.direction} />}
              </button>
              <button className={`px-3 py-1 rounded-md transition-colors ${sortConfig.key === 'total_gastado' ? 'bg-[#23283a] text-white' : 'hover:bg-[#23283a]'}`} onClick={() => handleSort('total_gastado')}>
                Gastado {sortConfig.key === 'total_gastado' && <SortIndicator direction={sortConfig.direction} />}
              </button>
            </div>
          </div>

          {/* START: Responsive Ticket List */}
          <div className="mt-4 md:mt-0">
            {/* List of Tickets (Cards on mobile, Rows on desktop) */}
            {loading ? (
              <LoadingScreen message="Cargando tickets..." />
            ) : paginatedGroups.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-[#141821] border border-[#23283a] rounded-xl">No se encontraron tickets.</div>
            ) : (
              <div className="grid max-md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-4">
                {paginatedGroups.map((group) => (
                  <div key={group.jugador_id} className="bg-[#141821] border border-[#23283a] rounded-xl flex flex-col overflow-hidden transition-all duration-300 hover:border-[#7c3bed]/50 hover:shadow-lg">
                    {/* Card content */}
                    <div
                      className="p-4 cursor-pointer flex-1"
                      onClick={() => toggleGroup(group.jugador_id)}
                    >
                      {/* Top part: Player info + chevron */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4 min-w-0">
                          <div className="w-10 h-10 bg-gradient-to-tr from-[#7c3bed] to-[#d54ff9] rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                            {group.nombre_jugador.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white truncate">{group.nombre_jugador}</h3>
                            <p className="text-sm text-gray-400 truncate">{group.telefono || 'Sin telefono'}</p>
                          </div>
                        </div>
                        <div className="p-1 rounded-full hover:bg-[#23283a] transition-colors -mt-1 -mr-1 flex-shrink-0">
                          <ChevronDownIcon
                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedGroups[group.jugador_id] ? "transform rotate-180" : ""}`}
                          />
                        </div>
                      </div>

                      {/* Bottom part: Stats */}
                      <div className="mt-4 pt-4 border-t border-[#23283a] grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-400">Tickets</p>
                          <p className="text-white font-semibold">{group.tickets.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Gastado</p>
                          <p className="text-green-400 font-semibold">${group.total_gastado.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedGroups[group.jugador_id] && (
                      <div className="p-4 border-t border-[#23283a] bg-[#0f131b]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {group.tickets.map((ticket) => (
                            <div
                              key={ticket.ticket_id}
                              onClick={() => handleTicketClick(ticket)}
                              className="bg-[#23283a] p-3 rounded-lg cursor-pointer hover:bg-[#7c3bed]/20 transition-all text-center"
                            >
                              <p className="text-white font-bold text-lg">#{ticket.numero_ticket}</p>
                              <p className="text-xs text-gray-400 truncate">{ticket.nombre_rifa}</p>
                              <span
                                className={`mt-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ticket.estado === 'pagado'
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-yellow-500/20 text-yellow-400'
                                  }`}
                              >
                                {ticket.estado}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* END: Responsive Ticket List */}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredTickets.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </>
      ) : (
        <div className="mt-8">
          {loadingRequests ? (
            <div className="text-center py-12 text-gray-400">Cargando solicitudes...</div>
          ) : paymentRequests.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-[#141821] rounded-xl">
              <TicketIcon className="w-12 h-12 mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-semibold text-white">No hay solicitudes de pago</h3>
              <p className="text-sm">Actualmente no hay solicitudes pendientes.</p>
            </div>
          ) : (
            <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paymentRequests.map(request => (
                <div key={request.id} className="bg-[#141821] border border-[#23283a] rounded-xl p-5 flex flex-col justify-between shadow-lg hover:border-[#7c3bed] transition-colors">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${request.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-300' :
                        request.estado === 'aprobado' ? 'bg-green-500/20 text-green-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                        {request.estado}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(request.fecha_solicitud).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {request.ticket ? (
                      <>
                        <h3 className="text-lg font-bold text-white">Ticket #{request.ticket.numero_ticket}</h3>
                        <p className="text-sm text-gray-300 mb-1">{request.ticket.nombre_rifa}</p>
                        <div className="flex items-center text-sm text-gray-400 mt-2">
                          <UserIcon className="w-4 h-4 mr-2" />
                          <span>{request.ticket.nombre_jugador}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-red-400">Detalles del ticket no disponibles.</p>
                    )}
                    <p className="text-green-400 font-bold text-2xl mt-4">${request.ticket?.precio_ticket || '0.00'}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-[#23283a] flex gap-3">
                    <button onClick={() => openRequestModal(request)} className="w-full bg-[#23283a] hover:bg-[#2d3748] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">Ver Detalles</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <RequestModal
        isOpen={showRequestModal}
        onClose={closeRequestModal}
        request={selectedRequest}
        onApprove={approvePaymentRequest}
        onReject={rejectPaymentRequest}
        onCopy={copyToClipboard}
        formatTelephone={formatTelephone}
      />

      {/* Panel lateral de detalles del ticket */}
      {showTicketModal && selectedTicket && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-[#181c24d8] transition-opacity duration-300"
            onClick={closeTicketModal}
          />

          {/* Panel lateral */}
          <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isModalAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#0f131b]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
                    <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <div className="text-white font-semibold text-lg">
                    Detalles del Ticket #{selectedTicket.numero_ticket}
                  </div>
                </div>
                <button
                  onClick={closeTicketModal}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Información del Ticket */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TicketIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información del Ticket
                    </h3>

                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Número:</span>
                        <span className="text-white font-bold text-lg">#{selectedTicket.numero_ticket}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Precio:</span>
                        <span className="text-white font-bold">${selectedTicket.precio_ticket}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedTicket.estado === 'pagado' ? 'bg-green-500/20 text-green-400' :
                          selectedTicket.estado === 'apartado' ? 'bg-yellow-500/20 text-yellow-400' :
                            selectedTicket.estado === 'cancelado' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                          }`}>
                          {selectedTicket.estado ? selectedTicket.estado.charAt(0).toUpperCase() + selectedTicket.estado.slice(1) : 'Activo'}
                        </span>
                      </div>

                      {(selectedTicket.fecha_creacion_ticket || selectedTicket.created_at) && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Fecha de creación:</span>
                          <span className="text-white">
                            {new Date(selectedTicket.fecha_creacion_ticket || selectedTicket.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información del Jugador */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información del Jugador
                    </h3>
                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre:</span>
                        <span className="text-white font-medium">{selectedTicket.nombre_jugador || 'No asignado'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Cédula de Identidad:</span>
                        <span className="text-white">{selectedTicket.cedula || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Teléfono:</span>
                        <span className="text-white">{formatTelephone(selectedTicket.telefono)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Información de la Rifa */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TicketIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información de la Rifa
                    </h3>
                    <div className="bg-[#23283a] rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre:</span>
                        <span className="text-white font-medium">{selectedTicket.nombre_rifa}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end items-center gap-5">
                    <button className="bg-[#7c3bed] px-4 py-2 rounded-md text-white" onClick={() => handleEditTicket(selectedTicket)}>Editar</button>
                    <button className="bg-red-500 px-4 py-2 rounded-md text-white" onClick={() => handleDeleteTicket(selectedTicket)}>Eliminar</button>
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