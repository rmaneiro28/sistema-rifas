import { useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

const raffles = [
  {
    id: 1,
    title: "Premio en efectivo $500",
    description: "Transferencia directa de efectivo a tu cuenta - sin cadenas",
    price: "$500",
    ticketPrice: "$3 por boleto",
    ticketsSold: 145,
    ticketsTotal: 500,
    date: "Jan 15, 2024",
    players: 145,
    featured: true,
    status: "Activo",
    statusColor: "bg-green-500",
    statusText: "Activo",
    icon: <TrophyIcon className="w-10 h-10 text-purple-400 mx-auto" />,
  },
  {
    id: 2,
    title: "iPhone 15 Pro Max",
    description:
      "iPhone 15 Pro Max con 256GB de almacenamiento en Titanium Blue",
    price: "$1,200",
    ticketPrice: "$8 por boleto",
    ticketsSold: 89,
    ticketsTotal: 300,
    date: "Jan 12, 2024",
    players: 89,
    featured: false,
    status: "Activo",
    statusColor: "bg-green-500",
    statusText: "Activo",
    icon: <TrophyIcon className="w-10 h-10 text-purple-400 mx-auto" />,
  },
  {
    id: 3,
    title: "Premio en efectivo $500",
    description: "Transferencia directa de efectivo a tu cuenta - sin cadenas",
    price: "$500",
    ticketPrice: "$3 por boleto",
    ticketsSold: 234,
    ticketsTotal: 250,
    date: "Jan 10, 2024",
    players: 234,
    featured: false,
    status: "Finalizando",
    statusColor: "bg-orange-400",
    statusText: "Finalizando",
    icon: <TrophyIcon className="w-10 h-10 text-purple-400 mx-auto" />,
  },
];

export default function Rifas() {
  const [search, setSearch] = useState("");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#d54ff9] text-3xl font-bold mb-1">Rifas</h1>
          <p className="text-gray-400">
            Gestiona tus rifas y ve su rendimiento.
          </p>
        </div>
        <button className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Crear Rifa</span>
        </button>
      </div>

      {/* Filtros y buscador */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar rifas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
          />
        </div>
        <button className="px-4 py-2 rounded-lg bg-[#23283a] text-white border border-[#7c3bed] text-xs font-semibold">
          Todos
        </button>
        <button className="px-4 py-2 rounded-lg bg-[#23283a] text-white border border-[#d54ff9] text-xs font-semibold">
          Destacadas
        </button>
      </div>

      {/* Cards de rifas */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {raffles
          .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
          .map((raffle) => (
            <div
              key={raffle.id}
              className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden shadow-lg flex flex-col"
            >
              {/* Featured badge y estado */}
              <div className="flex justify-between items-start px-4 pt-4">
                {raffle.featured && (
                  <span className="bg-yellow-400/90 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                    Destacada
                  </span>
                )}
                <span
                  className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold text-white ${raffle.statusColor}`}
                >
                  {raffle.statusText}
                </span>
              </div>
              {/* Icono */}
              <div className="flex-1 flex items-center justify-center py-8">
                {raffle.icon}
              </div>
              {/* Info */}
              <div className="px-6 pb-6">
                <h2 className="text-white font-bold text-lg mb-1">
                  {raffle.title}
                </h2>
                <p className="text-gray-400 text-sm mb-3">
                  {raffle.description}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-bold text-xl">
                    {raffle.price}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {raffle.ticketPrice}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Tickets Vendidos</span>
                  <span>
                    {raffle.ticketsSold} / {raffle.ticketsTotal}
                  </span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-[#23283a] rounded-full h-2 mb-3">
                  <div
                    className="bg-[#7c3bed] h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (raffle.ticketsSold / raffle.ticketsTotal) * 100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    <span className="mr-1">📅</span>
                    {new Date(raffle.date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span>
                    <span className="mr-1">👥</span>
                    {raffle.players} jugadores
                  </span>
                </div>
                {/* Botones */}
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#7c3bed] text-[#7c3bed] hover:bg-[#7c3bed]/10 transition">
                    <PencilSquareIcon className="w-4 h-4" /> Editar
                  </button>
                  <button className="flex items-center justify-center px-3 py-2 rounded-lg border border-[#d54ff9] text-[#d54ff9] hover:bg-[#d54ff9]/10 transition">
                    <TrashIcon className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
