import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, NavLink } from "react-router-dom";
import { toPng, toBlob } from "html-to-image";
import { ArrowLeftIcon, Cog6ToothIcon, TicketIcon, XMarkIcon, UserIcon, CreditCardIcon, MagnifyingGlassIcon, EnvelopeIcon, PhoneIcon, PaperAirplaneIcon, ArrowDownTrayIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import JugadorFormModal from "../components/JugadorFormModal";

export function DetalleRifa() {
  const { id } = useParams();
  const [rifa, setRifa] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true); // Start with loading true for initial fetch

  // Wizard modal states
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [jugadores, setJugadores] = useState([]);
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
  const [jugadorSearchQuery, setJugadorSearchQuery] = useState("");
  const [selectedJugador, setSelectedJugador] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [customNumero, setCustomNumero] = useState("");
  const [singleCustomNumberInput, setSingleCustomNumberInput] = useState("");
  const [generatedTicketInfo, setGeneratedTicketInfo] = useState(null);
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [referenciaPago, setReferenciaPago] = useState("");
  // Ticket detail modal states
  const [showPlayerGroupModal, setShowPlayerGroupModal] = useState(false);
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);
  const [isPlayerGroupModalAnimating, setIsPlayerGroupModalAnimating] = useState(false);

  const [selectedTicketsFromMap, setSelectedTicketsFromMap] = useState([]);

  const pdfRef = useRef(); // For the map export
  const ticketRef = useRef(); // For the summary ticket download

  const numerosSeleccionados = useMemo(() => {
    const customNumbers = customNumero.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= (rifa?.total_tickets || 1000));
    return [...new Set(customNumbers)];
  }, [customNumero, rifa?.total_tickets]);

  const filteredJugadores = useMemo(() => {
    if (!jugadorSearchQuery) return jugadores;
    const query = jugadorSearchQuery.toLowerCase();
    return jugadores.filter(j =>
      `${j.nombre} ${j.apellido}`.toLowerCase().includes(query) ||
      j.email.toLowerCase().includes(query) ||
      (j.cedula && j.cedula.includes(query))
    );
  }, [jugadores, jugadorSearchQuery]);

  const handleSelectJugador = (jugador) => {
    setSelectedJugador(jugador.id);
    setJugadorSearchQuery(`${jugador.nombre} ${jugador.apellido}`);
  };

  const handleClearSelection = () => {
    setSelectedJugador("");
    setJugadorSearchQuery("");
  };

  const handleSaveNewPlayer = async (playerData) => {
    setLoading(true);
    const { data: newJugador, error } = await supabase
      .from("t_jugadores")
      .insert([playerData])
      .select()
      .single();

    if (error) {
      toast.error("Error al guardar el jugador: " + error.message);
    } else {
      toast.success("¡Jugador agregado correctamente!");
      const updatedJugadores = [...jugadores, newJugador];
      setJugadores(updatedJugadores);
      setSelectedJugador(newJugador.id);
      setShowNewPlayerModal(false);
      setWizardStep(2); // Move to number selection
    }
    setLoading(false);
  };

  // Handle keyboard shortcuts for search
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && searchQuery) {
        setSearchQuery("");
      }
      if (event.ctrlKey && event.key === 'f') {
        event.preventDefault();
        document.querySelector('input[placeholder*="Buscar"]')?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Fetch rifas info
  useEffect(() => {
    const fetchRaffle = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("t_rifas").select("*").eq("id_rifa", id).single();
      if (!error) setRifa(data);
      setLoading(false);
    };
    fetchRaffle();
  }, [id]);
  // Fetch tickets for this rifas
  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vw_tickets").select("*").eq("rifa_id", id);
    if (!error) setTickets(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchTickets(); }, [id]);

  // Fetch jugadores when opening modal
  useEffect(() => {
    if (showModal) {
      setLoading(true);
      supabase.from("vw_jugadores").select("*").then(({ data, error }) => {
        if (error) {
          toast.error("Error al cargar jugadores.");
        } else {
          setJugadores(data || []);
        }
        setLoading(false);
      });
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
  }, [selectedJugador, jugadores]);

  // Ticket stats

  // Ticket filters
  const filterOptions = [
    { key: "all", label: "Todos", color: "bg-[#7c3bed]", textColor: "text-white" },
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", textColor: "text-white" },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", textColor: "text-yellow-900" },
    { key: "pagado", label: "Pagados", color: "bg-green-500", textColor: "text-white" },
    { key: "familiares", label: "Familiares", color: "bg-purple-500", textColor: "text-white" }
  ];

  // Unified function to generate all tickets with proper status
  const generateAllTickets = () => {
    if (!rifa?.total_tickets) return [];

    // Create a Map for efficient lookups. This is much faster than .find() in a loop.
    const ticketsMap = new Map(tickets.filter((ticket) => ticket.rifa_id === id).map(t => [t.numero_ticket, t]));
    console.log(ticketsMap);
    return Array.from({ length: rifa.total_tickets }, (_, i) => {
      const numero = i + 1;
      const existingTicket = ticketsMap.get(numero);

      if (existingTicket) {
        // This ticket exists in the database, so it's occupied.
        // We use its status directly from the database to show the "true status".
        // A ticket in the DB should always have a valid status ('apartado', 'pagado', 'familiares').
        return {
          ...existingTicket,
          numero: existingTicket.numero_ticket,
          estado: existingTicket.estado_ticket, // Using the real status from the database.
        };
      } else {
        // This ticket number is not in the database, so it's available.
        return {
          numero,
          estado: "disponible",
          ticket_id: null,
          nombre_jugador: null,
          email_jugador: null,
          telefono_jugador: null,
          fecha_compra: null,
          rifa_id: rifa.id_rifa
        };
      }
    });
  };

  const allTickets = generateAllTickets();
  const ticketStatusMap = useMemo(() => new Map(allTickets.map(t => [t.numero, t.estado])), [allTickets]);
  const filteredTickets = allTickets.filter(ticket => {
    const matchesStatus = ticketFilter === "all" || ticket.estado === ticketFilter;
    const matchesSearch = !searchQuery ||
      ticket.numero.toString().includes(searchQuery) ||
      (ticket.nombre_jugador && ticket.nombre_jugador.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ticket.email_jugador && ticket.email_jugador.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    const canvas = await html2canvas(pdfRef.current);
    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = "tickets_map.png";
    link.click();
  };

  const handleProceedWithSelection = () => {
    if (selectedTicketsFromMap.length === 0) {
      toast.info("Selecciona al menos un ticket del mapa.");
      return;
    }
    setCustomNumero(selectedTicketsFromMap.join(', '));
    setShowModal(true);
    setWizardStep(1);
  };

  const handleTicketClick = (ticket) => {
    if (ticket.estado === 'disponible') {
      setSelectedTicketsFromMap(prev =>
        prev.includes(ticket.numero)
          ? prev.filter(n => n !== ticket.numero)
          : [...prev, ticket.numero]
      );
    } else {
      openTicketDetail(ticket);
    }
  };



  const openTicketDetail = (ticket) => {
    if (!ticket.jugador_id) return;

    const playerTickets = allTickets.filter(t => t.jugador_id === ticket.jugador_id);

    if (playerTickets.length === 0) return;

    setSelectedPlayerGroup({
      info: {
        nombre_jugador: ticket.nombre_jugador,
        email_jugador: ticket.email_jugador,
        telefono_jugador: ticket.telefono_jugador,
        jugador_id: ticket.jugador_id
      },
      tickets: playerTickets.sort((a, b) => a.numero - b.numero)
    });

    setSelectedTicketForDetail(ticket);

    setShowPlayerGroupModal(true);
    setTimeout(() => setIsPlayerGroupModalAnimating(true), 10);
  };
  const closePlayerGroupModal = () => {
    setIsPlayerGroupModalAnimating(false);
    setTimeout(() => {
      setShowPlayerGroupModal(false);
      setSelectedPlayerGroup(null);
      setSelectedTicketForDetail(null);
    }, 300); // Wait for animation to complete
  };

  const handleRemoveFromSelection = (numToRemove) => {
    const currentNumbers = numerosSeleccionados;
    const newNumbers = currentNumbers.filter(n => n !== numToRemove);
    setCustomNumero(newNumbers.sort((a, b) => a - b).join(', '));
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) {
      toast.error("No se encontró la referencia del ticket para descargar.");
      return;
    }
    try {
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0f131b'
      });
      const link = document.createElement('a');
      link.download = `ticket-rifa-${generatedTicketInfo?.jugador?.replace(/\s/g, '_') || 'jugador'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Error al generar la imagen del ticket:", error);
      toast.error(
        "Ocurrió un error al generar la imagen del ticket. Por favor, inténtalo de nuevo."
      );
    }
  };

  const handleCopyTicket = async () => {
    if (!ticketRef.current) {
      toast.error("No se encontró la referencia del ticket para copiar.");
      return;
    }
    try {
      const blob = await toBlob(ticketRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0f131b'
      });
      if (blob) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          toast.success('¡Imagen del ticket copiada al portapapeles!');
        } catch (copyError) {
          console.error('Error al copiar la imagen:', copyError);
          toast.error('No se pudo copiar la imagen. Tu navegador podría no ser compatible.');
        }
      }
    } catch (error) {
      toast.error("Ocurrió un error al generar la imagen para copiar.");
    }
  };

  const handleSendWhatsApp = () => {
    if (!generatedTicketInfo) return;

    const { jugador, telefono, rifa, numeros, total } = generatedTicketInfo;

    if (!telefono) {
      toast.error("Este jugador no tiene un número de teléfono registrado.");
      return;
    }

    const message = `
¡Felicidades, ${jugador}! 🎟️
Has participado en la rifa *${rifa}*.

*Tus números son:* ${numeros.join(', ')}
*Total Pagado:* $${total}

¡Mucha suerte! 🍀
    `.trim().replace(/\n/g, '%0A');

    const whatsappUrl = `https://wa.me/${telefono.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleUpdateSingleTicketStatus = async (newStatus) => {
    if (!selectedTicketForDetail) return;

    setLoading(true);
    const { ticket_id, numero } = selectedTicketForDetail;
    let updateData = { estado: newStatus };

    if (newStatus === 'disponible') {
      updateData.jugador_id = null;
    }

    const { error } = await supabase
      .from("t_tickets")
      .update(updateData)
      .eq("id", ticket_id);

    if (!error) {
      toast.success(`Ticket #${numero} actualizado a ${newStatus}`);
      fetchTickets();
      closePlayerGroupModal();
    } else {
      toast.error("Error al actualizar el ticket");
    }
    setLoading(false);
  };

  const formatTelephone = (phone) => {
    if (!phone) return "N/A";
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, "+58-$1-$2-$3");
  }

  const handleFavNumberToggle = (num) => {
    const currentNumbers = numerosSeleccionados;
    let newNumbers;
    if (currentNumbers.includes(num)) {
      newNumbers = currentNumbers.filter(n => n !== num);
    } else {
      newNumbers = [...currentNumbers, num];
    }
    setCustomNumero(newNumbers.sort((a, b) => a - b).join(', '));
  };

  const handleApartarTickets = async () => {
    setLoading(true);
    const numerosToRegister = numerosSeleccionados;

    if (numerosToRegister.length === 0) {
      toast.error("Debes seleccionar al menos un número");
      setLoading(false);
      return;
    }

    // Check if tickets are already taken from the source table
    const { data: taken, error: checkError } = await supabase
      .from("t_tickets")
      .select("numero, jugador_id")
      .eq("rifa_id", id)
      .in("numero", numerosToRegister);

    if (checkError) {
      toast.error("Error al verificar los tickets: " + checkError.message);
      setLoading(false);
      return;
    }

    if (taken && taken.length > 0) {
      const otherUserTickets = taken.filter(t => t.jugador_id !== selectedJugador);
      if (otherUserTickets.length > 0) {
        const takenNumbers = otherUserTickets.map(t => t.numero).join(', ');
        toast.error(`Los números ${takenNumbers} ya están ocupados por otro jugador. Por favor, elige otros.`);
        setLoading(false);
        setWizardStep(2); // Go back to number selection
        fetchTickets(); // Refresh tickets to show updated status
        return;
      }
      // All taken tickets belong to the current user, so they are already reserved.
      toast.info("Estos tickets ya están apartados a tu nombre. Procediendo al pago.");
      setWizardStep(4);
      setLoading(false);
      return;
    }

    // Insert tickets as 'apartado'
    const { error: insertError } = await supabase
      .from("t_tickets")
      .insert(numerosToRegister.map(numero => ({
        rifa_id: id,
        jugador_id: selectedJugador,
        numero: numero,
        estado: "apartado"
      })));

    if (!insertError) {
      toast.success(`Ticket(s) apartado(s) correctamente. Procede con el pago.`);
      fetchTickets(); // Refresh tickets in background
      setWizardStep(4); // Go to payment step
    } else {
      toast.error("Error al apartar los tickets: " + insertError.message);
    }
    setLoading(false);
  };

  const handleConfirmarPago = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("t_tickets")
      .update({ estado: "pagado" })
      .eq("rifa_id", id)
      .eq("jugador_id", selectedJugador)
      .in("numero", numerosSeleccionados);

    if (!error) {
      const jugador = jugadores.find(j => j.id == selectedJugador);
      toast.success(`Pago confirmado para ${jugador?.nombre}`);
      fetchTickets(); // Refresh tickets in background

      // Prepare data for the summary ticket
      setGeneratedTicketInfo({
        jugador: `${jugador.nombre} ${jugador.apellido}`,
        telefono: jugador.telefono,
        rifa: rifa?.nombre,
        numeros: numerosSeleccionados,
        total: (rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2),
        metodoPago: metodoPago,
        referencia: referenciaPago || 'N/A',
        fecha: new Date()
      });

      setWizardStep(6); // Go to summary ticket view
    } else {
      toast.error("Error al confirmar el pago: " + error.message);
    }
    setLoading(false);
  };

  const handleSelectAllFavoritos = () => {
    const currentNumbers = numerosSeleccionados;

    const unavailable = favoritos.filter(num => ticketStatusMap.get(num) !== 'disponible');
    const available = favoritos.filter(num => ticketStatusMap.get(num) === 'disponible');

    if (unavailable.length > 0) {
      toast.info(`Los números favoritos ${unavailable.join(', ')} no están disponibles y no se pueden seleccionar.`);
    }

    const newNumbersToAdd = available.filter(num => !currentNumbers.includes(num));

    if (newNumbersToAdd.length > 0) {
      const newSelection = [...currentNumbers, ...newNumbersToAdd].sort((a, b) => a - b);
      setCustomNumero(newSelection.join(', '));
      toast.success(`${newNumbersToAdd.length} número(s) favorito(s) agregado(s) a tu selección.`);
    } else if (available.length > 0) {
      toast.info("Todos tus favoritos disponibles ya están en la selección.");
    } else if (favoritos.length === 0) {
      toast.info("No tienes números favoritos para seleccionar.");
    }
  };

  const handleAddCustomNumber = () => {
    const num = parseInt(singleCustomNumberInput);
    if (isNaN(num) || num <= 0 || num > (rifa?.total_tickets || 1000)) {
      toast.error(`Por favor, ingresa un número válido entre 1 y ${rifa?.total_tickets || 1000}.`);
      return;
    }

    if (numerosSeleccionados.includes(num)) {
      toast.info(`El número ${num} ya está en tu selección.`);
      setSingleCustomNumberInput("");
      return;
    }

    if (ticketStatusMap.get(num) !== 'disponible') {
      toast.error(`El número ${num} no está disponible.`);
      setSingleCustomNumberInput("");
      return;
    }

    const newNumbers = [...numerosSeleccionados, num].sort((a, b) => a - b);
    setCustomNumero(newNumbers.join(', '));
    setSingleCustomNumberInput("");
  };

  const handleProceedToConfirmation = () => {
    const unavailableNumbers = numerosSeleccionados.filter(
      num => ticketStatusMap.get(num) !== 'disponible'
    );

    if (unavailableNumbers.length > 0) {
      toast.error(`Los siguientes números ya no están disponibles: ${unavailableNumbers.join(', ')}`);
      const availableNumbers = numerosSeleccionados.filter(num => !unavailableNumbers.includes(num));
      setCustomNumero(availableNumbers.sort((a, b) => a - b).join(', '));
    } else if (numerosSeleccionados.length > 0) {
      setWizardStep(3);
    } else {
      // This case should be prevented by the disabled button, but it's a good safeguard.
      toast.info("Por favor, selecciona al menos un número.");
    }
  };

  // Calculate ticket statistics correctly
  const disponibles = allTickets.filter((t) => t.estado === "disponible").length;
  const apartados = allTickets.filter((t) => t.estado === "apartado").length;
  const pagados = allTickets.filter((t) => t.estado === "pagado").length;
  const familiares = allTickets.filter((t) => t.estado === "familiares").length

  const ticketStats = [
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", count: disponibles },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", count: apartados },
    { key: "pagado", label: "Pagados", color: "bg-green-500", count: pagados },
    { key: "familiares", label: "Familiares", color: "bg-purple-500", count: familiares }
  ];
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <NavLink to="/rifas" className="flex items-center gap-2 text-[#d54ff9] hover:underline text-sm w-full">
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Rifas
        </NavLink>
      </div>
      <div className="mb-6 flex justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-center">
          {rifa?.nombre}
        </h1>

        <NavLink to={`/rifas/editar/${id}`} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#23283a] text-[#d54ff9] text-xs font-semibold">
          <Cog6ToothIcon className="w-4 h-4" />
          <span>Editar</span>
        </NavLink>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2   gap-4 mb-4">
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
      </div>

      {/* Ticket stats */}
      <div className="gap-4 mb-4 grid min-md:grid-cols-4 max-md:grid-cols-2">
        {ticketStats.map(stat => (
          <div key={stat.key} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg flex-1">
            <span className={`text-xs text-white`}>{stat.label}</span>
            <span className={`block text-2xl font-bold text-white`}>{stat.count}</span>
          </div>
        ))}
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row max-md:w-full gap-4 mb-4">
        {/* Buscador */}
        <div className="relative flex-1  max-md:w-full ">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ticket... (Ej: 123, Juan, email@ejemplo.com)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition-colors placeholder-gray-500"
            title="Busca por número de ticket, nombre del jugador o email. Usa Ctrl+F para enfocar o Escape para limpiar."
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setTicketFilter(opt.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all duration-200 ${ticketFilter === opt.key
                ? `${opt.color} ${opt.textColor} border-transparent shadow-md`
                : "bg-transparent text-gray-400 border-[#23283a] hover:border-[#7c3bed] hover:text-white"
                }`}
            >
              <span>{opt.label}</span>
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${ticketFilter === opt.key
                ? "bg-black/20"
                : "bg-[#23283a] text-gray-300"
                }`}>
                {searchQuery ? (
                  // Show filtered count when searching
                  opt.key === "all"
                    ? filteredTickets.length
                    : filteredTickets.filter(t => t.estado === opt.key).length
                ) : (
                  // Show total count when not searching
                  opt.key === "all"
                    ? allTickets.length
                    : opt.key === "disponible"
                      ? disponibles
                      : opt.key === "apartado"
                        ? apartados
                        : opt.key === "pagado"
                          ? pagados
                          : allTickets.filter(t => t.estado === "familiares").length
                )}
              </span>
            </button>
          ))}
          <div className="flex gap-2 mt-2 sm:mt-0 sm:ml-auto">
            {selectedTicketsFromMap.length > 0 ? (
              <>
                <button
                  onClick={handleProceedWithSelection}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <TicketIcon className="w-5 h-5" />
                  Registrar Selección ({selectedTicketsFromMap.length})
                </button>
                <button
                  onClick={() => setSelectedTicketsFromMap([])}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Limpiar
                </button>
              </>
            ) : (
              <button
                className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold"
                onClick={() => { setShowModal(true); setWizardStep(1); }}
              >
                Registrar Ticket
              </button>
            )}
            <button
              onClick={handleExportPDF}
              className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold"
            >
              Exportar mapa
            </button>
          </div>
        </div>

      </div>

      {/* Mapa de tickets */}
      <div ref={pdfRef} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="text-white text-lg font-bold mb-1 sm:mb-0">
              Mapa de Tickets
            </h2>
            {(searchQuery || ticketFilter !== "all") && (
              <p className="text-gray-400 text-sm">
                {searchQuery && `Buscando: "${searchQuery}" • `}
                Mostrando {filteredTickets.length} de {allTickets.length} tickets
              </p>
            )}
          </div>

          {/* Leyenda de colores */}
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#23283a] border border-[#4a5568] rounded"></div>
              <span className="text-gray-300">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 border border-yellow-500 rounded"></div>
              <span className="text-gray-300">Apartado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 border border-green-600 rounded"></div>
              <span className="text-gray-300">Pagado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 border border-purple-600 rounded opacity-75"></div>
              <span className="text-gray-300">Familiares</span>
            </div>
          </div>
        </div>

        <div className="grid max-md:grid-cols-6 max-lg:grid-cols-10 min-lg:grid-cols-15 gap-2 max-h-100 overflow-y-scroll">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.numero}
              onClick={() => handleTicketClick(ticket)}
              title={`N°${ticket.numero} - ${ticket.estado === "disponible" ? "Disponible - Haz clic para comprar"
                : ticket.estado === "apartado" ? `Apartado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                  : ticket.estado === "pagado" ? `Pagado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                    : ticket.estado === "familiares" ? "Familiares"
                      : ""
                }`}
              className={`
                w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                text-xs font-bold transition-all duration-200 transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed] hover:shadow-lg
                ${ticket.estado === "disponible" ? "bg-[#23283a] text-white hover:bg-[#2d3748] border border-[#4a5568]" : ""}
                ${ticket.estado === "apartado" ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md border border-yellow-500" : ""}
                ${ticket.estado === "pagado" ? "bg-green-500 text-white hover:bg-green-400 shadow-md border border-green-600" : ""}
                ${ticket.estado === "familiares" ? "bg-purple-500 text-white hover:bg-purple-400 shadow-md border border-purple-600 opacity-75" : ""}
                ${selectedTicketsFromMap.includes(ticket.numero) ? "!bg-[#d54ff9] ring-2 ring-white" : ""}
              `}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="leading-none">{ticket.numero}</span>
                {ticket.estado !== "disponible" && (
                  <div className="w-1 h-1 bg-current rounded-full mt-0.5 opacity-60"></div>
                )}
              </div>
            </div>
          ))}

          {/* Mensaje cuando no hay resultados */}
          {filteredTickets.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-[#23283a] rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">
                No se encontraron tickets
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {searchQuery
                  ? `No hay tickets que coincidan con "${searchQuery}"`
                  : `No hay tickets con el estado "${filterOptions.find(f => f.key === ticketFilter)?.label}"`
                }
              </p>
              {(searchQuery || ticketFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setTicketFilter("all");
                  }}
                  className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Wizard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className={`bg-[#181c24] border border-[#23283a] rounded-xl w-full ${wizardStep === 4 ? 'max-w-lg p-6' : wizardStep === 5 ? 'max-w-4xl p-0' : wizardStep === 6 ? 'max-w-md p-6' : wizardStep === 7 ? 'max-w-2xl p-6' : 'max-w-lg p-6'} shadow-2xl relative transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]`}>
            <button
              onClick={() => {
                setShowModal(false);
                setJugadorSearchQuery("");
                setSelectedJugador(""); setCustomNumero("");
                setGeneratedTicketInfo(null);
                setWizardStep(1);
                setSelectedTicketsFromMap([]);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a] z-10"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            {/* Paso 1: Selección de jugador */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Selecciona un jugador</h2>
                  <p className="text-gray-400 text-sm">Elige el jugador que comprará el ticket</p>
                </div>

                <div className="space-y-4 relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar jugador por nombre, email o cédula..."
                      value={jugadorSearchQuery}
                      onChange={(e) => {
                        setJugadorSearchQuery(e.target.value);
                        if (selectedJugador) {
                          setSelectedJugador("");
                        }
                      }}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#23283a] border border-[#2d3748] text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                    />
                  </div>
                  {jugadorSearchQuery && !selectedJugador && (
                    <div className="absolute top-full left-0 right-0 z-10 max-h-60 overflow-y-auto bg-[#23283a] border border-[#2d3748] rounded-lg mt-1 shadow-lg">
                      {loading && <div className="p-4 text-center text-gray-400">Buscando...</div>}
                      {!loading && filteredJugadores.length > 0 ? (
                        filteredJugadores.map(j => (
                          <div
                            key={j.id}
                            onClick={() => handleSelectJugador(j)}
                            className="px-4 py-3 hover:bg-[#7c3bed] cursor-pointer transition-colors border-b border-[#2d3748] last:border-b-0"
                          >
                            <p className="text-white font-medium">{j.nombre} {j.apellido}</p>
                            <p className="text-sm text-gray-400">{j.email}</p>
                          </div>
                        ))
                      ) : (
                        !loading && <div className="px-4 py-3 text-gray-400">No se encontraron jugadores.</div>
                      )}
                    </div>
                  )}
                  {selectedJugador && (
                    <div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 flex items-center justify-between mt-2">
                      <p className="text-white font-medium">{jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}</p>
                      <button onClick={handleClearSelection} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/20"><XMarkIcon className="w-5 h-5" /></button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    onClick={() => setShowNewPlayerModal(true)}
                    className="bg-[#4CAF50] hover:bg-[#3e8e41] text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Agregar jugador
                  </button>
                  <button
                    disabled={!selectedJugador}
                    onClick={() => setWizardStep(numerosSeleccionados.length > 0 ? 3 : 2)}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            )}

            {/* Paso 2: Selección de número */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Elige tus números</h2>
                  <p className="text-gray-400 text-sm">Selecciona los números favoritos o ingresa números personalizados</p>
                </div>

                <div className="space-y-4">
                  {favoritos.length > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-sm font-medium text-gray-300">Números favoritos</label>
                        <button
                          onClick={handleSelectAllFavoritos}
                          className="text-xs bg-[#23283a] hover:bg-[#7c3bed] px-3 py-1 rounded-md transition-colors"
                          disabled={favoritos.length === 0}
                        >
                          Marcar todos
                        </button>
                      </div>
                      <div className="grid grid-cols-5 gap-2 p-3 bg-[#23283a] rounded-lg max-h-32 overflow-y-auto">
                        {favoritos.map(num => (
                          <div
                            key={num}
                            onClick={() => handleFavNumberToggle(num)}
                            className={`p-2 text-center rounded-md cursor-pointer transition-all hover:scale-105 ${numerosSeleccionados.includes(num)
                              ? 'bg-[#7c3bed] text-white shadow-lg'
                              : 'bg-[#0f131b] text-gray-300 hover:bg-[#1a1f2e]'
                              }`}
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-[#181c24] text-gray-400">o</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Agregar otro número
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={singleCustomNumberInput}
                        onChange={e => setSingleCustomNumberInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomNumber(); } }}
                        placeholder={`1 - ${rifa?.total_tickets || 1000}`}
                        className="flex-1 bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomNumber}
                        className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-3 rounded-lg font-bold text-lg leading-none"
                      >+</button>
                    </div>
                  </div>

                  {numerosSeleccionados.length > 0 && (
                    <div className="pt-4 border-t border-[#2d3748]">
                      <h3 className="text-sm font-medium text-gray-300 mb-2">
                        Números seleccionados ({numerosSeleccionados.length})
                      </h3>
                      <div className="flex flex-wrap gap-2 p-3 bg-[#0f131b] rounded-lg max-h-28 overflow-y-auto">
                        {numerosSeleccionados.sort((a, b) => a - b).map((num) => (
                          <span
                            key={num}
                            className="inline-flex items-center bg-[#7c3bed] text-white px-2 py-1 rounded-md font-mono text-xs"
                          >
                            {num}
                            <button
                              type="button"
                              onClick={() => handleRemoveFromSelection(num)}
                              className="ml-1.5 text-white/70 hover:text-white font-bold"
                              title={`Quitar número ${num}`}
                            >&times;</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    disabled={numerosSeleccionados.length === 0}
                    onClick={handleProceedToConfirmation}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente
                  </button>
                </div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                </div>
              </div>
            )}

            {/* Paso 3: Confirmación */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCardIcon className="w-6 h-6 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Confirmar registro</h2>
                  <p className="text-gray-400 text-sm">Revisa los detalles antes de confirmar</p>
                </div>

                <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="w-5 h-5 text-[#7c3bed]" />
                    <div>
                      <p className="text-sm text-gray-400">Jugador</p>
                      <p className="text-white font-medium">
                        {jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <TicketIcon className="w-5 h-5 text-[#7c3bed] mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Números seleccionados</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {numerosSeleccionados.map((num, index) => (
                          <span key={index} className="bg-[#7c3bed] text-white px-2 py-1 rounded text-sm font-mono">
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CreditCardIcon className="w-5 h-5 text-[#7c3bed]" />
                    <div>
                      <p className="text-sm text-gray-400">Total a pagar</p>
                      <p className="text-white font-medium">
                        ${(rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4"><button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                >
                  Atrás
                </button>
                  <button
                    onClick={handleApartarTickets}
                    disabled={loading}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Apartando...</span>
                      </>
                    ) : (
                      <span>Apartar y Proceder al Pago</span>
                    )}
                  </button>
                </div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                </div>

              </div>
            )}

            {/* Paso 4: Método de Pago */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCardIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Registrar Pago</h2>
                  <p className="text-gray-400 text-sm">Selecciona el método de pago y confirma.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Método de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors"
                    >
                      <option>Efectivo</option>
                      <option>Transferencia</option>
                      <option>Pago Móvil</option>
                      <option>Zelle</option>
                      <option>Otro</option>
                    </select>
                  </div>
                  {metodoPago !== 'Efectivo' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Referencia (opcional)</label>
                      <input
                        type="text"
                        value={referenciaPago}
                        onChange={(e) => setReferenciaPago(e.target.value)}
                        placeholder="Ej: 0123456789"
                        className="w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-[#23283a] rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Jugador:</span>
                    <span className="text-white font-medium">{jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Números:</span>
                    <span className="text-white font-medium">{numerosSeleccionados.length}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-300">Total:</span>
                    <span className="text-green-400">${(rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleConfirmarPago}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Confirmando...</span>
                      </>
                    ) : (
                      <span>Confirmar Pago</span>
                    )}
                  </button>
                </div>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                </div>
              </div>
            )}

            {/* Paso 6: Resumen del Ticket */}
            {wizardStep === 6 && generatedTicketInfo && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TicketIcon className="w-6 h-6 text-green-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">¡Registro Exitoso!</h2>
                  <p className="text-gray-400 text-sm">Este es el resumen de tu participación en la rifa.</p>
                </div>

                {/* Ticket Body */}
                <div ref={ticketRef} className="bg-[#0f131b] border border-[#23283a] rounded-lg p-6 space-y-4">
                  <div className="text-center border-b border-solid border-gray-600 pb-4">
                    <h3 className="text-lg font-bold text-[#7c3bed]">{generatedTicketInfo.rifa}</h3>
                    <p className="text-xs text-gray-400">Comprobante de Participación</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Jugador:</span>
                      <span className="text-white font-medium">{generatedTicketInfo.jugador}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Teléfono:</span>
                      <span className="text-white">{generatedTicketInfo.telefono || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Método de Pago:</span>
                      <span className="text-white">{generatedTicketInfo.metodoPago}</span>
                    </div>
                    {generatedTicketInfo.referencia && generatedTicketInfo.referencia !== 'N/A' && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Referencia:</span>
                        <span className="text-white">{generatedTicketInfo.referencia}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fecha:</span>
                      <span className="text-white">{generatedTicketInfo.fecha.toLocaleDateString('es-ES')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Pagado:</span>
                      <span className="text-green-400 font-bold text-base">${generatedTicketInfo.total}</span>
                    </div>
                  </div>
                  <div className="border-t border-solid border-gray-600 pt-4">
                    <p className="text-gray-400 text-sm mb-2">Números Adquiridos:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {generatedTicketInfo.numeros.map(num => (
                        <span key={num} className="bg-[#7c3bed] text-white font-mono font-bold px-3 py-1.5 rounded-md text-base">
                          {num}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-center pt-4 mt-4 border-t border-gray-700">
                    <p className="text-xs text-gray-500">¡Mucha suerte! 🍀</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button onClick={handleDownloadTicket} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2">
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    <span>Descargar</span>
                  </button>
                  <button onClick={handleCopyTicket} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2">
                    <ClipboardIcon className="w-5 h-5" />
                    <span>Copiar</span>
                  </button>
                  <button
                    onClick={handleSendWhatsApp}
                    disabled={!generatedTicketInfo?.telefono}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                    <span>WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setJugadorSearchQuery("");
                      setSelectedJugador(""); setCustomNumero("");
                      setGeneratedTicketInfo(null);
                      setWizardStep(1);
                      setSelectedTicketsFromMap([]);
                    }}
                    className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <JugadorFormModal
        isOpen={showNewPlayerModal}
        onClose={() => setShowNewPlayerModal(false)}
        onSave={handleSaveNewPlayer}
      />

      {/* Ticket Detail Modal */}
      {showPlayerGroupModal && selectedTicketForDetail && selectedPlayerGroup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-300" onClick={closePlayerGroupModal} />
          <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isPlayerGroupModalAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#0f131b]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
                    <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Detalles del Ticket #{selectedTicketForDetail.numero}</h2>
                </div>
                <button onClick={closePlayerGroupModal} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">

                  {/* Ticket Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <TicketIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información del Ticket
                    </h3>
                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Número:</span>
                        <span className="text-white font-bold text-lg">#{selectedTicketForDetail.numero}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Precio:</span>
                        <span className="text-white font-bold">${rifa?.precio_ticket}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${filterOptions.find(f => f.key === selectedTicketForDetail.estado)?.color || 'bg-gray-500'} ${filterOptions.find(f => f.key === selectedTicketForDetail.estado)?.textColor || 'text-white'}`}>
                          {selectedTicketForDetail.estado}
                        </span>
                      </div>
                      {(selectedTicketForDetail.fecha_creacion_ticket || selectedTicketForDetail.created_at) && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Fecha de compra:</span>
                          <span className="text-white text-sm">
                            {new Date(selectedTicketForDetail.fecha_creacion_ticket || selectedTicketForDetail.created_at).toLocaleString('es-ES')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información del Jugador
                    </h3>
                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre:</span>
                        <span className="text-white font-medium">{selectedPlayerGroup.info.nombre_jugador || 'No asignado'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{selectedPlayerGroup.info.email_jugador || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Teléfono:</span>
                        <span className="text-white">{formatTelephone(selectedPlayerGroup.info.telefono_jugador)}</span>
                      </div>
                    </div>
                  </div>
                  {/* Other tickets from this player */}
                  {selectedPlayerGroup.tickets.filter(t => t.numero !== selectedTicketForDetail.numero).length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Otros números de este jugador</h3>
                      <div className="bg-[#23283a] rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedPlayerGroup.tickets
                            .filter(t => t.numero !== selectedTicketForDetail.numero)
                            .map(ticket => (
                              <span key={ticket.numero} className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${filterOptions.find(f => f.key === ticket.estado)?.color || 'bg-gray-600'} ${filterOptions.find(f => f.key === ticket.estado)?.textColor || 'text-white'}`}>
                                {ticket.numero}
                              </span>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-[#23283a]">
                <h3 className="text-base font-semibold text-white mb-4">Cambiar estado del Ticket #{selectedTicketForDetail.numero}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleUpdateSingleTicketStatus("pagado")} disabled={loading || selectedTicketForDetail.estado === 'pagado'} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Pagado
                  </button>
                  <button onClick={() => handleUpdateSingleTicketStatus("apartado")} disabled={loading || selectedTicketForDetail.estado === 'apartado'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Apartado
                  </button>
                  <button onClick={() => handleUpdateSingleTicketStatus("familiares")} disabled={loading || selectedTicketForDetail.estado === 'familiares'} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Familiar
                  </button>
                  <button onClick={() => handleUpdateSingleTicketStatus("disponible")} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}