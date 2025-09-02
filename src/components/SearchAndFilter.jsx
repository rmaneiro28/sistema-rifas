import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export function SearchAndFilter({ search, onSearchChange, selectedRaffle, onRaffleChange, rafflesList }) {
  return (
    <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
      <div className="relative flex-1 w-full md:w-auto">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar por jugador, email o número de ticket..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
        />
      </div>
      <select
        value={selectedRaffle}
        onChange={(e) => onRaffleChange(e.target.value)}
        className="w-full md:w-auto bg-[#181c24] border border-[#23283a] text-white rounded-lg px-4 py-2 focus:outline-none focus:border-[#7c3bed] transition-colors"
      >
        <option value="all">Todas las Rifas</option>
        {rafflesList.map((raffle) => (
          <option key={raffle.id_rifa} value={raffle.id_rifa}>
            {raffle.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}