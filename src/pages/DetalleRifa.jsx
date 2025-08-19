import { useState, useEffect, useRef } from "react";
import { useParams, NavLink } from "react-router-dom";
import html2canvas from "html2canvas";
import { ArrowLeftIcon, Cog6ToothIcon, TicketIcon } from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";

export function DetalleRifa() {
  const { id } = useParams();
  const [rifa, setRifa] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const pdfRef = useRef();

  // Wizard modal states
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [jugadores, setJugadores] = useState([]);
  const [selectedJugador, setSelectedJugador] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [selectedNumeros, setSelectedNumeros] = useState([]);
  const [customNumero, setCustomNumero] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch rifas info
  useEffect(() => {
    const fetchRaffle = async () => {
      const { data, error } = await supabase.from("vw_rifas").select("*").eq("id_rifa", id).single();
      if (!error) setRifa(data);
    };
    fetchRaffle();
  }, [id]);
  // Fetch tickets for this rifas
  const fetchTickets = async () => {
    const { data, error } = await supabase.from("vw_tickets").select("*").eq("rifa_id", id);
    if (!error) setTickets(data || []);
  };
  useEffect(() => { fetchTickets(); }, [id]);

  // Fetch jugadores when opening modal
  useEffect(() => {
    if (showModal) {
      supabase.from("vw_jugadores").select("*").then(({ data }) => setJugadores(data || []));
    }
  }, [showModal]);

  // Load favoritos when jugador changes
  useEffect(() => {
    if (selectedJugador) {
      const jugador = jugadores.find(j => j.id == selectedJugador);
      setFavoritos(jugador?.numeros_favoritos || []);
    } else {
      setFavoritos([]);
    }
    setSelectedNumeros([]);
    setCustomNumero("");
  }, [selectedJugador]);

  // Ticket stats


  // Ticket filters
  const filterOptions = [
    { key: "all", label: "Todos", color: "bg-[#23283a]" },
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]" },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400" },
    { key: "pagado", label: "Pagados", color: "bg-green-500" },
    { key: "cancelado", label: "Cancelados", color: "bg-red-400" },
  ];

  // Process tickets to include all numbers up to total_tickets
  const allTickets = rifa?.total_tickets
    ? Array.from({ length: rifa.total_tickets }, (_, i) => {
      const numero = i + 1;
      const existingTicket = tickets.find(t => t.numero === numero);
      return existingTicket || { numero, estado: "disponible" };
    })
    : [];

  // Filtered tickets for map
  const filteredTickets = ticketFilter === "all"
    ? allTickets
    : allTickets.filter(t => t.estado === ticketFilter);

  // Export ticket map to PDF
  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current);
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = "tickets_map.png";
    link.click();
  };

  // Wizard: Registrar ticket
  const handleRegistrarTicket = async () => {
    setLoading(true);
    const customNumbers = customNumero.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
    const numerosToRegister = [...new Set([...selectedNumeros, ...customNumbers])];

    if (numerosToRegister.length === 0) {
      setLoading(false);
      return;
    }

    // Verifica si el número ya está tomado
    const { data: taken } = await supabase
      .from("t_tickets")
      .select("numero")
      .eq("rifa_id", id)
      .in("numero", numerosToRegister);

    if (taken && taken.length > 0) {
      setLoading(false);
      return;
    }
    // Inserta ticket
    const ticketsToInsert = numerosToRegister.map(numero => ({
      rifa_id: id,
      jugador_id: selectedJugador,
      numero: numero,
      estado: "apartado",
    }));




    setLoading(false);
  };

  const handleTicketClick = (ticket) => {
    if (ticket.estado === 'disponible') {
      setCustomNumero(String(ticket.numero));
      setShowModal(true);
      setWizardStep(1);
    }
  };

  const handleFavNumberToggle = (num) => {
    setSelectedNumeros(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num]
    );
  };

  const handleSelectAllFavoritos = () => {
    setSelectedNumeros(favoritos);
  };


  let disponibles = allTickets.filter((t) => t.estado === "disponible").length;
  let ticketStats = [
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]" },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400" },
    { key: "pagado", label: "Pagados", color: "bg-green-500" },
    { key: "cancelado", label: "Cancelados", color: "bg-red-400" },
  ];
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
        <NavLink to="/rifas" className="flex items-center gap-2 text-[#d54ff9] hover:underline">
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Rifas
        </NavLink>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-center">
          {rifa?.nombre}
        </h1>
        <NavLink to={`/detalle-rifa/${id}/settings`} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#23283a] text-[#d54ff9] text-xs font-semibold">
          <Cog6ToothIcon className="w-4 h-4" />
        </NavLink>
      </div>

      {/* Stats */}
      <div className="grid max-md:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="flex items-center gap-4 bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Ticket Price</span>
            <span className="text-[#16a249] text-xl font-bold">$ {rifa?.precio_ticket}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <div className="flex items-center gap-2 bg-[#7c3bed]/20 p-2 rounded-lg">
            <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
          </div>
          <div className="flex flex-col">
            <span className="text-gray-400 text-xs">Tickets Sold</span>
            <span className="text-white text-xl font-bold">{tickets.length} / {rifa?.total_tickets}</span>
          </div>
        </div>
        {/* Puedes agregar más stats aquí */}
      </div>

      {/* Ticket stats */}
      <div className="flex flex-wrap gap-4 mb-4">
        {ticketStats.map(stat => (
          <div key={stat.key} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg flex-1 min-w-[180px]">
            <span className={`text-xs text-white `}>{stat.label}</span>
            <span className={`block text-2xl font-bold text-white`}>{stat.key === "disponible" ? disponibles : tickets.filter(t => t.estado === stat.key).length || 0}</span>
          </div>
        ))}
        <button
          onClick={handleExportPDF}
          className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold transition"
        >
          Exportar mapa
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            onClick={() => setTicketFilter(opt.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold border border-[#23283a] transition ${ticketFilter === opt.key ? opt.color + " text-white" : " text-gray-400"}`}
          >
            {opt.label}
          </button>
        ))}
        <button
          className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold ml-auto"
          onClick={() => { setShowModal(true); setWizardStep(1); }}
        >
          Registrar Ticket
        </button>
      </div>

      {/* Mapa de tickets */}
      <div ref={pdfRef} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg overflow-auto">
        <h2 className="text-white text-lg  p-2 rounded-lg  font-bold mb-2">
          Mapa de Tickets</h2>
        <div className="grid grid-cols-15  gap-2 max-h-100 overflow-y-scroll">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.numero}
              onClick={() => handleTicketClick(ticket)}
              title={`N°${ticket.numero} - ${ticket.estado === "disponible" ? "Disponible"
                : ticket.estado === "apartado" ? "Apartado"
                  : ticket.estado === "pagado" ? "Pagado"
                    : ticket.estado === "cancelado" ? "Cancelado"
                      : ""
                }`}
              className={`
                w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                text-xs font-bold transition transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed]
                ${ticket.estado === "disponible" ? "bg-[#23283a] text-white" : ""}
                ${ticket.estado === "apartado" ? "bg-yellow-400 text-yellow-900" : ""}
                ${ticket.estado === "pagado" ? "bg-green-500 text-white" : ""}
                ${ticket.estado === "cancelado" ? "bg-red-400 text-white" : ""}
              `}
            >
              {ticket.numero}
            </div>
          ))}
        </div>
      </div>

      {/* Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#181c24] border border-[#23283a] rounded-xl p-8 w-full max-w-md shadow-xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-2 right-3 text-gray-400 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
            {/* Paso 1: Selección de jugador */}
            {wizardStep === 1 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Selecciona un jugador</h2>
                <select
                  value={selectedJugador}
                  onChange={e => setSelectedJugador(e.target.value)}
                  className="w-full mb-6 bg-[#23283a] text-white rounded-lg px-3 py-2"
                >
                  <option value="">Selecciona jugador...</option>
                  {jugadores.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.nombre} {j.apellido} ({j.email})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <button
                    disabled={!selectedJugador}
                    onClick={() => setWizardStep(2)}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* Paso 2: Selección de número */}
            {wizardStep === 2 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Elige tus números</h2>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs text-gray-400">Números favoritos</label>
                    <button
                      onClick={handleSelectAllFavoritos}
                      className="text-xs bg-[#23283a] px-2 py-1 rounded-md hover:bg-[#7c3bed]"
                      disabled={favoritos.length === 0}
                    >
                      Marcar todos
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mb-4 p-2 bg-[#23283a] rounded-lg max-h-32 overflow-y-auto">
                    {favoritos.length > 0 ? (
                      favoritos.map(num => (
                        <div
                          key={num}
                          onClick={() => handleFavNumberToggle(num)}
                          className={`p-2 text-center rounded-md cursor-pointer ${selectedNumeros.includes(num) ? 'bg-[#7c3bed] text-white' : 'bg-[#0f131b]'}`}
                        >
                          {num}
                        </div>
                      ))
                    ) : (
                      <p className="col-span-5 text-center text-gray-500">No hay números favoritos.</p>
                    )}
                  </div>

                  <div className="text-center text-gray-400 mb-2">o</div>

                  <label className="block text-xs text-gray-400 mb-1">
                    Otros números (separados por coma)
                  </label>
                  <input
                    type="text"
                    value={customNumero}
                    onChange={e => setCustomNumero(e.target.value)}
                    placeholder="Ej: 1, 5, 12"
                    className="w-full bg-[#23283a] text-white rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-lg bg-[#23283a] text-white"
                  >
                    Atrás
                  </button>
                  <button
                    disabled={selectedNumeros.length === 0 && !customNumero}
                    onClick={() => setWizardStep(3)}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3: Confirmación */}
            {wizardStep === 3 && (
              <div>
                <h2 className="text-lg font-bold text-white mb-4">Confirmar registro</h2>
                <div className="mb-4 text-white">
                  <div><b>Jugador:</b> {jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}</div>
                  <div><b>Números:</b> {[...selectedNumeros, ...customNumero.split(',').map(n => n.trim()).filter(n => n)].join(', ')}</div>
                </div>
                <div className="flex justify-between">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 rounded-lg bg-[#23283a] text-white"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleRegistrarTicket}
                    disabled={loading}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {loading ? "Registrando..." : "Confirmar y Registrar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
