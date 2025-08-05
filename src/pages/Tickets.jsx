import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";



function Tickets() {
  const [search, setSearch] = useState("");
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    async function fetchTickets() {
      const { data, error } = await supabase
        .from("tickets")
        .select("*");
      if (!error) setTickets(data);
    }
    fetchTickets();
  }, []);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-[#d54ff9] text-3xl font-bold mb-1">Tickets</h1>
          <p className="text-gray-400">
            Track all ticket sales and manage entries.
          </p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#7c3bed] hover:bg-[#d54ff9] text-white font-semibold text-sm transition">
          <ArrowDownTrayIcon className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-xs">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
          />
        </div>
      </div>

      {/* Lista de tickets */}
      <div className="flex flex-col gap-6">
        {tickets
          .filter(
            (t) =>
              t.id.toLowerCase().includes(search.toLowerCase()) ||
              t.raffle.toLowerCase().includes(search.toLowerCase()) ||
              t.user.toLowerCase().includes(search.toLowerCase())
          )
          .map((ticket) => (
            <div
              key={ticket.id}
              className="bg-[#181c24] border border-[#23283a] rounded-xl flex items-center px-6 py-5 justify-between shadow"
            >
              <div className="flex items-center gap-4">
                <div className="bg-[#7c3bed]/20 rounded-lg p-3">
                  <TicketIcon className="w-7 h-7 text-[#7c3bed]" />
                </div>
                <div>
                  <div className="text-white font-bold text-base">{ticket.id}</div>
                  <div className="text-gray-400 text-sm">{ticket.raffle}</div>
                </div>
              </div>
              <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-between ml-6">
                <div className="text-right md:text-left">
                  <span className="block text-white font-semibold text-sm">
                    {ticket.user}
                  </span>
                  <span className="block text-gray-400 text-xs">
                    {ticket.date}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 md:mt-0">
                  <span className="text-green-400 font-bold text-lg">
                    {ticket.amount}
                  </span>
                  {ticket.winner && (
                    <span className="bg-[#7c3bed] text-white text-xs px-3 py-1 rounded-full font-bold">
                      Winner
                    </span>
                  )}
                  {!ticket.winner && (
                    <span className="bg-[#23283a] text-white text-xs px-3 py-1 rounded-full">
                      {ticket.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default Tickets;