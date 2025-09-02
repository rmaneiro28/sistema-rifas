import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  TicketIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  DocumentDuplicateIcon,
  PhoneIcon,
  EnvelopeIcon,
  CurrencyDollarIcon
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Tickets() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState([]);
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [rafflesList, setRafflesList] = useState([]);
  const [selectedRaffle, setSelectedRaffle] = useState("all");
  const [sortBy, setSortBy] = useState("fecha_creacion_ticket");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const [isRequestModalAnimating, setIsRequestModalAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15);
  const [totalTickets, setTotalTickets] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [activeTab, setActiveTab] = useState("tickets");

  // Debounce para la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Fetch raffles
  useEffect(() => {
    async function fetchRaffles() {
      const { data, error } = await supabase.from("vw_rifas").select("id_rifa, nombre");
      if (error) {
        console.error("Error fetching raffles:", error);
      } else {
        setRafflesList(data || []);
      }
    }
    fetchRaffles();
  }, []);

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      if (activeTab !== "tickets") return;

      setLoading(true);

      let query = supabase
        .from("vw_tickets")
        .select("*", { count: "exact" });

      if (selectedRaffle !== "all") {
        query = query.eq("rifa_id", selectedRaffle);
      }

      if (debouncedSearch) {
        query = query.or(`numero_ticket.ilike.%${debouncedSearch}%,nombre_jugador.ilike.%${debouncedSearch}%,email_jugador.ilike.%${debouncedSearch}%`);
      }

      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching tickets:", error);
      } else {
        setTickets(data || []);
        setTotalTickets(count || 0);
      }

      setLoading(false);
    }

    fetchTickets();
  }, [selectedRaffle, debouncedSearch, sortBy, sortOrder, currentPage, pageSize, activeTab]);

  // Fetch payment requests - CORREGIDO
  useEffect(() => {
    async function fetchPaymentRequests() {
      if (activeTab !== "requests") return;

      setLoadingRequests(true);
      try {
        // Primero obtenemos las solicitudes
        const { data: requests, error: requestsError } = await supabase
          .from("t_solicitudes")
          .select("*")
          .order("fecha_solicitud", { ascending: false });

        if (requestsError) throw requestsError;

        // Luego obtenemos la información de tickets para cada solicitud
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
        setPaymentRequests([]);
      }

      setLoadingRequests(false);
    }

    fetchPaymentRequests();
  }, [activeTab]);

  // Función para manejar el ordenamiento
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  // Funciones para manejar la modal de detalles del ticket
  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    setTimeout(() => setIsModalAnimating(true), 10);
  };

  const closeTicketModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => {
      setShowTicketModal(false);
      setSelectedTicket(null);
    }, 300);
  };

  // Funciones para manejar la modal de solicitud
  const openRequestModal = (request) => {
    setSelectedRequest(request);
    setShowRequestModal(true);
    setTimeout(() => setIsRequestModalAnimating(true), 10);
  };

  const closeRequestModal = () => {
    setIsRequestModalAnimating(false);
    setTimeout(() => {
      setShowRequestModal(false);
      setSelectedRequest(null);
    }, 300);
  };

  // Aprobar solicitud de pago - CORREGIDO
  const approvePaymentRequest = async (requestId, ticketId) => {
    try {
      // Actualizar el estado del ticket a "pagado"
      const { error: ticketError } = await supabase
        .from("t_tickets")
        .update({ estado: "pagado" })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // Actualizar el estado de la solicitud a "aprobado"
      const { error: requestError } = await supabase
        .from("t_solicitudes")
        .update({
          estado: "aprobado",
          fecha_resolucion: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // Actualizar la lista de solicitudes
      setPaymentRequests(prev => prev.filter(req => req.id !== requestId));

      alert("Solicitud aprobada correctamente");

    } catch (error) {
      console.error("Error approving payment request:", error);
      alert("Error al aprobar la solicitud");
    }
  };

  // Rechazar solicitud de pago - CORREGIDO
  const rejectPaymentRequest = async (requestId, ticketId) => {
    try {
      // 1. Liberar el ticket (volver a disponible)
      const { error: ticketError } = await supabase
        .from("t_tickets")
        .update({
          estado: "disponible",
          usuario_id: null
        })
        .eq("id", ticketId);

      if (ticketError) throw ticketError;

      // 2. Marcar solicitud como rechazada
      const { error: requestError } = await supabase
        .from("t_solicitudes")
        .update({
          estado: "rechazado",
          fecha_resolucion: new Date().toISOString()
        })
        .eq("id", requestId);

      if (requestError) throw requestError;

      // 3. Eliminar de la lista local
      setPaymentRequests(prev => prev.filter(req => req.id !== requestId));

      alert("Solicitud rechazada y números liberados");

    } catch (error) {
      console.error("Error rejecting payment request:", error);
      alert("Error al rechazar la solicitud");
    }
  };

  // Función para copiar al portapapeles
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const totalPages = Math.ceil(totalTickets / pageSize) || 1;

  function formatTelephone(phone) {
    if (!phone) return "N/A";
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, "+58-$1-$2-$3");
  }

  const exportCSV = () => {
    const headers = ["Ticket", "Rifa", "Jugador", "Email", "Precio", "Fecha", "Estado"];
    const csvData = tickets.map(ticket => [
      ticket.numero_ticket,
      ticket.nombre_rifa,
      ticket.nombre_jugador || "Sin asignar",
      ticket.email_jugador || "Sin email",
      ticket.precio_ticket,
      ticket.fecha_creacion_ticket ? new Date(ticket.fecha_creacion_ticket).toLocaleDateString() : "Sin fecha",
      ticket.estado || "Activo"
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(field => `"${field}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "tickets.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  // Agrega un botón para editar y eliminar un ticket
  const navigate = useNavigate();

  const handleEditTicket = (ticket) => {
    // Navega a la página de edición del ticket
    navigate(`/tickets/editar/${ticket.ticket_id}`);
  };

  const handleDeleteTicket = async (ticket) => {
    // Confirma la eliminación del ticket
    if (window.confirm(`¿Estás seguro de eliminar el ticket ${ticket.ticket_id}?`)) {
      try {
        // Elimina el ticket
        const { error } = await supabase
          .from("t_tickets")
          .delete()
          .eq("id", ticket.ticket_id);
        if (error) throw error;
        toast.success("Ticket eliminado exitosamente");
        // Actualiza la lista de tickets
        navigate("/tickets");
        setTickets(tickets.filter(t => t.ticket_id !== ticket.ticket_id));
      } catch (error) {
        toast.error("Error al eliminar el ticket", error);
        console.error("Error al eliminar el ticket:", error);
      }
    }
  };
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
          onClick={exportCSV}
          className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
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
          {paymentRequests.filter(req => req.estado === "pendiente").length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {paymentRequests.filter(req => req.estado === "pendiente").length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "tickets" ? (
        <>
          {/* Buscador y Filtro de Rifas */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
              />
            </div>
            <select
              value={selectedRaffle}
              onChange={(e) => {
                setSelectedRaffle(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
            >
              <option value="all">Todas las Rifas</option>
              {rafflesList.map((raffle) => (
                <option key={raffle.id_rifa} value={raffle.id_rifa}>
                  {raffle.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de tickets */}
          <div className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden">
            {/* Header de la tabla */}
            <div className="bg-[#0f131b] px-6 py-4 border-b border-[#23283a]">
              <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <div className="col-span-2">
                  <button
                    onClick={() => handleSort("numero_ticket")}
                    className="flex items-center space-x-1 hover:text-white transition-colors"
                  >
                    <span>Ticket</span>
                    {sortBy === "numero_ticket" && (
                      sortOrder === "asc" ?
                        <ChevronUpIcon className="w-3 h-3" /> :
                        <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
                <div className="col-span-3">Rifa</div>
                <div className="col-span-3">Jugador</div>
                <div className="col-span-2 text-center">Precio</div>
                <div className="col-span-2 text-center">
                  <button
                    onClick={() => handleSort("fecha_creacion_ticket")}
                    className="flex items-center justify-center space-x-1 hover:text-white transition-colors w-full"
                  >
                    <span>Fecha</span>
                    {sortBy === "fecha_creacion_ticket" && (
                      sortOrder === "asc" ?
                        <ChevronUpIcon className="w-3 h-3" /> :
                        <ChevronDownIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de tickets */}
            <div className="divide-y divide-[#23283a] min-h-[400px]">
              {loading && (
                <div className="flex justify-center items-center p-12">
                  <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                  <span className="ml-4 text-gray-400">Cargando tickets...</span>
                </div>
              )}

              {!loading && tickets.map((ticket) => (
                <div
                  key={ticket.ticket_id}
                  onClick={() => handleTicketClick(ticket)}
                  className="px-6 py-4 hover:bg-[#1a1f2e] transition-colors cursor-pointer"
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Número del ticket */}
                    <div className="col-span-2 flex items-center space-x-3">
                      <div className="bg-[#7c3bed]/20 rounded-lg p-2 flex-shrink-0">
                        <TicketIcon className="w-5 h-5 text-[#7c3bed]" />
                      </div>
                      <p className="text-white font-bold text-sm">#{ticket.numero_ticket}</p>
                    </div>

                    {/* Rifa */}
                    <div className="col-span-3">
                      <p className="text-white font-medium truncate">{ticket.nombre_rifa}</p>
                      <p className="text-gray-400 text-xs">ID: {ticket.rifa_id}</p>
                    </div>

                    {/* Jugador */}
                    <div className="col-span-3">
                      <p className="text-white font-medium truncate">{ticket.nombre_jugador || 'Sin asignar'}</p>
                      <p className="text-gray-400 text-xs truncate">{ticket.email_jugador || 'Sin email'}</p>
                    </div>

                    {/* Precio */}
                    <div className="col-span-2 text-center">
                      <p className="text-white font-bold">${ticket.precio_ticket}</p>
                    </div>

                    {/* Fecha de creación */}
                    <div className="col-span-2 text-center">
                      <div className="space-y-1">
                        <p className="text-white text-sm">
                          {ticket.fecha_creacion_ticket || ticket.created_at ?
                            new Date(ticket.fecha_creacion_ticket || ticket.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit'
                            }) : 'Sin fecha'
                          }
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ticket.estado === 'pagado' ? 'bg-green-500/20 text-green-400' :
                          ticket.estado === 'apartado' ? 'bg-yellow-500/20 text-yellow-400' :
                            ticket.estado === 'cancelado' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                          }`}>
                          {ticket.estado ? ticket.estado.charAt(0).toUpperCase() + ticket.estado.slice(1) : 'Activo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Estado vacío */}
            {!loading && tickets.length === 0 && (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 bg-[#23283a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <TicketIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">No se encontraron tickets</h3>
                <p className="text-gray-400 text-sm">
                  {debouncedSearch ? `No hay tickets que coincidan con "${debouncedSearch}"` : "No hay tickets disponibles para los filtros seleccionados."}
                </p>
              </div>
            )}

            {/* Paginación */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#0f131b] border-t border-[#23283a]">
              <span className="text-sm text-gray-400">
                Mostrando {tickets.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, totalTickets)} de {totalTickets} tickets
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-[#23283a] text-white border-[#7c3bed] hover:bg-[#7c3bed]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-white">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages || loading}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-[#23283a] text-white border-[#7c3bed] hover:bg-[#7c3bed]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Sección de Solicitudes de Pago - CORREGIDA */
        <div className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden">
          {/* Header de la tabla */}
          <div className="bg-[#0f131b] px-6 py-4 border-b border-[#23283a]">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">Ticket</div>
              <div className="col-span-2">Jugador</div>
              <div className="col-span-2">Rifa</div>
              <div className="col-span-2">Método</div>
              <div className="col-span-2">Referencia</div>
              <div className="col-span-2 text-center">Acciones</div>
            </div>
          </div>

          {/* Lista de solicitudes */}
          <div className="divide-y divide-[#23283a] min-h-[400px]">
            {loadingRequests && (
              <div className="flex justify-center items-center p-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                <span className="ml-4 text-gray-400">Cargando solicitudes...</span>
              </div>
            )}

            {!loadingRequests && paymentRequests.map((request) => (
              <div key={request.id} className="px-6 py-4 hover:bg-[#1a1f2e] transition-colors">
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Número del ticket */}
                  <div className="col-span-2 flex items-center space-x-3">
                    <div className="bg-[#7c3bed]/20 rounded-lg p-2 flex-shrink-0">
                      <TicketIcon className="w-5 h-5 text-[#7c3bed]" />
                    </div>
                    <p className="text-white font-bold text-sm">
                      #{request.ticket?.numero_ticket || 'N/A'}
                    </p>
                  </div>

                  {/* Jugador */}
                  <div className="col-span-2">
                    <p className="text-white font-medium truncate">
                      {request.ticket?.nombre_jugador || 'Sin asignar'}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {request.ticket?.email_jugador || 'Sin email'}
                    </p>
                  </div>

                  {/* Rifa */}
                  <div className="col-span-2">
                    <p className="text-white font-medium truncate">
                      {request.ticket?.nombre_rifa || 'Rifa no disponible'}
                    </p>
                    <p className="text-gray-400 text-xs">
                      ID: {request.ticket?.rifa_id || 'N/A'}
                    </p>
                  </div>

                  {/* Método de pago */}
                  <div className="col-span-2">
                    <p className="text-white font-medium">{request.metodo_pago}</p>
                    <p className="text-gray-400 text-xs">Monto: ${request.monto}</p>
                  </div>

                  {/* Referencia */}
                  <div className="col-span-2">
                    <p className="text-white font-mono text-sm">{request.referencia}</p>
                    {request.comprobante_url && (
                      <button
                        onClick={() => openRequestModal(request)}
                        className="text-[#7c3bed] text-xs hover:underline flex items-center mt-1"
                      >
                        <EyeIcon className="w-3 h-3 mr-1" />
                        Ver detalles
                      </button>
                    )}
                  </div>

                  {/* Estado y acciones */}
                  <div className="col-span-2 flex justify-center items-center space-x-2">
                    {request.estado === "pendiente" ? (
                      <>
                        <button
                          onClick={() => approvePaymentRequest(request.id, request.ticket_id)}
                          className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                          title="Aprobar solicitud"
                        >
                          <CheckCircleIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => rejectPaymentRequest(request.id, request.ticket_id)}
                          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                          title="Rechazar solicitud"
                        >
                          <XCircleIcon className="w-5 h-5" />
                        </button>
                        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-semibold">
                          Pendiente
                        </span>
                      </>
                    ) : request.estado === "aprobado" ? (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold">
                        Aprobado
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-semibold">
                        Rechazado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estado vacío para solicitudes */}
          {!loadingRequests && paymentRequests.length === 0 && (
            <div className="px-6 py-12 text-center">
              <div className="w-16 h-16 bg-[#23283a] rounded-full flex items-center justify-center mx-auto mb-4">
                <ClockIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">No hay solicitudes de pago</h3>
              <p className="text-gray-400 text-sm">
                No se encontraron solicitudes de pago pendientes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalles de Solicitud */}
      {showRequestModal && selectedRequest && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeRequestModal}
          />

          {/* Modal */}
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isRequestModalAnimating ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}>
            <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#0f131b]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <DocumentDuplicateIcon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-semibold text-lg">
                      Solicitud de Pago #{selectedRequest.ticket?.numero_ticket || 'N/A'}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      {new Date(selectedRequest.fecha_solicitud).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeRequestModal}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Columna izquierda - Información del cliente y pago */}
                  <div className="space-y-6">
                    {/* Información del Cliente */}
                    <div className="bg-[#23283a] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2 text-blue-400" />
                        Información del Cliente
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Nombre:</span>
                          <div className="flex items-center">
                            <span className="text-white font-medium">
                              {selectedRequest.ticket?.nombre_jugador || 'No especificado'}
                            </span>
                            <button
                              onClick={() => copyToClipboard(selectedRequest.ticket?.nombre_jugador)}
                              className="ml-2 text-gray-400 hover:text-blue-400"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {selectedRequest.ticket?.email_jugador && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 flex items-center">
                              <EnvelopeIcon className="w-4 h-4 mr-1" />
                              Email:
                            </span>
                            <div className="flex items-center">
                              <span className="text-white">{selectedRequest.ticket.email_jugador}</span>
                              <button
                                onClick={() => copyToClipboard(selectedRequest.ticket.email_jugador)}
                                className="ml-2 text-gray-400 hover:text-blue-400"
                              >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedRequest.ticket?.telefono && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 flex items-center">
                              <PhoneIcon className="w-4 h-4 mr-1" />
                              Teléfono:
                            </span>
                            <div className="flex items-center">
                              <span className="text-white">{selectedRequest.ticket.telefono}</span>
                              <button
                                onClick={() => copyToClipboard(selectedRequest.ticket.telefono)}
                                className="ml-2 text-gray-400 hover:text-blue-400"
                              >
                                <DocumentDuplicateIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información del Pago */}
                    <div className="bg-[#23283a] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center">
                        <CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-400" />
                        Información del Pago
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Método:</span>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                            {selectedRequest.metodo_pago}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Referencia:</span>
                          <div className="flex items-center">
                            <span className="text-white font-mono">{selectedRequest.referencia}</span>
                            <button
                              onClick={() => copyToClipboard(selectedRequest.referencia)}
                              className="ml-2 text-gray-400 hover:text-blue-400"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Monto pagado:</span>
                          <span className="text-white font-bold">${selectedRequest.monto}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Estado:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${selectedRequest.estado === 'pendiente' ? 'bg-yellow-500/20 text-yellow-400' :
                            selectedRequest.estado === 'aprobado' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                            {selectedRequest.estado?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Información del Ticket */}
                    <div className="bg-[#23283a] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center">
                        <TicketIcon className="w-5 h-5 mr-2 text-purple-400" />
                        Información del Ticket
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Número:</span>
                          <span className="text-white font-bold">#{selectedRequest.ticket?.numero_ticket || 'N/A'}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Rifa:</span>
                          <span className="text-white">{selectedRequest.ticket?.nombre_rifa || 'No disponible'}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Precio:</span>
                          <span className="text-white">${selectedRequest.ticket?.precio_ticket || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Observaciones */}
                    {selectedRequest.observaciones && (
                      <div className="bg-[#23283a] rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-4">Observaciones</h3>
                        <p className="text-gray-300 text-sm bg-[#2d3443] p-3 rounded-lg">
                          {selectedRequest.observaciones}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Columna derecha - Comprobante */}
                  <div className="space-y-6">
                    <div className="bg-[#23283a] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-4">Comprobante de Pago</h3>

                      {selectedRequest.comprobante_url ? (
                        <div className="space-y-4">
                          <div className="relative bg-black rounded-lg overflow-hidden border-2 border-dashed border-[#7c3bed]">
                            <img
                              src={selectedRequest.comprobante_url}
                              alt="Comprobante de pago"
                              className="w-full h-auto max-h-80 object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <div className="hidden absolute inset-0 flex items-center justify-center bg-[#1a1f2e]">
                              <div className="text-center p-4">
                                <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">No se puede cargar la imagen</p>
                                <a
                                  href={selectedRequest.comprobante_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#7c3bed] text-sm hover:underline mt-2 inline-block"
                                >
                                  Ver comprobante en nueva pestaña
                                </a>
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            <a
                              href={selectedRequest.comprobante_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 bg-[#7c3bed] hover:bg-[#6b2dcc] text-white py-2 px-4 rounded-lg text-center transition-colors"
                            >
                              Abrir en nueva pestaña
                            </a>
                            <button
                              onClick={() => copyToClipboard(selectedRequest.comprobante_url)}
                              className="bg-[#23283a] border border-[#7c3bed] text-[#7c3bed] hover:bg-[#7c3bed]/10 py-2 px-4 rounded-lg transition-colors"
                            >
                              Copiar enlace
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-[#2d3443] rounded-lg">
                          <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-400">No se ha subido comprobante</p>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="bg-[#23283a] rounded-lg p-4">
                      <h3 className="text-white font-semibold mb-4">Acciones</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            approvePaymentRequest(selectedRequest.id, selectedRequest.ticket_id);
                            closeRequestModal();
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                          <CheckCircleIcon className="w-5 h-5 mr-2" />
                          Aprobar Pago
                        </button>
                        <button
                          onClick={() => {
                            rejectPaymentRequest(selectedRequest.id, selectedRequest.ticket_id);
                            closeRequestModal();
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                          <XCircleIcon className="w-5 h-5 mr-2" />
                          Rechazar Pago
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Panel lateral de detalles del ticket */}
      {showTicketModal && selectedTicket && (
        <div>
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
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#181c24]">
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

                    {/* Información de la Rifa */}
                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <h4 className="text-white font-medium mb-2">Rifa</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre:</span>
                        <span className="text-white font-medium">{selectedTicket.nombre_rifa}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">ID:</span>
                        <span className="text-white">{selectedTicket.rifa_id}</span>
                      </div>
                    </div>

                    {/* Información del Jugador */}
                    {(selectedTicket.nombre_jugador || selectedTicket.email_jugador) && (
                      <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                        <h4 className="text-white font-medium mb-2">Jugador</h4>
                        {selectedTicket.nombre_jugador && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Nombre:</span>
                            <span className="text-white font-medium">{selectedTicket.nombre_jugador}</span>
                          </div>
                        )}
                        {selectedTicket.cedula && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Cedula de Identidad:</span>
                            <span className="text-white">{selectedTicket.cedula}</span>
                          </div>
                        )}
                        {selectedTicket.telefono && (
                          <div className="flex justify-between itemsCenter">
                            <span className="text-gray-400">Número de teléfono:</span>
                            <span className="text-white">{formatTelephone(selectedTicket.telefono)}</span>
                          </div>
                        )}
                        {selectedTicket.email_jugador && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Email:</span>
                            <span className="text-white">{selectedTicket.email_jugador}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Información adicional si existe */}
                    {selectedTicket.observaciones && (
                      <div className="bg-[#23283a] rounded-lg p-4">
                        <h4 className="text-white font-medium mb-2">Observaciones</h4>
                        <p className="text-gray-300 text-sm">{selectedTicket.observaciones}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end items-center gap-5">
                    <button className="bg-[#7c3bed] px-4 py-2 rounded-md text-white" onClick={() => handleEditTicket(selectedTicket)}>Editar</button>
                    <button className="bg-red-500 px-4 py-2 rounded-md text-white" onClick={() => handleDeleteTicket(selectedTicket)}>Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}