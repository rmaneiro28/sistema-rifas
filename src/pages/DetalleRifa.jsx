import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import { useParams, NavLink } from "react-router-dom";
import { ArrowLeftIcon, StarIcon, TicketIcon, XMarkIcon, MagnifyingGlassIcon, TrophyIcon, ShareIcon, PencilIcon, PlusIcon, BellAlertIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { motion, AnimatePresence } from "framer-motion";
import { Menu, Transition } from '@headlessui/react';
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { LoadingScreen } from "../components/LoadingScreen";
import { TicketRegistrationWizard } from "../components/TicketRegistrationWizard";
import { WinnerRegistrationModal } from "../components/WinnerRegistrationModal";
import { TicketDetailModal } from "../components/TicketDetailModal";
import { ReminderReenvioModal } from "../components/ReminderReenvioModal.jsx";
import { ReminderControlModal } from "../components/ReminderControlModal";
import { TicketSummaryGrid } from "../components/TicketSummaryGrid";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth } from '../context/AuthContext';
import logoRifasPlus from "../assets/Logo Rifas Plus Dark.jpg";

const formatTicketNumber = (number, totalTickets) => {
  if (number === null || number === undefined || !totalTickets || totalTickets <= 0) {
    return number;
  }
  const numDigits = String(totalTickets - 1).length;
  return String(number).padStart(Math.max(3, numDigits), "0");
};

export function DetalleRifa() {
  const { id } = useParams();
  const [rifa, setRifa] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [ganador, setGanador] = useState(null);
  const [selectedTicketsFromMap, setSelectedTicketsFromMap] = useState([]);
  const { empresaId } = useAuth();
  const [empresa, setEmpresa] = useState(null);
  // Modal states
  const [showRegistrationWizard, setShowRegistrationWizard] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [showPlayerGroupModal, setShowPlayerGroupModal] = useState(false);
  const [selectedPlayerGroup, setSelectedPlayerGroup] = useState(null);
  const [selectedTicketForDetail, setSelectedTicketForDetail] = useState(null);
  const [showReenvioModal, setShowReenvioModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [playersToRemind, setPlayersToRemind] = useState([]);
  const [logosBase64, setLogosBase64] = useState({ empresa: null, system: null });

  const pdfRef = useRef(); // For the map export
  const summaryGridRef = useRef();
  const summaryGridRef2 = useRef(); // Ref for the second part of the summary (if > 1000 tickets) // For the summary image export

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (empresaId) {
        const { data: empresaData, error } = await supabase
          .from('t_empresas')
          .select('nombre_empresa, logo_url')
          .eq('id_empresa', empresaId)
          .single();

        if (error) {
          console.error('Error fetching empresa:', error);
        } else if (empresaData) {
          setEmpresa(empresaData);
        }
      }
    };
    fetchEmpresa();
    fetchEmpresa();
  }, [empresaId]);

  // Load logos as base64
  useEffect(() => {
    const toDataURL = (url) => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          const reader = new FileReader();
          reader.onloadend = function () {
            resolve(reader.result);
          };
          reader.readAsDataURL(xhr.response);
        };
        xhr.onerror = () => reject(new Error('Error al cargar la imagen'));
        xhr.open('GET', url);
        xhr.responseType = 'blob';
        xhr.send();
      });
    };

    const loadLogos = async () => {
      try {
        const [empresaLogo, systemLogo] = await Promise.all([
          empresa?.logo_url ? toDataURL(empresa.logo_url).catch(e => null) : Promise.resolve(null),
          toDataURL(logoRifasPlus).catch(e => null)
        ]);
        setLogosBase64({ empresa: empresaLogo, system: systemLogo });
      } catch (error) {
        console.error("Error loading logos:", error);
      }
    };

    loadLogos();
  }, [empresa, logoRifasPlus]);

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

  const fetchRaffle = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase.from("t_rifas").select("*").eq("id_rifa", id).eq("empresa_id", empresaId).single();
    if (!error) setRifa(data);
    else toast.error("Error al cargar los datos de la rifa.");
    setLoading(false);
  }, [id, empresaId]);

  // Fetch rifas info
  useEffect(() => {
    fetchRaffle();
  }, [fetchRaffle]);

  // Fetch winner info if exists
  useEffect(() => {
    const fetchGanador = async () => {
      if (!empresaId) return;
      const { data, error } = await supabase
        .from('t_ganadores')
        .select('*, t_jugadores(nombre, apellido, telefono)')
        .eq('rifa_id', id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching winner:", error);
      } else if (data) {
        setGanador(data);
      }
    };
    fetchGanador();
  }, [id, rifa?.estado, empresaId]); // Re-fetch if raffle state changes
  // Fetch tickets for this rifas
  const fetchTickets = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data, error } = await supabase.from("vw_tickets").select("*").eq("rifa_id", id).eq("empresa_id", empresaId);
    if (!error) {
      console.log('Tickets loaded:', data);
      setTickets(data || []);
    } else {
      console.error('Error loading tickets:', error);
    }
    setLoading(false);
  };

  const handleRegistrationSuccess = (softRefresh = false) => {
    fetchTickets();
    if (!softRefresh) {
      setShowRegistrationWizard(false);
      setSelectedTicketsFromMap([]);
    }
  };

  // Ticket stats

  // Ticket filters
  const filterOptions = [
    { key: "all", label: "Todos", color: "bg-[#7c3bed]", textColor: "text-white" },
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", textColor: "text-white" },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", textColor: "text-yellow-900" },
    { key: "pagado", label: "Pagados", color: "bg-green-500", textColor: "text-white" },
    { key: "abonado", label: "Abonados", color: "bg-purple-500", textColor: "text-white" }
  ];

  // Unified function to generate all tickets with proper status
  const generateAllTickets = () => {
    if (!rifa?.total_tickets) return [];

    // Create a Map for efficient lookups. This is much faster than .find() in a loop.
    // Use the formatted ticket number as key for lookup since database stores formatted numbers
    const ticketsMap = new Map(tickets.filter((ticket) => ticket.rifa_id === id).map(t => [t.numero_ticket, t]));
    return Array.from({ length: rifa.total_tickets }, (_, i) => {
      const rawNumero = i;
      const formattedNumero = formatTicketNumber(rawNumero, rifa.total_tickets);
      const existingTicket = ticketsMap.get(formattedNumero);

      if (existingTicket) {
        // This ticket exists in the database, so it's occupied.
        // Map the database fields to our expected structure with formatted ticket number
        return {
          id: existingTicket.id || existingTicket.ticket_id, // Use id if available, fallback to ticket_id
          numero_ticket: formattedNumero,
          estado_ticket: existingTicket.estado_ticket,
          jugador_id: existingTicket.jugador_id, // Make sure jugador_id is passed
          nombre_jugador: existingTicket.nombre_jugador,
          apellido_jugador: existingTicket.apellido_jugador,
          email_jugador: existingTicket.email_jugador,
          telefono_jugador: existingTicket.telefono,
          cedula_jugador: existingTicket.cedula,
          fecha_pago: existingTicket.fecha_pago,
          rifa_id: existingTicket.rifa_id,
          monto_total: existingTicket.monto_total || rifa?.precio_ticket || 0,
          saldo_pendiente: existingTicket.saldo_pendiente || rifa?.precio_ticket || 0,
          metodo_pago: existingTicket.metodo_pago || 'N/A',
          referencia_pago: existingTicket.referencia_pago || existingTicket.referencia || 'N/A'
        };
      } else {
        // This ticket number is not in the database, so it's available.
        return {
          id: null,
          numero_ticket: formattedNumero,
          estado_ticket: "disponible",
          jugador_id: null,
          nombre_jugador: null,
          email_jugador: null,
          telefono_jugador: null,
          cedula_jugador: null,
          fecha_pago: null,
          rifa_id: rifa.id_rifa
        };
      }
    });
  };

  const allTickets = generateAllTickets();
  const ticketStatusMap = useMemo(() => new Map(allTickets.map(t => [t.numero_ticket, t.estado_ticket])), [allTickets]);
  const filteredTickets = allTickets.filter(ticket => {
    const matchesStatus = ticketFilter === "all" || ticket.estado_ticket === ticketFilter;
    if (!searchQuery) return matchesStatus;

    const normalizeText = (text) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const searchTerms = normalizeText(searchQuery).split(' ').filter(term => term);

    // Si la búsqueda es un solo término numérico, hacer coincidencia exacta
    if (searchTerms.length === 1 && !isNaN(searchTerms[0])) {
      return matchesStatus && parseInt(ticket.numero_ticket, 10) === parseInt(searchTerms[0], 10);
    }

    const searchableString = normalizeText(
      `${ticket.nombre_jugador || ''} ${ticket.apellido_jugador || ''} ${ticket.telefono_jugador || ''}`
    );

    return matchesStatus && searchTerms.every(term => searchableString.includes(term));
  });

  const handleProceedWithSelection = () => {
    if (selectedTicketsFromMap.length === 0) {
      toast.info("Selecciona al menos un ticket del mapa.");
      return;
    }
    setShowRegistrationWizard(true);
  };

  const handleTicketClick = (ticket) => {
    console.log('Ticket clicked:', ticket);

    // Validación para evitar abrir modal con ticket null
    if (!ticket) {
      console.error('Ticket is null in handleTicketClick');
      return;
    }

    console.log('Ticket estado:', ticket.estado_ticket);
    console.log('Ticket jugador_id:', ticket.jugador_id);
    console.log('Ticket nombre_jugador:', ticket.nombre_jugador);

    if (ticket.estado_ticket === 'disponible') {
      console.log('Ticket is available, adding to selection');
      setSelectedTicketsFromMap(prev =>
        prev.includes(ticket.numero_ticket)
          ? prev.filter(n => n !== ticket.numero_ticket)
          : [...prev, ticket.numero_ticket]
      );
    } else {
      console.log('Ticket is not available, opening detail modal');
      openTicketDetail(ticket);
    }
  };

  const openTicketDetail = (ticket) => {
    console.log('Opening ticket detail for:', ticket);

    // Validación para evitar abrir modal con ticket null
    if (!ticket) {
      console.error('Ticket is null in openTicketDetail');
      toast.error('Error: No se pudo cargar la información del ticket');
      return;
    }

    // Si no hay jugador_id pero hay información del jugador, crear un playerGroup con los datos disponibles
    if (!ticket.jugador_id) {
      console.log('No jugador_id found, but creating player group with available data');

      const playerGroupData = {
        info: {
          nombre_jugador: ticket.nombre_jugador || 'N/A',
          apellido_jugador: ticket.apellido_jugador || '',
          cedula_jugador: ticket.cedula_jugador || 'N/A',
          telefono_jugador: ticket.telefono_jugador || ticket.email_jugador || 'N/A',
          email_jugador: ticket.email_jugador || 'N/A',
          jugador_id: ticket.jugador_id || null,
          metodo_pago: ticket.metodo_pago || 'N/A',
          referencia_pago: ticket.referencia_pago || ticket.referencia || 'N/A'
        },
        tickets: [ticket] // Solo este ticket ya que no podemos agrupar por jugador_id
      };

      console.log('Setting player group with available data:', playerGroupData);
      setSelectedPlayerGroup(playerGroupData);
      setSelectedTicketForDetail(ticket);
      setShowPlayerGroupModal(true);
      return;
    }

    const playerTickets = allTickets.filter(t => t.jugador_id === ticket.jugador_id);
    console.log('Found player tickets:', playerTickets);

    if (playerTickets.length === 0) {
      console.log('No player tickets found, creating single ticket group');
      const playerGroupData = {
        info: {
          nombre_jugador: ticket.nombre_jugador || 'N/A',
          apellido_jugador: ticket.apellido_jugador || '',
          cedula_jugador: ticket.cedula_jugador || 'N/A',
          telefono_jugador: ticket.telefono_jugador || ticket.email_jugador || 'N/A',
          email_jugador: ticket.email_jugador || 'N/A',
          jugador_id: ticket.jugador_id,
          metodo_pago: ticket.metodo_pago || 'N/A',
          referencia_pago: ticket.referencia_pago || ticket.referencia || 'N/A'
        },
        tickets: [ticket]
      };

      setSelectedPlayerGroup(playerGroupData);
      setSelectedTicketForDetail(ticket);
      setShowPlayerGroupModal(true);
      return;
    }

    const playerGroupData = {
      info: {
        nombre_jugador: ticket.nombre_jugador,
        apellido_jugador: ticket.apellido_jugador,
        cedula_jugador: ticket.cedula_jugador,
        telefono_jugador: ticket.telefono_jugador,
        email_jugador: ticket.email_jugador,
        jugador_id: ticket.jugador_id,
        metodo_pago: ticket.metodo_pago || 'N/A',
        referencia_pago: ticket.referencia_pago || ticket.referencia || 'N/A'
      },
      tickets: playerTickets.sort((a, b) => a.numero_ticket - b.numero_ticket)
    };

    console.log('Setting player group:', playerGroupData);
    setSelectedPlayerGroup(playerGroupData);
    setSelectedTicketForDetail(ticket);

    console.log('Setting modal to open');
    setShowPlayerGroupModal(true);
  };
  const closePlayerGroupModal = () => {
    setShowPlayerGroupModal(false);
    setSelectedPlayerGroup(null);
    setSelectedTicketForDetail(null);
  };

  const handleOpenRegistrationModal = () => {
    if (disponibles === 0) {
      toast.error("No hay tickets disponibles para registrar.");
      return;
    }
    setShowRegistrationWizard(true);
  };

  const handleOpenWinnerModal = () => {
    if (rifa?.estado === 'finalizada' || ganador) {
      toast.info(`Esta rifa ya ha finalizado. El ganador fue el número #${ganador?.numero_ganador}.`);
      return;
    } if (pagados !== rifa?.total_tickets) {
      toast.error('No se pueden registrar ganadores. Todos los tickets deben estar pagados.');
      return;
    }
    setShowWinnerModal(true);
  };

  // Fallback para copiar en portapapeles en entornos no seguros (http)
  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if (successful) {
        toast.success("Enlace copiado al portapapeles");
        return true;
      }
    } catch (err) {
      console.error('Fallback: Error al copiar', err);
    } finally {
      document.body.removeChild(textArea);
    }
    return false;
  };

  const handleShareLink = async () => {
    const publicUrl = `${window.location.origin}/public-rifa/${id}`;
    try {
      // Intento moderno (requiere HTTPS o localhost)
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Enlace público copiado al portapapeles");
    } catch (error) {
      console.warn("Error al copiar con la API moderna, intentando fallback:", error);
      // Si falla, intentar el método antiguo. Si también falla, mostrar prompt.
      if (!fallbackCopyTextToClipboard(publicUrl)) {
        toast.error("No se pudo copiar automáticamente.");
        window.prompt("Copia este enlace manualmente:", publicUrl);
      }
    }
  };

  const handleLoadAllFavorites = async () => {
    if (!window.confirm("¿Estás seguro de que quieres apartar todos los números favoritos de tus jugadores registrados que estén disponibles en esta rifa? Esta acción no se puede deshacer.")) {
      return;
    }

    setLoading(true);
    toast.info("Cargando números favoritos de todos los jugadores...");

    try {
      // 1. Fetch all players with favorite numbers for the company
      const { data: jugadores, error: jugadoresError } = await supabase
        .from('t_jugadores')
        .select('id, nombre, apellido, numeros_favoritos')
        .eq('empresa_id', empresaId)
        .not('numeros_favoritos', 'is', null);

      if (jugadoresError) throw jugadoresError;

      const playersWithFavorites = jugadores.filter(j => j.numeros_favoritos && j.numeros_favoritos.length > 0);

      if (playersWithFavorites.length === 0) {
        toast.info("Ningún jugador registrado tiene números favoritos configurados.");
        setLoading(false);
        return;
      }

      // 2. Prepare tickets to be inserted
      let ticketsToInsert = [];
      let ticketsAssignedCount = 0;
      const fechaApartado = new Date().toISOString();
      const assignedInThisRun = new Set(); // Track numbers assigned in this operation

      for (const jugador of playersWithFavorites) {
        for (const favNum of jugador.numeros_favoritos) {
          const formattedNum = formatTicketNumber(favNum, rifa.total_tickets);

          // 3. Check if the ticket is available and not already assigned in this run
          if (ticketStatusMap.get(formattedNum) === 'disponible' && !assignedInThisRun.has(formattedNum)) {
            ticketsToInsert.push({
              rifa_id: rifa.id_rifa,
              jugador_id: jugador.id,
              numero: formattedNum,
              estado: "apartado",
              empresa_id: rifa.empresa_id,
              fecha_apartado: fechaApartado
            });
            ticketsAssignedCount++;
            assignedInThisRun.add(formattedNum); // Mark as assigned
          }
        }
      }

      if (ticketsToInsert.length === 0) {
        toast.info("Todos los números favoritos de los jugadores ya están ocupados en esta rifa.");
        setLoading(false);
        return;
      }

      // 4. Bulk insert the available favorite tickets
      const { error: insertError } = await supabase.from("t_tickets").insert(ticketsToInsert);

      if (insertError) {
        throw insertError;
      }

      toast.success(`¡Se apartaron ${ticketsAssignedCount} tickets favoritos exitosamente!`);
      fetchTickets(); // Refresh the ticket list

    } catch (error) {
      console.error("Error al cargar números favoritos:", error);
      toast.error("Ocurrió un error al procesar los números favoritos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReenvioConfirm = async () => {
    setShowReenvioModal(false);
    await clearReminderHistory();
    // Después de limpiar, permitir enviar a todos los jugadores
    setPlayersToRemind(playersArray);
    setShowReminderModal(true);
  };

  const clearReminderHistory = async () => {
    try {
      const { error } = await supabase
        .from('t_recordatorios_enviados')
        .delete()
        .eq('rifa_id', id)
        .eq('empresa_id', empresaId);

      if (error) {
        console.error('Error clearing reminder history:', error);
        toast.error('Error al limpiar el historial de recordatorios: ' + error.message);
        return false;
      }

      toast.success('Historial de recordatorios limpiado. Ahora puedes enviar recordatorios nuevamente.');
      return true;
    } catch (error) {
      console.error('Error clearing reminder history:', error);
      toast.error('Error al limpiar el historial de recordatorios');
      return false;
    }
  };

  const handleSendReminders = () => {
    const playersWithReservedTickets = allTickets
      .filter(ticket => ticket.estado_ticket === 'apartado' && ticket.jugador_id)
      .reduce((acc, ticket) => {
        if (!acc[ticket.jugador_id]) {
          acc[ticket.jugador_id] = {
            id: ticket.jugador_id,
            nombre: ticket.nombre_jugador,
            telefono: ticket.telefono_jugador,
            tickets: []
          };
        }
        acc[ticket.jugador_id].tickets.push(ticket.numero_ticket);
        return acc;
      }, {});

    const playersArray = Object.values(playersWithReservedTickets).filter(p => p.telefono && p.telefono.replace(/\D/g, '').length > 3);

    if (playersArray.length === 0) {
      toast.info("No hay jugadores con tickets apartados para notificar.");
      return;
    }

    // Filtrar jugadores que no han recibido recordatorio usando promesas
    supabase.from('t_recordatorios_enviados')
      .select('id')
      .limit(1)
      .then(({ error: tableCheckError }) => {
        if (tableCheckError && tableCheckError.code === 'PGRST116') {
          // La tabla no existe, usar todos los jugadores
          console.log('Tabla t_recordatorios_enviados no existe, usando todos los jugadores');
          setPlayersToRemind(playersArray);
          setShowReminderModal(true);
          return;
        }

        return supabase.from('t_recordatorios_enviados')
          .select('jugador_id')
          .eq('rifa_id', id)
          .eq('empresa_id', empresaId)
          .then(({ data: sentReminders, error }) => {
            if (error) {
              console.error('Error fetching sent reminders:', error);
              toast.error('Error al verificar recordatorios enviados');
              return;
            }

            const sentPlayerIds = new Set(sentReminders.map(r => r.jugador_id));
            const playersToRemind = playersArray.filter(player => !sentPlayerIds.has(player.id));

            if (playersToRemind.length === 0) {
              // Si no hay jugadores sin recordatorios, mostrar modal de confirmación
              setShowReenvioModal(true);
              return;
            }

            setPlayersToRemind(playersToRemind);
            setShowReminderModal(true);
          })
          .catch(error => {
            console.error('Error filtering players:', error);
            toast.error('Error al filtrar jugadores para recordar');
          });
      })
      .catch(error => {
        console.error('Error checking table:', error);
        toast.error('Error al verificar tabla de recordatorios');
      });
  };

  const handleGenerateSummary = async () => {
    if (!summaryGridRef.current) return;

    const toastId = toast.loading("Generando imagen(es) resumen...");

    try {
      // Wait a bit for any rendering to finish
      await new Promise(resolve => setTimeout(resolve, 100));

      const generateImage = async (element, suffix = "") => {
        // Temporarily inject logos into the component state or props if possible, 
        // but since we are passing them as props, we need to trigger a re-render or ensure they are available.
        // Actually, we should pass them as props to TicketSummaryGrid and they will be rendered.
        // We need to wait for them to be rendered.

        const canvas = await html2canvas(element, {
          scale: 2, // Higher quality
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true
        });
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `Resumen-Tickets-${rifa?.nombre || 'Rifa'}-${new Date().toISOString().split('T')[0]}${suffix}.png`;
        link.click();
      };

      // Generate first part
      await generateImage(summaryGridRef.current, allTickets.length >= 1000 ? "-Parte1" : "");

      // Generate second part if needed
      if (allTickets.length >= 1000 && summaryGridRef2.current) {
        // Small delay to ensure browser handles multiple downloads
        await new Promise(resolve => setTimeout(resolve, 500));
        await generateImage(summaryGridRef2.current, "-Parte2");
      }

      toast.success("Imagen(es) generada(s) exitosamente", { id: toastId });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error(`Error al generar la imagen: ${error.message}`, { id: toastId });
    }
  };

  const handleGeneratePDF = async () => {
    if (!summaryGridRef.current) return;

    const toastId = toast.loading("Generando PDF...");

    try {
      // Wait a bit for any rendering to finish
      await new Promise(resolve => setTimeout(resolve, 100));

      const generatePDFPage = async (element) => {
        const canvas = await html2canvas(element, {
          scale: 3, // Higher quality for PDF
          backgroundColor: "#ffffff",
          logging: false,
          useCORS: true
        });
        return canvas;
      };

      const canvas1 = await generatePDFPage(summaryGridRef.current);

      const imgWidth = canvas1.width;
      const imgHeight = canvas1.height;

      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [imgWidth, imgHeight] // Custom size matching the high-res capture
      });

      pdf.addImage(canvas1.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);

      if (allTickets.length >= 1000 && summaryGridRef2.current) {
        const canvas2 = await generatePDFPage(summaryGridRef2.current);
        const imgWidth2 = canvas2.width;
        const imgHeight2 = canvas2.height;

        pdf.addPage([imgWidth2, imgHeight2], imgWidth2 > imgHeight2 ? 'landscape' : 'portrait');
        pdf.addImage(canvas2.toDataURL('image/png'), 'PNG', 0, 0, imgWidth2, imgHeight2);
      }

      pdf.save(`Resumen-Tickets-${rifa?.nombre || 'Rifa'}-${new Date().toISOString().split('T')[0]}.pdf`);

      toast.success("PDF generado exitosamente", { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(`Error al generar el PDF: ${error.message}`, { id: toastId });
    }
  };

  useEffect(() => {
    fetchRaffle();
    fetchTickets();
  }, [id, fetchRaffle]);
  // Calculate ticket statistics correctly
  const disponibles = allTickets.filter((t) => t.estado_ticket === "disponible").length;
  const apartados = allTickets.filter((t) => t.estado_ticket === "apartado").length;
  const pagados = allTickets.filter((t) => t.estado_ticket === "pagado").length;
  const ticketStats = [
    { key: "disponible", label: "Disponibles", color: "bg-[#23283a]", count: disponibles },
    { key: "apartado", label: "Apartados", color: "bg-yellow-400", count: apartados },
    { key: "pagado", label: "Pagados", color: "bg-green-500", count: pagados }
  ];

  if (loading && !rifa) {
    return <LoadingScreen message="Cargando detalles de la rifa..." />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <NavLink to="/rifas" className="flex items-center gap-2 text-[#d54ff9] hover:underline text-sm w-full">
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Rifas
        </NavLink>
      </div>
      <div className="mb-6 flex justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-left bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">
          {rifa?.nombre}
        </h1>

        <NavLink to={`/rifas/editar/${id}`} className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#23283a] text-[#d54ff9] text-xs font-semibold">
          <PencilIcon className="w-4 h-4" />
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
      <div className="mb-4">
        <div className="gap-4 grid min-md:grid-cols-4 max-md:grid-cols-2 mb-4">
          {ticketStats.map(stat => (
            <div key={stat.key} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg flex-1">
              <span className={`text-xs text-white`}>{stat.label}</span>
              <span className={`block text-2xl font-bold text-white`}>{stat.count}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="md:flex md:items-end md:justify-end max-md:grid max-md:grid-cols-4 gap-4 w-full">
          <button
            onClick={handleOpenRegistrationModal}
            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0"
            title="Registrar nuevo ticket"
            aria-label="Registrar nuevo ticket">
            <PlusIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-pulse" />
          </button>
          <button
            onClick={handleLoadAllFavorites}
            disabled={loading}
            className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0 disabled:opacity-50 disabled:cursor-wait"
            title="Cargar todos los números favoritos de los jugadores"
          >
            <StarIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-pulse" />
          </button>

          <button
            onClick={handleOpenWinnerModal}
            className="group relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0"
            title="Registrar ganador de la rifa"
            aria-label="Registrar ganador de la rifa"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <TrophyIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-bounce" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </button>
          <button
            onClick={handleShareLink}
            className="group relative overflow-hidden bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0"
            title="Compartir enlace público"
            aria-label="Compartir enlace público"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            <ShareIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-pulse" />
            <span className="hidden sm:inline relative z-10">Compartir</span>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          </button>
          <button
            onClick={handleSendReminders}
            disabled={apartados === 0}
            className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0 disabled:opacity-50 disabled:cursor-not-allowed max-md:col-span-4"
            title="Enviar recordatorio de pago a jugadores con tickets apartados"
          >
            <BellAlertIcon className="w-5 h-5 md:w-6 md:h-6 relative z-10 group-hover:animate-tada" />
            <span className="md:hidden">Enviar recordatorio</span>
            {apartados > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">{apartados}</div>}
          </button>

          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="group relative overflow-hidden bg-gradient-to-r from-pink-500 to-rose-600 text-white px-6 py-3 sm:px-4 sm:py-2 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 min-h-[48px] sm:min-h-0 w-full">
                <PhotoIcon className="w-5 h-5 sm:w-6 sm:h-6 relative z-10 group-hover:animate-pulse" />
                <span className="hidden sm:inline relative z-10">Resumen</span>
                <ChevronDownIcon className="w-5 h-5 text-white/70 hover:text-white relative z-10" aria-hidden="true" />
              </Menu.Button>
            </div>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-[#181c24] shadow-lg ring-1 ring-black/5 focus:outline-none z-50 border border-[#23283a]">
                <div className="px-1 py-1 ">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleGenerateSummary}
                        className={`${active ? 'bg-[#7c3bed] text-white' : 'text-gray-300'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        <PhotoIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        Descargar Imagen
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleGeneratePDF}
                        className={`${active ? 'bg-[#7c3bed] text-white' : 'text-gray-300'
                          } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-2 h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                        </svg>
                        Descargar PDF
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

        </div >
      </div >

      {/* Buscador y Filtros */}
      < div className="flex flex-col sm:flex-row max-md:w-full gap-4 mb-4" >
        {/* Buscador */}
        < div className="relative flex-1  max-md:w-full " >
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ticket... (Ej: 123, Juan, email@ejemplo.com)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#181c24] border border-[#23283a] text-white focus:outline-none focus:border-[#7c3bed] transition-colors placeholder-gray-500"
            title="Busca por número de ticket, nombre del jugador o email. Usa Ctrl+F para enfocar o Escape para limpiar."
          />
          {
            searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )
          }
        </div >

        {/* Filtros */}
        < div className="flex flex-wrap gap-2" >
          {
            filterOptions.map(opt => (
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
                      : filteredTickets.filter(t => t.estado_ticket === opt.key).length
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
                            : opt.key === "abonado"
                              ? allTickets.filter(t => t.estado_ticket === "abonado").length
                              : 0
                  )}
                </span>
              </button>
            ))
          }
          < div className="flex gap-2 mt-2 sm:mt-0 sm:ml-auto" >
            {
              selectedTicketsFromMap.length > 0 ? (
                <>
                  <button
                    onClick={handleProceedWithSelection}
                    className="bg-gradient-to-r from-green-500 to-[#16a249] text-white px-4 py-2 rounded-xl font-bold transition-all duration-200 flex items-center gap-2 shadow-lg hover:scale-105"
                    style={{ minWidth: '140px' }}
                  >
                    <TicketIcon className="w-6 h-6 animate-bounce" />
                    <span>Registrar</span>
                    <span className="ml-2 text-xs bg-black/20 px-2 py-1 rounded">
                      {selectedTicketsFromMap.map(n => formatTicketNumber(n, rifa?.total_tickets)).join(", ")}
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedTicketsFromMap([])}
                    className="bg-gradient-to-r from-gray-600 to-gray-800 text-white px-4 py-2 rounded-xl font-bold transition-all hover:scale-105 shadow"
                    style={{ minWidth: '100px' }}
                  >
                    <XMarkIcon className="w-5 h-5 mr-1" />
                    Limpiar
                  </button>
                </>
              ) : null
            }
          </div >
        </div >
      </div >

      {/* Mapa de tickets */}
      < div ref={pdfRef} className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg overflow-auto" >
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
              <span className="text-gray-300">Abonado</span>
            </div>
          </div>
        </div>

        <motion.div
          layout
          className="grid max-md:grid-cols-6 max-lg:grid-cols-10 min-lg:grid-cols-15 gap-2 max-h-140 overflow-y-scroll"
        >
          <AnimatePresence>
            {filteredTickets.map((ticket) => (
              <motion.div
                layout
                key={ticket.numero_ticket}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div
                  onClick={() => handleTicketClick(ticket)}
                  title={`N°${ticket.numero_ticket} - ${ticket.estado_ticket === "disponible" ? "Disponible - Haz clic para comprar"
                    : ticket.estado_ticket === "apartado" ? `Apartado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                      : ticket.estado_ticket === "pagado" ? `Pagado${ticket.nombre_jugador ? ` por ${ticket.nombre_jugador}` : ""} - Haz clic para ver detalles`
                        : ticket.estado_ticket === "abonado" ? "Abonado"
                          : ""
                    }`}
                  className={`
                w-10 h-10 flex items-center justify-center rounded-lg cursor-pointer
                text-xs font-bold transition-all duration-200 transform hover:scale-110 hover:ring-2 hover:ring-[#7c3bed] hover:shadow-lg
                ${ticket.estado_ticket === "disponible" ? "bg-[#23283a] text-white hover:bg-[#2d3748] border border-[#4a5568]" : ""}
                ${ticket.estado_ticket === "apartado" ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md border border-yellow-500" : ""}
                ${ticket.estado_ticket === "pagado" ? "bg-green-500 text-white hover:bg-green-400 shadow-md border border-green-600" : ""}
                ${ticket.estado_ticket === "abonado" ? "bg-purple-500 text-white hover:bg-purple-400 shadow-md border border-purple-600 opacity-75" : ""}
                ${selectedTicketsFromMap.includes(ticket.numero_ticket) ? "!bg-[#d54ff9] ring-2 ring-white" : ""}
                ${ganador && ganador.numero_ganador === ticket.numero_ticket ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-black font-bold ring-4 ring-white shadow-2xl animate-pulse" : ""}
              `}
                >
                  <div className="flex flex-col items-center justify-center">
                    <span className="leading-none">{ticket.numero_ticket}</span>
                    {ticket.estado_ticket !== "disponible" && (
                      <div className="w-1 h-1 bg-current rounded-full mt-0.5 opacity-60"></div>
                    )}
                  </div>
                </div>
                {ganador && ganador.numero_ganador === ticket.numero_ticket && (
                  <TrophyIcon className="w-4 h-4 absolute top-1 right-1 text-black/70" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Mensaje cuando no hay resultados */}
          {filteredTickets.length === 0 && (
            <AnimatePresence>
              <div className="col-span-full w-full text-center py-12">
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
            </AnimatePresence>
          )}
        </motion.div>
      </div >

      <TicketRegistrationWizard
        isOpen={showRegistrationWizard}
        onClose={() => {
          setShowRegistrationWizard(false);
          setSelectedTicketsFromMap([]);
        }}
        rifa={rifa}
        ticketStatusMap={ticketStatusMap}
        onSuccess={handleRegistrationSuccess}
        initialSelectedNumbers={selectedTicketsFromMap}
      />

      <WinnerRegistrationModal
        isOpen={showWinnerModal}
        onClose={() => setShowWinnerModal(false)}
        rifa={rifa}
        allTickets={allTickets}
        onSuccess={() => {
          fetchRaffle();
          fetchTickets();
          setShowWinnerModal(false);
        }}
      />

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        isOpen={showPlayerGroupModal}
        onClose={closePlayerGroupModal}
        ticket={selectedTicketForDetail}
        playerGroup={selectedPlayerGroup}
        rifa={rifa}
        onStatusUpdate={() => {
          fetchTickets();
          closePlayerGroupModal();
        }}
      />

      <ReminderControlModal
        isOpen={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        players={playersToRemind}
        rifa={rifa}
        empresa={empresa}
        empresaId={empresaId}
      />

      <ReminderReenvioModal
        isOpen={showReenvioModal}
        onClose={() => setShowReenvioModal(false)}
        onConfirm={handleReenvioConfirm}
      />

      {/* Hidden Ticket Summary Grid for Image Generation */}
      <div style={{ position: 'fixed', left: 0, top: 0, zIndex: -1000, opacity: 0, pointerEvents: 'none' }}>
        <TicketSummaryGrid
          ref={summaryGridRef}
          rifa={rifa}
          tickets={allTickets.length >= 1000 ? allTickets.slice(0, 500) : allTickets}
          empresaLogo={logosBase64.empresa}
          systemLogo={logosBase64.system}
        />
        {allTickets.length >= 1000 && (
          <TicketSummaryGrid
            ref={summaryGridRef2}
            rifa={rifa}
            tickets={allTickets.slice(500)}
            empresaLogo={logosBase64.empresa}
            systemLogo={logosBase64.system}
          />
        )}
      </div>
    </div >
  );
}
