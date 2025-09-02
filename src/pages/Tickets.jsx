import { useEffect, useState, useMemo, useCallback } from "react";
import {
  ArrowDownTrayIcon,
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { TicketList } from "./../components/TicketList";
import { RequestList } from "./../components/RequestList";
import { RequestModal } from "./../components/RequestModal";
import { Pagination } from "./../components/Pagination";
import { SearchAndFilter } from "./../components/SearchAndFilter";
import { useNavigate } from "react-router-dom";

// Utilidad para formatear números telefónicos
const formatTelephone = (phone) => {
  if (!phone) return "N/A";
  return phone.replace(/(\d{4})(\d{3})(\d{4})/, "+58-$1-$2-$3");
};

// Utilidad para exportar CSV
const exportToCSV = (data, filename) => {
  const headers = ["ID Jugador", "Jugador", "Email", "Ticket", "Rifa", "Precio", "Fecha", "Estado"];
  const csvData = data.map(ticket => [
    ticket.jugador_id,
    ticket.nombre_jugador || "Sin asignar",
    ticket.email_jugador || "Sin email",
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
        (group.email_jugador && group.email_jugador.toLowerCase().includes(s)) ||
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
              telefono_jugador: ticket.telefono_jugador,
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
    if (window.confirm(`¿Estás seguro de eliminar el ticket #${ticket.numero_ticket}?`)) {
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

  return (
    <div>
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

          <TicketList
            loading={loading}
            paginatedGroups={paginatedGroups}
            expandedGroups={expandedGroups}
            sortConfig={sortConfig}
            onSort={handleSort}
            onToggleGroup={toggleGroup}
            onTicketClick={handleTicketClick}
            formatTelephone={formatTelephone}
          />

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
        <RequestList
          loading={loadingRequests}
          paymentRequests={paymentRequests}
          onApproveRequest={approvePaymentRequest}
          onRejectRequest={rejectPaymentRequest}
          onViewRequest={openRequestModal}
        />
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

                  {/* Información de la Rifa y Jugador */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información Adicional
                    </h3>

                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <h4 className="text-white font-medium mb-2">Rifa</h4>
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