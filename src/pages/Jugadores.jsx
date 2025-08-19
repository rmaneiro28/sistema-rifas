import { MagnifyingGlassIcon, TrophyIcon, TicketIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import JugadorFormModal from "../components/JugadorFormModal";
const STATUS_BADGES = {
  vip: { label: "VIP", color: "bg-[#a21caf] text-white" },
  active: { label: "ACTIVE", color: "bg-[#23283a] text-white" },
  winner: { label: "WINNER", color: "bg-[#0ea5e9] text-white" },
};

export function Jugadores() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [isActive, setIsActive] = useState("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("vw_jugadores")
        .select("*")
        .order("id");
      if (error) {
        console.error("Error fetching players:", error);
      } else {
        // Asegura que numeros_favoritos sea siempre un array
        setPlayers(
          data.map(j => ({
            ...j,
            numeros_favoritos: Array.isArray(j.numeros_favoritos)
              ? j.numeros_favoritos
              : typeof j.numeros_favoritos === "string"
                ? j.numeros_favoritos.split(",").map(n => n.trim()).filter(Boolean)
                : []
          }))
        );
      }
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  // Filtros (status y búsqueda)
  useEffect(() => {
    let filtered = [...players];
    if (isActive !== "all") {
      filtered = filtered.filter((p) => p.status === isActive);
    }
    if (search.trim() !== "") {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nombre.toLowerCase().includes(s) ||
          p.email.toLowerCase().includes(s)
      );
    }
    setFilteredPlayers(filtered);
  }, [players, isActive, search]);

  const handleFilter = (filter) => {
    setIsActive(filter);
  };
  const [modalOpen, setModalOpen] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, player: null });

  // Crear o actualizar jugador
const handleSavePlayer = async (data) => {
  setLoading(true);
  if (editPlayer) {
    // Editar
    const { error } = await supabase
      .from("jugadores")
      .update(data)
      .eq("id", editPlayer.id);
    if (!error) {
      setPlayers(players.map(j => (j.id === editPlayer.id ? { ...j, ...data } : j)));
    }
  } else {
    // Crear
    const { data: newJugador, error } = await supabase
      .from("jugadores")
      .insert([data])
      .select()
      .single();
    if (!error && newJugador) {
      setPlayers([newJugador, ...players]);
    }
  }
  setModalOpen(false);
  setEditPlayer(null);
  setLoading(false);
};
// Eliminar jugador
const handleDeletePlayer = async () => {
  if (!confirmDelete.player) return;
  setLoading(true);
  const { error } = await supabase
    .from("jugadores")
    .delete()
    .eq("id", confirmDelete.player.id);
  if (!error) {
    setPlayers(players.filter(j => j.id !== confirmDelete.player.id));
  }
  setConfirmDelete({ open: false, player: null });
  setLoading(false);
};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">Players</h1>
          <p className="text-gray-400 mt-1">Manage your community and track player activity.</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="flex gap-4 items-center flex-wrap justify-between">
        <div className="flex gap-2">
          <div className="relative flex-1 max-w-xs pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition">
            <input
              type="text"
              placeholder="Search players..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-4 rounded-lg bg-[#181c24] text-white focus:outline-none focus:border-[#7c3bed] transition"
            />
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="flex gap-2">
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
        <Link to="/jugadores/nuevo-jugador">
          <button className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold transition">Nuevo Jugador</button>
        </Link>
      </div>
      
      {loading && <div className="text-white py-8 text-center">Cargando jugadores...</div>}

      {/* Tarjetas de jugadores */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlayers.map((player) => (
          <div key={player.id} className="bg-[#141821] border border-[#23283a] p-6 rounded-xl shadow-md flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#7c3bed] to-[#d54ff9] rounded-full flex items-center justify-center text-xl font-bold text-white">
                  {player.nombre.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-white">{player.nombre}</h3>
                  <p className="text-xs text-gray-400">{player.email}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_BADGES[player.status]?.color || "bg-gray-700 text-white"}`}>
                {STATUS_BADGES[player.status]?.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-[#141a24] border border-[#23283a] rounded-lg p-3 flex flex-col items-center">
                <TicketIcon className="w-5 h-5 text-[#7c3bed]" />
                <span className="text-white font-bold text-lg">{player.tickets_comprados}</span>
                <span className="text-xs text-gray-400">Tickets</span>
              </div>
              <div className="bg-[#141a24] border border-[#23283a] rounded-lg p-3 flex flex-col items-center">
                <TrophyIcon className="w-5 h-5 text-[#16a249]" />
                <span className="text-white font-bold text-lg">${player.total_gastado}</span>
                <span className="text-xs text-gray-400">Spent</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-4 h-4 text-gray-400" />
                Joined {player.fecha_nacimiento}
              </span>
            </div>  
            <div className="text-xs text-gray-400 mt-1">
              # Favorite Numbers:
              <div className="flex flex-wrap gap-1 mt-1">
              {Array.isArray(player.numeros_favoritos) ? player.numeros_favoritos.map((num, i) => (
                  <span key={i} className="inline-block bg-[#23283a] text-white px-2 py-0.5 rounded-md font-mono text-xs">{num}</span>
                )) : null}
              </div>
            </div> 
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => {
                  setEditPlayer(player);
                  setModalOpen(true);
                }}
                className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  setConfirmDelete({ open: true, player });
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      <JugadorFormModal
  isOpen={modalOpen}
  onClose={() => { setModalOpen(false); setEditPlayer(null); }}
  onSave={handleSavePlayer}
  initialData={editPlayer}
/>

{confirmDelete.open && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
    <div className="bg-[#181c24] p-6 rounded-xl shadow-lg w-full max-w-sm text-center">
      <h3 className="text-lg font-bold text-white mb-2">¿Eliminar jugador?</h3>
      <p className="text-gray-300 mb-4">
        Esta acción no se puede deshacer.<br />
        <span className="font-semibold">{confirmDelete.player?.nombre} {confirmDelete.player?.apellido}</span>
      </p>
      <div className="flex justify-center gap-4">
        <button
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          onClick={() => setConfirmDelete({ open: false, player: null })}
        >
          Cancelar
        </button>
        <button
          className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg"
          onClick={handleDeletePlayer}
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}