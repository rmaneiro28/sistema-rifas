import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import { ArrowLeftIcon, Cog6ToothIcon, TicketIcon, XMarkIcon, UserIcon, CalendarIcon, CreditCardIcon, MagnifyingGlassIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";

export function DetalleRifa() {
  const { id } = useParams();
  const [rifa, setRifa] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true); // Start with loading true for initial fetch
  const navigate = useNavigate();

  // Wizard modal states
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [jugadores, setJugadores] = useState([]);
  const [selectedJugador, setSelectedJugador] = useState("");
  const [favoritos, setFavoritos] = useState([]);
  const [customNumero, setCustomNumero] = useState("");
  const [singleCustomNumberInput, setSingleCustomNumberInput] = useState("");
  const [comprobantePago, setComprobantePago] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [referenciaPago, setReferenciaPago] = useState("");
  const [generatedTicketInfo, setGeneratedTicketInfo] = useState(null);
  // Ticket detail modal states
  const [showPlayerGroupModal, setShowPlayerGroupModal] = useState(false);
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState(null);
  const [isPlayerGroupModalAnimating, setIsPlayerGroupModalAnimating] = useState(false);

  // WhatsApp modal states
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppTicket, setWhatsAppTicket] = useState(null);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedTicketsFromMap, setSelectedTicketsFromMap] = useState([]);

  const ticketRef = useRef();
  const pdfRef = useRef(); // Keep this for the map export
  // New player form state
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    cedula: '',
    email: '',
    phone: '',
    street: '',
    favoriteNumbers: [],
    favInput: ''
  });

  const numerosSeleccionados = useMemo(() => {
    const customNumbers = customNumero.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0 && n <= (rifa?.total_tickets || 1000));
    return [...new Set(customNumbers)];
  }, [customNumero, rifa?.total_tickets]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAddNumber = () => {
    const num = parseInt(form.favInput);
    if (!isNaN(num) && num > 0 && num <= 1000 && !form.favoriteNumbers.includes(num)) {
      toast.success(`Número ${num} agregado a favoritos.`);
      setForm({ ...form, favoriteNumbers: [...form.favoriteNumbers, num], favInput: '' });
    } else if (isNaN(num) || num <= 0 || num > 1000) {
      toast.error("Por favor, ingresa un número válido entre 1 y 1000.");
    } else if (form.favoriteNumbers.includes(num)) {
      toast.info(`El número ${num} ya está en tu lista de favoritos.`);
    }
  };

  const handleRemoveNumber = (num) => {
    toast.info(`Número ${num} eliminado de favoritos.`);
    setForm({ ...form, favoriteNumbers: form.favoriteNumbers.filter((n) => n !== num) });
  };

  const handleSaveNewPlayer = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { firstName, lastName, cedula, email, phone, street, favoriteNumbers } = form;

    if (!firstName || !lastName || !email) {
      toast.error("Nombre, apellido y correo son obligatorios.");
      setLoading(false);
      return;
    }

    const { data: newJugador, error } = await supabase.from("t_jugadores").insert([{ nombre: firstName, apellido: lastName, cedula, email, telefono: phone, direccion: street, numeros_favoritos: favoriteNumbers, fecha_registro: new Date() }]).select().single();

    if (error) {
      toast.error("Error al guardar el jugador: " + error.message);
    } else {
      toast.success("¡Jugador agregado correctamente!");
      setJugadores(prev => [...prev, newJugador]);
      setSelectedJugador(newJugador.id);
      setWizardStep(2); // Go back to number selection
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

  const handleRegistrarTicket = async () => {
    setLoading(true);
    const numerosToRegister = numerosSeleccionados;

    if (numerosToRegister.length === 0) {
      toast.error("Debes seleccionar al menos un número");
      setLoading(false);
      return;
    }

    const { data: taken } = await supabase
      .from("vw_tickets")
      .select("numero")
      .eq("rifa_id", id)
      .in("numero", numerosToRegister);

    if (taken && taken.length > 0) {
      const takenNumbers = taken.map(t => t.numero).join(', ');
      toast.error(`Los números ${takenNumbers} ya están ocupados`);
      setLoading(false);
      return;
    }

    // Inserta ticket como apartado
    const { error } = await supabase
      .from("t_tickets")
      .insert(numerosToRegister.map(numero => ({
        rifa_id: id,
        jugador_id: selectedJugador,
        numero,
        estado: "apartado"
      })));

    if (!error) {
      const jugadorNombre = jugadores.find(j => j.id == selectedJugador)?.nombre;
      toast.success(`Ticket(s) apartado(s) exitosamente para ${jugadorNombre}`);
      fetchTickets(); // Refresh tickets in background
      setWizardStep(4); // Go to payment method selection
    } else {
      toast.error("Error al registrar el ticket. Inténtalo de nuevo.");
      setLoading(false);
    }
    setLoading(false);
  };

  // Confirmar pago con comprobante
  const handleConfirmarPago = async () => {
    setLoading(true);
    if (!comprobantePago || !selectedPaymentMethod) {
      toast.error("Por favor, selecciona un método de pago y sube un comprobante.");
      setLoading(false);
      return;
    }

    const numerosToRegister = numerosSeleccionados;

    // 1. Upload file to Supabase Storage
    const fileExt = comprobantePago.name.split('.').pop();
    const fileName = `${selectedJugador}-${Date.now()}.${fileExt}`;
    const filePath = `comprobantes/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, comprobantePago);

    if (uploadError) {
      toast.error("Error al subir el comprobante: " + uploadError.message);
      setLoading(false);
      return;
    }

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(filePath);

    const comprobante_url = urlData.publicUrl;

    // 3. Get the tickets that were just set to 'apartado'
    const { data: ticketsApartados, error: ticketsError } = await supabase
      .from("t_tickets")
      .select('id')
      .eq("rifa_id", id)
      .eq("jugador_id", selectedJugador)
      .in("numero", numerosToRegister);

    if (ticketsError || !ticketsApartados || ticketsApartados.length === 0) {
      toast.error("No se encontraron los tickets apartados para registrar el pago. Inténtalo de nuevo o contacta a soporte.");
      setLoading(false);
      return;
    }

    // 4. Create payment requests for each ticket
    const solicitudes = ticketsApartados.map(ticket => ({
      ticket_id: ticket.id,
      metodo_pago: selectedPaymentMethod,
      monto: rifa?.precio_ticket,
      referencia: referenciaPago || 'N/A',
      comprobante_url: comprobante_url,
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString()
    }));

    const { error: insertError } = await supabase.from('t_solicitudes').insert(solicitudes);

    if (!insertError) {
      toast.success("Solicitud de pago enviada. Tus tickets se procesarán pronto.");
      fetchTickets();

      // Prepare data for the summary ticket and move to the next step
      const jugador = jugadores.find(j => j.id == selectedJugador);
      setGeneratedTicketInfo({
        jugador: `${jugador.nombre} ${jugador.apellido}`,
        telefono: jugador.telefono,
        rifa: rifa?.nombre,
        numeros: numerosSeleccionados,
        total: (rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2),
        metodoPago: paymentMethods.find(p => p.id === selectedPaymentMethod)?.name || selectedPaymentMethod,
        referencia: referenciaPago,
        fecha: new Date()
      });
      setWizardStep(6);
    } else {
      toast.error("Error al enviar la solicitud de pago: " + insertError.message);
    }
    setLoading(false);
  };

  const handleDownloadTicket = async () => {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#1e2230', // Match the ticket background
        scale: 2 // Higher resolution for better quality
      });
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imgData;
      link.download = `ticket-rifa-${generatedTicketInfo.rifa.replace(/\s/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Ticket descargado como imagen.");
    } catch (error) {
      toast.error("No se pudo descargar el ticket.");
      console.error("Error downloading ticket:", error);
    }
  };

  const handleShareWhatsApp = () => {
    if (!generatedTicketInfo) return;
    const { jugador, rifa, numeros, total, fecha, telefono } = generatedTicketInfo;
    const phone = telefono?.replace(/\D/g, '');

    if (!phone) {
      toast.error("El jugador no tiene un número de teléfono registrado para compartir por WhatsApp.");
      return;
    }

    const message = `¡Hola ${jugador}! 👋\nAquí está el resumen de tu compra para la rifa *${rifa}*:\n\n🎟️ *Tus Números:* ${numeros.join(', ')}\n💰 *Total Pagado:* $${total}\n🗓️ *Fecha:* ${fecha.toLocaleDateString('es-ES')}\n\nTu solicitud de pago ha sido recibida y será procesada pronto.\n¡Gracias por participar y mucha suerte! 🍀`.trim().replace(/^\s+/gm, '');
    const whatsappUrl = `https://wa.me/58${phone.slice(-10)}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];

    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      if (file.size <= 5 * 1024 * 1024) { // 5MB limit
        setComprobantePago(file);
        toast.success(`Archivo "${file.name}" cargado correctamente`);
      } else {
        toast.error("El archivo debe ser menor a 5MB");
      }
    } else {
      toast.error("Solo se permiten imágenes (JPG, PNG) o archivos PDF");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size <= 5 * 1024 * 1024) { // 5MB limit
        setComprobantePago(file);
        toast.success(`Archivo "${file.name}" cargado correctamente`);
      } else {
        toast.error("El archivo debe ser menor a 5MB");
        e.target.value = ''; // Clear the input
      }
    }
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

    setShowPlayerGroupModal(true);
    setTimeout(() => setIsPlayerGroupModalAnimating(true), 10);
  };
  const closePlayerGroupModal = () => {
    setIsPlayerGroupModalAnimating(false);
    setTimeout(() => {
      setShowPlayerGroupModal(false);
      setSelectedPlayerGroup(null);
    }, 300); // Wait for animation to complete
  };

  const handleUpdatePlayerTicketsStatus = async (newStatus, fromStatus = null) => {
    if (!selectedPlayerGroup) return;

    const ticketsToUpdate = selectedPlayerGroup.tickets.filter(t =>
      fromStatus ? t.estado === fromStatus : t.estado !== newStatus
    );

    setLoading(true);
    const { error } = await supabase
      .from("t_tickets")
      .update({ estado: newStatus })
      .in("id", ticketsToUpdate.map(t => t.ticket_id));

    if (!error) {
      toast.success(`Tickets de ${selectedPlayerGroup.info.nombre_jugador} actualizados a ${newStatus}`);
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

  const ticketsByStatus = useMemo(() => {
    if (!selectedPlayerGroup) return {};
    return selectedPlayerGroup.tickets.reduce((acc, ticket) => {
      const status = ticket.estado;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(ticket);
      return acc;
    }, {});
  }, [selectedPlayerGroup]);

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

  const paymentMethods = [
    {
      id: 'pago_movil',
      name: 'Pago Móvil',
      details: '0414-1234567 • C.I: 12.345.678',
      icon: (
        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z" />
        </svg>
      ),
      bgColor: 'bg-blue-500/20'
    },
    {
      id: 'banco_venezuela',
      name: 'Banco Venezuela',
      details: '0102-0123-4567890123456',
      icon: (
        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5,6H23V18H5V6M14,9A3,3 0 0,1 17,12A3,3 0 0,1 14,15A3,3 0 0,1 11,12A3,3 0 0,1 14,9M9,8A2,2 0 0,1 7,10V14A2,2 0 0,1 9,16H19A2,2 0 0,1 21,14V10A2,2 0 0,1 19,8H9Z" />
        </svg>
      ),
      bgColor: 'bg-green-500/20'
    },
    {
      id: 'zelle',
      name: 'Zelle',
      details: 'usuario@email.com',
      icon: (
        <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M7.07,18.28C7.5,17.38 8.12,16.5 8.91,15.77L9.5,15.25L8.73,15.05C7.79,14.8 7,14.12 7,13.5C7,12.67 8,12 9.5,12C10.38,12 11.13,12.25 11.72,12.72C13.68,11.53 14.92,9.85 15.09,8.1C14.64,8.04 14.18,8 13.71,8C9.85,8 6.71,11.03 6.71,14.79C6.71,16.5 6.81,17.4 7.07,18.28M12,4A8,8 0 0,1 20,12C20,16.18 16.88,19.5 12.91,19.5C12.65,19.5 12.39,19.5 12.13,19.46C11.59,19.36 11,18.85 11,18.14C11,17.38 11.61,16.9 12.4,16.9C13.07,16.9 13.58,17.32 13.58,17.75C13.58,18.04 13.4,18.14 13.27,18.14C13.25,18.14 13.24,18.13 13.22,18.13C13.2,18.11 13.18,18.1 13.15,18.1C13.1,18.1 13.04,18.13 13,18.17C12.94,18.2 12.89,18.2 12.83,18.2C12.1,18.2 11.5,17.61 11.5,16.9C11.5,16.18 12.1,15.6 12.83,15.6C14.27,15.6 15.42,16.68 15.42,18.04C15.42,19.32 14.43,20.37 13.15,20.37C10.04,20.37 7.5,17.96 7.5,14.79C7.5,11.47 10.26,8.79 13.71,8.79C14.21,8.79 14.7,8.84 15.18,8.93C15.1,10.90 13.71,12.73 11.54,14.05C11.58,14.27 11.61,14.5 11.61,14.74C11.61,16.5 10.38,17.95 8.83,17.95C8.32,17.95 7.85,17.77 7.5,17.46C7.5,17.64 7.5,17.82 7.5,18C7.5,18.85 8.12,19.5 8.91,19.5C9.4,19.5 9.86,19.32 10.22,19C10.53,18.71 10.75,18.32 10.75,17.9C10.75,17.4 10.38,17 9.91,17C9.43,17 9.04,17.36 9.04,17.82C9.04,18.04 9.16,18.22 9.32,18.32C9.37,18.35 9.42,18.37 9.47,18.37C9.5,18.37 9.53,18.36 9.56,18.35C9.58,18.34 9.6,18.32 9.61,18.3C9.62,18.28 9.63,18.26 9.63,18.24C9.63,18.1 9.53,17.97 9.4,17.97C9.33,17.97 9.27,18 9.22,18.05C9.19,18.08 9.18,18.12 9.18,18.16C9.18,18.2 9.19,18.24 9.22,18.27C9.30,18.35 9.41,18.4 9.53,18.4C9.99,18.4 10.36,18.06 10.36,17.63C10.36,17.2 9.99,16.86 9.53,16.86C8.87,16.86 8.32,17.38 8.32,18C8.32,18.62 8.87,19.14 9.53,19.14C10.64,19.14 11.54,18.28 11.54,17.22C11.54,16.16 10.64,15.3 9.53,15.3C7.75,15.3 6.32,16.66 6.32,18.36C6.32,20.06 7.75,21.42 9.53,21.42C12.43,21.42 14.82,19.12 14.82,16.32C14.82,13.52 12.43,11.22 9.53,11.22C5.54,11.22 2.32,14.32 2.32,18.18C2.32,22.04 5.54,25.14 9.53,25.14C14.64,25.14 18.82,21.12 18.82,16.18C18.82,11.24 14.64,7.22 9.53,7.22C3.32,7.22 -1.68,12.08 -1.68,18.04C-1.68,23.99 3.32,28.86 9.53,28.86C16.85,28.86 22.82,23.12 22.82,16.04C22.82,8.96 16.85,3.22 9.53,3.22C1.10,3.22 -5.68,9.76 -5.68,18.04C-5.68,26.32 1.10,32.86 9.53,32.86C19.07,32.86 26.82,25.36 26.82,16.04C26.82,6.72 19.07,-.78 9.53,-.78" />
        </svg>
      ),
      bgColor: 'bg-purple-500/20'
    },
    {
      id: 'paypal',
      name: 'PayPal',
      details: 'usuario@paypal.com',
      icon: (
        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm1.565-13.52c.27-1.718.743-3.148 1.417-4.29.674-1.142 1.547-1.713 2.618-1.713H15.5c.912 0 1.683.175 2.314.525.631.35 1.117.837 1.458 1.462.341.625.512 1.388.512 2.288 0 .9-.171 1.663-.512 2.288-.341.625-.827 1.112-1.458 1.462-.631.35-1.402.525-2.314.525h-2.824c-1.071 0-1.944-.571-2.618-1.713-.674-1.142-1.147-2.572-1.417-4.29z" />
        </svg>
      ),
      bgColor: 'bg-blue-600/20'
    }
  ];

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
                setSelectedJugador("");
                setCustomNumero("");
                setComprobantePago(null);
                setSelectedPaymentMethod(null);
                setReferenciaPago("");
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

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Jugador</label>
                  <select
                    value={selectedJugador}
                    onChange={e => setSelectedJugador(e.target.value)}
                    className="w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors"
                  >
                    <option value="">Selecciona jugador...</option>
                    {jugadores.map(j => (
                      <option key={j.id} value={j.id}>
                        {j.nombre} {j.apellido} ({j.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-between pt-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  </div>
                  <button
                    disabled={!selectedJugador}
                    onClick={() => setWizardStep(numerosSeleccionados.length > 0 ? 3 : 2)}
                    className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Siguiente
                  </button>
                  <button
                    onClick={() => setWizardStep(7)}
                    className="bg-[#4CAF50] hover:bg-[#3e8e41] text-white px-6 py-3 rounded-lg font-semibold transition-all"
                  >
                    Agregar jugador
                  </button>
                </div>
              </div>
            )}

            {/* Paso 7: Agregar nuevo jugador */}
            {wizardStep === 7 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <UserIcon className="w-6 h-6 text-[#7c3bed]" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Agregar Nuevo Jugador</h2>
                  <p className="text-gray-400 text-sm">Completa los datos para registrar un nuevo jugador.</p>
                </div>

                <form onSubmit={handleSaveNewPlayer} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
                      <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full bg-[#23283a] border border-[#2d3748] rounded-lg p-2 text-white focus:outline-none focus:border-[#7c3bed]" placeholder="Ingrese el nombre" required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Apellido *</label>
                      <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full bg-[#23283a] border border-[#2d3748] rounded-lg p-2 text-white focus:outline-none focus:border-[#7c3bed]" placeholder="Ingrese el apellido" required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Cédula de Identidad</label>
                      <div className="flex items-center bg-[#23283a] border border-[#2d3748] rounded-lg">
                        <UserIcon className="w-5 h-5 text-gray-400 ml-2" />
                        <input name="cedula" value={form.cedula} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="V-12345678" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Correo electrónico *</label>
                      <div className="flex items-center bg-[#23283a] border border-[#2d3748] rounded-lg">
                        <EnvelopeIcon className="w-5 h-5 text-gray-400 ml-2" />
                        <input type="email" name="email" value={form.email} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="jugador@ejemplo.com" required />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Número de teléfono</label>
                      <div className="flex items-center bg-[#23283a] border border-[#2d3748] rounded-lg">
                        <PhoneIcon className="w-5 h-5 text-gray-400 ml-2" />
                        <input name="phone" value={form.phone} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="04141234567" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Dirección</label>
                      <input name="street" value={form.street} onChange={handleChange} className="w-full bg-[#23283a] border border-[#2d3748] rounded-lg p-2 text-white focus:outline-none focus:border-[#7c3bed]" placeholder="Av. Principal" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-2">Números favoritos (opcional)</h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={rifa?.total_tickets || 1000}
                        value={form.favInput}
                        onChange={e => setForm({ ...form, favInput: e.target.value })}
                        className="flex-1 bg-[#23283a] border border-[#2d3748] rounded-lg p-2 text-white focus:outline-none focus:border-[#7c3bed]"
                        placeholder={`1-${rifa?.total_tickets || 1000}`}
                      />
                      <button type="button" onClick={handleAddNumber} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-bold text-lg">+</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {form.favoriteNumbers.map(num => (
                        <span key={num} className="inline-flex items-center bg-[#2d3748] text-white px-2 py-1 rounded-md font-mono text-xs">
                          {num}
                          <button type="button" onClick={() => handleRemoveNumber(num)} className="ml-1 text-[#d54ff9] hover:text-red-500 font-bold">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <div className="flex space-x-2">
                      {/* Step indicator can be dynamic */}
                    </div>
                    <div className="flex space-x-3">
                      <button type="button" onClick={() => setWizardStep(1)} className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Atrás</button>
                      <button type="submit" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold transition" disabled={loading}>
                        {loading ? "Guardando..." : "Guardar Jugador"}
                      </button>
                    </div>
                  </div>
                </form>
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
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="flex space-x-3">
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
                <div className="flex justify-between items-center pt-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setWizardStep(2)}
                      className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleRegistrarTicket}
                      disabled={loading}
                      className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Registrando...</span>
                        </>
                      ) : (
                        <span>Confirmar y Registrar</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 4: Método de Pago */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCardIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Elige un Método de Pago</h2>
                  <p className="text-gray-400 text-sm">Selecciona cómo realizaste o realizarás el pago.</p>
                </div>

                <div className="bg-[#0f131b] border border-[#23283a] rounded-lg p-4">
                  <h4 className="text-white font-medium mb-4 flex items-center">
                    <CreditCardIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                    Métodos de Pago Disponibles
                  </h4>
                  <div className="space-y-3">
                    {paymentMethods.map(method => (
                      <label
                        key={method.id}
                        className={`flex items-center space-x-3 p-3 bg-[#181c24] rounded-lg border-2 cursor-pointer transition-all ${selectedPaymentMethod === method.id ? 'border-[#7c3bed]' : 'border-[#2d3748] hover:border-[#4a5568]'}`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.id}
                          checked={selectedPaymentMethod === method.id}
                          onChange={() => setSelectedPaymentMethod(method.id)}
                          className="hidden"
                        />
                        <div className={`w-10 h-10 ${method.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          {method.icon}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium">{method.name}</p>
                          <p className="text-gray-400 text-sm">{method.details}</p>
                        </div>
                        {selectedPaymentMethod === method.id && (
                          <div className="w-5 h-5 bg-[#7c3bed] rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="flex space-x-3">
                    <button type="button" onClick={() => setWizardStep(3)} className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Atrás</button>
                    <button
                      onClick={() => setWizardStep(5)}
                      disabled={!selectedPaymentMethod}
                      className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Paso 5: Comprobante de Pago */}
            {wizardStep === 5 && (
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="p-6 pb-4 text-center flex-shrink-0">
                  <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCardIcon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Comprobante y Referencia</h2>
                  <p className="text-gray-400 text-sm">Sube el comprobante de pago para confirmar la transacción</p>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 space-y-6">
                  <div className="bg-[#23283a] rounded-lg p-4">
                    <div className="text-center">
                      <p className="text-green-400 font-medium mb-2">✅ Tickets apartados exitosamente</p>
                      <p className="text-gray-300 text-sm">
                        Los números han sido reservados. Ahora sube el comprobante de pago para confirmar la compra.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2  gap-6">

                    <div className="space-y-4">
                      <div>
                        <label htmlFor="referencia" className="block text-sm font-medium text-gray-300 mb-2">
                          Número de Referencia (Opcional)
                        </label>
                        <div className="flex items-center bg-[#23283a] border border-[#2d3748] rounded-lg focus-within:border-[#7c3bed] transition-colors">
                          <HashtagIcon className="w-5 h-5 text-gray-400 mx-3" />
                          <input
                            type="text"
                            id="referencia"
                            value={referenciaPago}
                            onChange={e => setReferenciaPago(e.target.value)}
                            className="w-full bg-transparent p-3 text-white focus:outline-none"
                            placeholder="Ej: 00123456"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Comprobante de Pago *
                        </label>

                        {/* Drag & Drop Zone */}
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          className={`relative w-full border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${isDragOver
                            ? 'border-[#7c3bed] bg-[#7c3bed]/10'
                            : comprobantePago
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-[#2d3748] bg-[#23283a] hover:border-[#7c3bed] hover:bg-[#7c3bed]/5'
                            }`}
                        >
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id="comprobante-input"
                          />

                          {comprobantePago ? (
                            <div className="flex items-center space-x-4 text-left">
                              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-green-400 font-medium text-sm truncate">{comprobantePago.name}</p>
                                <p className="text-gray-400 text-xs">{(comprobantePago.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <button type="button" onClick={() => setComprobantePago(null)} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/10" title="Remover archivo"><XMarkIcon className="w-5 h-5" /></button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="w-12 h-12 bg-[#2d3748] rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                              </div>
                              <p className="text-white font-medium">Arrastra tu comprobante aquí</p>
                              <p className="text-gray-400 text-sm">o haz clic para seleccionar</p>
                            </div>
                          )}
                        </div>

                        <p className="text-xs text-gray-400 mt-2 text-center">
                          Formatos permitidos: JPG, PNG, PDF • Tamaño máximo: 5MB
                        </p>
                      </div>
                    </div>
                    {/* Instructions */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4 space-y-4">
                      <h5 className="text-blue-400 font-medium mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        Instrucciones
                      </h5>
                      <ul className="text-blue-300 text-sm space-y-1 list-disc list-inside">
                        <li>Realiza el pago usando cualquiera de los métodos disponibles.</li>
                        <li>Toma una captura o foto del comprobante.</li>
                        <li>Sube el comprobante aquí para confirmar tu compra.</li>
                        <li>Una vez verificado, tus tickets serán confirmados.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 flex justify-between items-center flex-shrink-0 border-t border-[#23283a]">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setWizardStep(3)}
                      className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                    >
                      Atrás
                    </button>
                    <button
                      onClick={handleConfirmarPago}
                      disabled={loading || !comprobantePago || !selectedPaymentMethod}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Confirmando Pago...</span>
                        </>
                      ) : (
                        <span>Confirmar Pago</span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showPlayerGroupModal && selectedPlayerGroup && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 transition-opacity duration-300" onClick={closePlayerGroupModal} />
          <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isPlayerGroupModalAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#23283a]">
                <h2 className="text-xl font-bold text-white">Detalles del Jugador</h2>
                <button onClick={closePlayerGroupModal} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Player Info */}
                  <div className="bg-[#23283a] rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <UserIcon className="w-5 h-5 text-[#7c3bed]" />
                      <span className="text-sm text-gray-400">Información del Jugador</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-white font-medium">{selectedPlayerGroup.info.nombre_jugador || 'No asignado'}</p>
                      <p className="text-gray-400 text-sm">{selectedPlayerGroup.info.email_jugador || 'Sin email'}</p>
                      {selectedPlayerGroup.info.telefono_jugador && <p className="text-gray-400 text-sm">{formatTelephone(selectedPlayerGroup.info.telefono_jugador)}</p>}
                    </div>
                  </div>

                  {/* Tickets by Status */}
                  {Object.entries(ticketsByStatus).map(([status, ticketsInStatus]) => (
                    <div key={status} className="bg-[#23283a] rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className={`font-semibold capitalize ${status === "apartado" ? "text-yellow-400" : status === "pagado" ? "text-green-500" : status === "familiares" ? "text-purple-400" : "text-white"}`}>
                          {status}
                        </h4>
                        <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded-full">{ticketsInStatus.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ticketsInStatus.map(ticket => (
                          <span key={ticket.numero} className={`px-3 py-1.5 rounded-lg text-sm font-mono font-bold ${status === "apartado" ? "bg-yellow-400/20 text-yellow-300" : status === "pagado" ? "bg-green-500/20 text-green-300" : status === "familiares" ? "bg-purple-500/20 text-purple-300" : "bg-gray-600 text-white"}`}>
                            {ticket.numero}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t border-[#23283a]">
                <div className="space-y-3">
                  {ticketsByStatus.apartado?.length > 0 && (
                    <button onClick={() => handleUpdatePlayerTicketsStatus("pagado", "apartado")} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? "Actualizando..." : `Marcar ${ticketsByStatus.apartado.length} Apartado(s) como Pagado`}
                    </button>
                  )}
                  {selectedPlayerGroup.tickets.some(t => t.estado !== 'familiares') && (
                    <button onClick={() => handleUpdatePlayerTicketsStatus("familiares")} disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? "Cambiando..." : "Cambiar Todos a Ticket Familiar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && whatsAppTicket && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500/20 w-10 h-10 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-white">Enviar por WhatsApp</h2>
                </div>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(false);
                    setWhatsAppTicket(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                {/* Ticket Info */}
                <div className="bg-[#23283a] rounded-lg p-4">
                  <div className="text-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${whatsAppTicket.estado === "apartado" ? "bg-yellow-400/20" :
                      whatsAppTicket.estado === "pagado" ? "bg-green-500/20" :
                        whatsAppTicket.estado === "familiares" ? "bg-red-400/20" : "bg-[#23283a]"
                      }`}>
                      <span className={`text-2xl font-bold ${whatsAppTicket.estado === "apartado" ? "text-yellow-400" :
                        whatsAppTicket.estado === "pagado" ? "text-green-500" :
                          whatsAppTicket.estado === "familiares" ? "text-red-400" : "text-white"
                        }`}>
                        {whatsAppTicket.numero}
                      </span>
                    </div>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${whatsAppTicket.estado === "apartado" ? "bg-yellow-400 text-yellow-900" :
                      whatsAppTicket.estado === "pagado" ? "bg-green-500 text-white" :
                        whatsAppTicket.estado === "familiares" ? "bg-red-400 text-white" : "bg-[#23283a] text-white"
                      }`}>
                      {whatsAppTicket.estado?.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Jugador</p>
                      <p className="text-white text-sm font-medium">{whatsAppTicket.nombre_jugador || 'No asignado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Teléfono</p>
                      <p className="text-white text-sm">{whatsAppTicket.telefono_jugador || 'No disponible'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Rifa</p>
                      <p className="text-white text-sm">{rifa?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Precio</p>
                      <p className="text-white text-sm">${rifa?.precio_ticket}</p>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Message Preview */}
                <div className="bg-[#0f131b] rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Vista previa del mensaje:</p>
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <p className="text-green-400 text-sm">
                      🎟️ *Información de tu Ticket*{'\n\n'}
                      📋 *Rifa:* {rifa?.nombre}{'\n'}
                      🔢 *Número:* {whatsAppTicket.numero}{'\n'}
                      💰 *Precio:* ${rifa?.precio_ticket}{'\n'}
                      📊 *Estado:* {whatsAppTicket.estado?.toUpperCase()}{'\n\n'}
                      {whatsAppTicket.estado === "apartado" && "⏰ *Recuerda realizar el pago para confirmar tu ticket*"}
                      {whatsAppTicket.estado === "pagado" && "✅ *Tu ticket está confirmado y pagado*"}
                      {'\n\n'}¡Gracias por participar! 🍀
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowWhatsAppModal(false);
                      setWhatsAppTicket(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      const message = `🎟️ *Información de tu Ticket*\n\n📋 *Rifa:* ${rifa?.nombre}\n🔢 *Número:* ${whatsAppTicket.numero}\n💰 *Precio:* $${rifa?.precio_ticket}\n📊 *Estado:* ${whatsAppTicket.estado?.toUpperCase()}\n\n${whatsAppTicket.estado === "apartado" ? "⏰ *Recuerda realizar el pago para confirmar tu ticket*" : whatsAppTicket.estado === "pagado" ? "✅ *Tu ticket está confirmado y pagado*" : ""}\n\n¡Gracias por participar! 🍀`;
                      const phoneNumber = whatsAppTicket.telefono_jugador?.replace(/\D/g, '');
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                      window.open(whatsappUrl, '_blank');
                      setShowWhatsAppModal(false);
                      setWhatsAppTicket(null);
                    }}
                    disabled={!whatsAppTicket.telefono_jugador}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                    </svg>
                    <span>Enviar WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
