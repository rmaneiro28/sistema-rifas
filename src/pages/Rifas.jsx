import { useEffect, useState } from "react";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { NavLink } from "react-router-dom";

export function Rifas() {
  const [search, setSearch] = useState("");
  const [raffles, setRaffles] = useState([]);

  const fetchRaffles = async () => {
    const { data, error } = await supabase.from("rifas").select("*");
    if (!error) setRaffles(data);
  };

  useEffect(() => {
    fetchRaffles();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[#d54ff9] text-3xl font-bold mb-1">Rifas</h1>
          <p className="text-gray-400">
            Gestiona tus rifas y ve su rendimiento.
          </p>
        </div>
        <NavLink to="/rifas/nueva-rifa" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <PlusIcon className="w-5 h-5" />
          Crear Rifa
        </NavLink>
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
          .filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()))
          .map((raffle) => (
            <div
              key={raffle.id}
              className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden shadow-lg flex flex-col"
            >
              {/* Featured badge y estado */}
              <div className="flex justify-between items-start px-4 pt-4">
                {raffle.estado === "activa" && (
                  <span className="bg-yellow-400/90 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                    Activa
                  </span>
                )}
                <span
                  className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold text-white ${raffle.estado === "activa" ? "bg-green-400/90 text-green-900" : "bg-red-400/90 text-red-900"}`}
                >
                  {raffle.estado === "activa" ? "Activa" : "Inactiva"}
                </span>
              </div>
              {/* Icono */}
              <div className="flex-1 flex items-center justify-center py-8">
                {raffle.icon  || <TrophyIcon className="w-16 h-16 text-[#d54ff9]" />}
              </div>
              {/* Info */}
              <div className="px-6 pb-6">
                <h2 className="text-white font-bold text-lg mb-1">
                  {raffle.nombre}
                </h2>
                <p className="text-gray-400 text-sm mb-3">
                  {raffle.descripcion}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-bold text-xl">
                    {raffle.precio_ticket}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {raffle.total_tickets}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Tickets Vendidos</span>
                  <span>
                    {raffle.ticketsSold} / {raffle.total_tickets}
                  </span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-[#23283a] rounded-full h-2 mb-3">
                  <div
                    className="bg-[#7c3bed] h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        (raffle.ticketsSold / raffle.total_tickets) * 100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    <span className="mr-1">📅</span>
                    {new Date(raffle.fecha_inicio).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                  <span>
                    <span className="mr-1">👥</span>
                    {raffle.total_tickets} jugadores
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
