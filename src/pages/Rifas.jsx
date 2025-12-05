import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";
import { NavLink, useNavigate } from "react-router-dom";


import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "../components/LoadingScreen";
import { ConfirmationModal } from "../components/ConfirmationModal";

export function Rifas() {
  const [search, setSearch] = useState("");
  const [raffles, setRaffles] = useState([]);
  const [filter, setFilter] = useState("all"); // all, active, finalizada
  const [loading, setLoading] = useState(true);
  const { empresaId } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [raffleToDelete, setRaffleToDelete] = useState(null);


  const fetchRaffles = async () => {
    setLoading(true);

    if (filter === "all") {
      // Obtener todas las rifas, pero ordenar: activas primero, luego finalizadas
      const { data: activeRaffles, error: activeError } = await supabase
        .from("vw_rifas")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("estado", "activa")
        .order("fecha_inicio", { ascending: false });

      const { data: finishedRaffles, error: finishedError } = await supabase
        .from("vw_rifas")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("estado", "finalizada")
        .order("fecha_inicio", { ascending: false });

      if (!activeError && !finishedError) {
        setRaffles([...(activeRaffles || []), ...(finishedRaffles || [])]);
      }
    } else if (filter === "active") {
      // Solo rifas activas ordenadas por fecha_inicio
      let query = supabase.from("vw_rifas").select("*").eq("empresa_id", empresaId).eq("estado", "activa").order("fecha_inicio", { ascending: false });
      const { data, error } = await query;
      if (!error) setRaffles(data);
    } else if (filter === "finalizada") {
      // Solo rifas finalizadas
      let query = supabase.from("vw_rifas").select("*").eq("estado", "finalizada").order("fecha_inicio", { ascending: false });
      const { data, error } = await query;
      if (!error) setRaffles(data);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRaffles();
  }, [filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleDeleteRaffle = (raffle) => {
    setRaffleToDelete(raffle);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!raffleToDelete) return;
    const { id_rifa } = raffleToDelete;

    // 1. Eliminar pagos asociados a la rifa (o a tickets de la rifa)
    // Es más seguro borrar por rifa_id si existe esa columna en t_pagos, 
    // o buscar los tickets y borrar los pagos de esos tickets.
    // Asumiendo que t_pagos tiene rifa_id o se puede borrar por tickets.
    // Revisando TicketRegistrationWizard.jsx, t_pagos tiene rifa_id.
    const { error: deletePagosError } = await supabase.from("t_pagos").delete().eq("rifa_id", id_rifa);
    if (deletePagosError) {
      console.error("Error eliminando pagos:", deletePagosError);
      toast.error("Error al eliminar los pagos asociados");
      return;
    }

    // 2. Eliminar ganadores asociados
    const { error: deleteGanadoresError } = await supabase.from("t_ganadores").delete().eq("rifa_id", id_rifa);
    if (deleteGanadoresError) {
      console.error("Error eliminando ganadores:", deleteGanadoresError);
      toast.error("Error al eliminar los ganadores asociados");
      return;
    }

    // 3. Eliminar los tickets asociados a la rifa
    const { error: deleteTicketsError } = await supabase.from("t_tickets").delete().eq("rifa_id", id_rifa);

    if (deleteTicketsError) {
      toast.error("Error al eliminar los tickets de la rifa");
      return;
    }

    // 4. Finalmente, eliminar la rifa
    const { error: deleteRaffleError } = await supabase.from("t_rifas").delete().eq("id_rifa", id_rifa);

    if (!deleteRaffleError) {
      toast.success("Rifa eliminada con éxito");
      fetchRaffles();
    } else {
      toast.error("Error al eliminar la rifa");
    }
  };

  const navigate = useNavigate();
  const handleEditRaffle = (id) => {
    navigate(`/rifas/editar/${id}`);
  };

  if (loading) {
    return <LoadingScreen message="Cargando rifas..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex mb-6 max-sm:flex-col min-md:flex-row min-md:items-center min-md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">Rifas</h1>
          <p className="text-gray-400">
            Gestiona tus rifas y ve su rendimiento.
          </p>
        </div>
        <NavLink to="/rifas/nueva-rifa" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <PlusIcon className="w-5 h-5 inline-block mr-2" />
          Crear Rifa
        </NavLink>
      </div>

      {/* Filtros y buscador */}
      <div className="max-md:grid max-md:grid-cols-1 min-md:flex gap-4 mb-8">
        <div className="relative flex-1 max-w-prose">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar rifas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold ${filter === "all" ? "bg-[#7c3bed] text-white" : "bg-[#23283a] text-white border border-[#7c3bed]"}`}
          >
            Todos
          </button>
          <button
            onClick={() => handleFilterChange("active")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold ${filter === "active" ? "bg-[#d54ff9] text-white" : "bg-[#23283a] text-white border border-[#d54ff9]"}`}
          >
            Activas
          </button>
          <button
            onClick={() => handleFilterChange("finalizada")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold ${filter === "finalizada" ? "bg-[#d54ff9] text-white" : "bg-[#23283a] text-white border border-[#d54ff9]"}`}
          >
            Finalizadas
          </button>
        </div>
      </div>

      {/* Cards de rifas */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {raffles
          .filter((r) => r.nombre.toLowerCase().includes(search.toLowerCase()))
          .map((raffle) => (
            <div
              key={raffle.id_rifa}
              className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden shadow-lg flex flex-col justify-start"
            >
              <NavLink to={`/detalle-rifa/${raffle.id_rifa}`} className="relative">
                <img src={raffle.imagen_url} alt={raffle.nombre} title={raffle.nombre} className="w-full h-48 object-cover" />
                {/* Featured badge y estado */}
                <div className="flex absolute top-4 left-4 justify-between items-start ">
                  {raffle.estado === "activa" && (
                    <span className="bg-yellow-400/90 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                      Activa
                    </span>
                  )}
                  {raffle.estado === "finalizada" && (
                    <span className="bg-red-400/90 text-red-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                      Finalizada
                    </span>
                  )}
                  {raffle.estado === "vencida" && (
                    <span className="bg-red-400/90 text-red-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                      Vencida
                    </span>
                  )}
                  {raffle.destacada && (
                    <span className="bg-green-400/90 text-green-900 text-xs font-bold px-3 py-1 rounded-full shadow">
                      Destacada
                    </span>
                  )}
                </div>
              </NavLink>

              {/* Info */}
              <div className="px-6 py-6">
                <h2 className="text-white font-bold text-lg mb-1">
                  {raffle.nombre}
                </h2>
                <p className="text-gray-400 text-sm mb-3">
                  {raffle.descripcion}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-400 font-bold text-xl">
                    ${raffle.precio_ticket}
                  </span>
                  <span className="text-gray-400 text-xs">
                    {raffle.total_tickets} boletos
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>Tickets Vendidos</span>
                  <span>
                    {raffle.tickets_vendidos ?? 0} / {raffle.total_tickets}
                  </span>
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-[#23283a] rounded-full h-2 mb-3">
                  <div
                    className="bg-[#7c3bed] h-2 rounded-full transition-all"
                    style={{
                      width: `${((raffle.tickets_vendidos ?? 0) / raffle.total_tickets) * 100
                        }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    <span className="mr-1">📅</span>
                    {raffle.fecha_inicio
                      ? new Date(raffle.fecha_inicio).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                      : ""}
                  </span>
                  <span>
                    <span className="mr-1">🏆</span>
                    {raffle.valor_premio
                      ? `${new Intl.NumberFormat().format(raffle.valor_premio)}`
                      : ""}
                  </span>
                </div>
                {/* Botones */}
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[#7c3bed] text-[#7c3bed] hover:bg-[#7c3bed]/10 transition" onClick={() => handleEditRaffle(raffle.id_rifa)}>
                    <PencilSquareIcon className="w-4 h-4" /> Editar
                  </button>
                  <button className="flex items-center justify-center px-3 py-2 rounded-lg border border-[#d54ff9] text-[#d54ff9] hover:bg-[#d54ff9]/10 transition" onClick={() => handleDeleteRaffle(raffle)}>
                    <TrashIcon className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        {raffles.length === 0 && (
          <div className="text-gray-400 ">
            No se encontraron rifas.
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={executeDelete}
        title="Eliminar Rifa"
        message={`¿Estás seguro de que deseas eliminar la rifa "${raffleToDelete?.nombre}"? Esta acción es irreversible y eliminará todos los tickets asociados.`}
        confirmPhrase="eliminar"
        confirmText="Sí, eliminar rifa"
      />
    </div>
  );
}