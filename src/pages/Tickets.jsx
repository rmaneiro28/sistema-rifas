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
  CalendarIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";

export function Tickets() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState([]);
  const [rafflesList, setRafflesList] = useState([]);
  const [selectedRaffle, setSelectedRaffle] = useState("all");
  const [sortBy, setSortBy] = useState("fecha_creacion_ticket"); // fecha_creacion_ticket, numero
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(15); // Tickets por página
  const [totalTickets, setTotalTickets] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce para la búsqueda
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1); // Resetear a la primera página con cada nueva búsqueda
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      setLoading(true);
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase.from("vw_tickets").select("*", { count: "exact" });

      if (selectedRaffle !== "all") {
        query = query.eq("rifa_id", parseInt(selectedRaffle));
      }

      if (debouncedSearch) {
        const searchTerm = debouncedSearch.trim();
        if (!isNaN(searchTerm) && searchTerm !== '') {
          query = query.eq('numero_ticket', parseInt(searchTerm));
        } else {
          query = query.or(`nombre_rifa.ilike.%${searchTerm}%,nombre_jugador.ilike.%${searchTerm}%`);
        }
      }

      query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

      const { data, error, count } = await query;
      if (error) {
        console.error("Error fetching tickets:", error);
        setTickets([]);
        setTotalTickets(0);
      } else {
        setTickets(data || []);
        setTotalTickets(count || 0);
      }
      setLoading(false);
    }
    fetchTickets();
  }, [selectedRaffle, currentPage, pageSize, sortBy, sortOrder, debouncedSearch]);

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

  // Función para manejar el ordenamiento
  const handleSort = (field) => {
    if (sortBy === field) {
      // Si ya está ordenado por este campo, cambiar dirección
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Si es un campo nuevo, ordenar descendente por defecto
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Funciones para manejar la modal de detalles
  const handleTicketClick = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    // Pequeño delay para que la animación se vea suave
    setTimeout(() => setIsModalAnimating(true), 10);
  };

  const closeTicketModal = () => {
    setIsModalAnimating(false);
    // Esperar a que termine la animación antes de cerrar
    setTimeout(() => {
      setShowTicketModal(false);
      setSelectedTicket(null);
    }, 300);
  };

  const totalPages = Math.ceil(totalTickets / pageSize) || 1;

  function formatTelephone() {
    let phone = selectedTicket.telefono;
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, "+58-$1-$2-$3");
  }
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
        <button className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <ArrowDownTrayIcon className="w-5 h-5 inline-block mr-2" />
          Exportar CSV
        </button>
      </div>

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
                onClick={() => handleSort("numero")}
                className="flex items-center space-x-1 hover:text-white transition-colors"
              >
                <span>Ticket</span>
                {sortBy === "numero" && (
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

          {!loading &&
            tickets.map((ticket) => (
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
                  <div>
                    <p className="text-white font-bold text-sm">#{ticket.numero_ticket}</p>
                  </div>
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
              {search ? `No hay tickets que coincidan con "${search}"` : "Intenta con otro filtro o crea un nuevo ticket."}
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
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#181c24]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
                    <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    Detalles del Ticket #{selectedTicket.numero_ticket}
                  </h2>
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

                      {(selectedTicket.fecha_creacion || selectedTicket.created_at) && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Fecha de creación:</span>
                          <span className="text-white">
                            {new Date(selectedTicket.fecha_creacion || selectedTicket.created_at).toLocaleDateString('es-ES', {
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
                          <div className="flex justify-between items-center">
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
                </div>

                </div>
              </div>
            </div>
        </>
      )}
    </div>
  );
}