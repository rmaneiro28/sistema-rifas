import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";

export function Tickets() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState([]);

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      const { data, error } = await supabase.from("vw_tickets").select("*");
      if (error) {
        console.error("Error fetching tickets:", error);
      } else {
        setTickets(data || []);
      }
    }
    fetchTickets();
  }, []);

  // Filtro
  const filteredTickets = tickets.filter((ticket) => {
    return (
      ticket.numero_ticket.toString().includes(search) ||
      (ticket.nombre_rifa || "").toLowerCase().includes(search.toLowerCase()) ||
      (ticket.nombre_jugador || "").toLowerCase().includes(search.toLowerCase())
    );
  });
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-3xl font-bold mb-1">Tickets</h1>
          <p className="text-gray-400">
            Visualiza y gestiona todos los tickets vendidos.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#7c3bed] hover:bg-[#d54ff9] text-white font-semibold text-sm transition">
          <ArrowDownTrayIcon className="w-5 h-5" />
          Exportar CSV
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-xs">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
          />
        </div>
      </div>

      {/* Lista de tickets */}
      <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTickets.map((ticket) => (
          <div
            key={ticket.ticket_id}
            className="bg-[#181c24] border border-[#23283a] rounded-xl flex items-center px-6 py-5 justify-between shadow"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[#7c3bed]/20 rounded-lg p-3">
                <TicketIcon className="w-7 h-7 text-[#7c3bed]" />
              </div>
              <div>
                <div className="text-white font-bold text-base">
                  Ticket #{ticket.numero_ticket}
                </div>
                <div className="text-gray-400 text-sm">
                  Rifa: {ticket.nombre_rifa}
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between ml-6">
              <div className="text-right md:text-left">
                <span className="block text-white font-semibold text-sm">
                  {ticket.nombre_jugador}
                </span>
                <span className="block text-xs text-gray-400">
                  Estado: <span className={
                    ticket.estado === "pagado" ? "text-green-400"
                      : ticket.estado === "apartado" ? "text-yellow-400"
                        : ticket.estado === "cancelado" ? "text-red-400"
                          : "text-gray-400"
                  }>
                    {ticket.estado_rifa}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}
        {filteredTickets.length === 0 && (
          <div className="text-gray-400 text-center py-12">
            No se encontraron tickets.
          </div>
        )}
      </div>
    </div>
  );
}