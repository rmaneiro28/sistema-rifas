import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export function Jugadores() {
  const [players, setPlayers] = useState([
    { id: 1, name: "Alex Johnson", email: "alex@example.com", joinDate: "2023-12-15", tickets: 47, spent: "$235", status: "vip" },
    { id: 2, name: "Sarah Chen", email: "sarah@example.com", joinDate: "2024-01-02", tickets: 32, spent: "$160", status: "active" },
    { id: 3, name: "Mike Rodriguez", email: "mike@example.com", joinDate: "2023-11-20", tickets: 28, spent: "$140", status: "winner" },
    { id: 4, name: "Emma Watson", email: "emma@example.com", joinDate: "2024-01-01", tickets: 25, spent: "$125", status: "active" }
  ]);

  const [filteredPlayers, setFilteredPlayers] = useState(players);
  const [isActive, setIsActive] = useState("all");

  const handleFilter = (filter) => {
    if (filter === "all") {
      setFilteredPlayers(players);
      setIsActive("all");
    } else {
      const filtered = players.filter((player) => player.status === filter);
      setFilteredPlayers(filtered);
      setIsActive(filter);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">Players</h1>
          <p className="text-gray-400 mt-1">Manage your community and track player activity.</p>
        </div>
      </div>

      <div className="flex gap-4 items-center ">
        <div className="relative flex-1 max-w-xs pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition">
          <input type="text" placeholder="Search players..." className="w-full pr-4 rounded-lg bg-[#181c24] text-white focus:outline-none focus:border-[#7c3bed] transition" />
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
        <div className="flex gap-2 ">
          <button onClick={() => handleFilter("all")} className={ isActive === "all" ? "px-4 py-2 rounded-lg bg-[#7c3bed] text-white border border-[#23283a] text-xs font-semibold" : "px-4 py-2 rounded-lg bg-[#23283a] text-white border border-[#d54ff9] text-xs font-semibold"}>
            Todos
          </button>
          <button onClick={() => handleFilter("vip")} className={ isActive === "vip" ? "px-4 py-2 rounded-lg bg-[#7c3bed] text-white border border-[#23283a] text-xs font-semibold" : "px-4 py-2 rounded-lg bg-[#23283a] text-white border border-[#d54ff9] text-xs font-semibold"}>
            Destacados
          </button>
          <button onClick={() => handleFilter("active")} className={ isActive === "active" ? "px-4 py-2 rounded-lg bg-[#7c3bed] text-white border border-[#23283a] text-xs font-semibold" : "px-4 py-2 rounded-lg bg-[#23283a] text-white border border-[#d54ff9] text-xs font-semibold"}>
            Activos
          </button>
          <button onClick={() => handleFilter("winner")} className={ isActive === "winner" ? "px-4 py-2 rounded-lg bg-[#7c3bed] text-white border border-[#23283a] text-xs font-semibold" : "px-4 py-2 rounded-lg bg-[#23283a] text-white border border-[#d54ff9] text-xs font-semibold"}>
            Ganadores
          </button>
        </div>
      </div>
      

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlayers.map((player) => (
          <div key={player.id} className="bg-[#181c24] p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-12 h-12 bg-[#7c3bed] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">{player.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{player.name}</h3>
                  <p className="text-sm text-gray-400">{player.email}</p>
                </div>
              </div>
              <span className="text-sm text-gray-400">{player.joinDate}</span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Tickets:</span>
                <span className="text-sm font-semibold text-white">{player.tickets}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400">Spent:</span>
                <span className="text-sm font-semibold text-white">{player.spent}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}