import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { toPng, toBlob } from "html-to-image";
import { UserIcon, TicketIcon, CreditCardIcon, MagnifyingGlassIcon, XMarkIcon, PaperAirplaneIcon, ArrowDownTrayIcon, ClipboardIcon, CheckCircleIcon, ClockIcon, DocumentTextIcon, ArrowLeftIcon, BanknotesIcon, DevicePhoneMobileIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import JugadorFormModal from "./JugadorFormModal";
import { useAuth } from "../context/AuthContext";

export function TicketRegistrationWizard({ isOpen, onClose, rifa, ticketStatusMap, onSuccess, initialSelectedNumbers }) {
    const [loading, setLoading] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [jugadores, setJugadores] = useState([]);
    const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
    const [jugadorSearchQuery, setJugadorSearchQuery] = useState("");
    const [selectedJugador, setSelectedJugador] = useState("");
    const [favoritos, setFavoritos] = useState([]);
    const [customNumero, setCustomNumero] = useState("");
    const [singleCustomNumberInput, setSingleCustomNumberInput] = useState("");
    const [generatedTicketInfo, setGeneratedTicketInfo] = useState(null);
    const [esAbono, setEsAbono] = useState(false);
    const [metodoPago, setMetodoPago] = useState("efectivo");
    const [referenciaPago, setReferenciaPago] = useState("");
    const [monto, setMonto] = useState(rifa?.precio_ticket || 0);
    const [montoAbono, setMontoAbono] = useState("");
    const ticketRef = useRef();
    const { empresaId } = useAuth();

    const [empresa, setEmpresa] = useState("");
    useEffect(() => {
        const fetchEmpresa = async () => {
            if (empresaId) {
                const { data: empresa, error } = await supabase
                    .from('t_empresas')
                    .select('nombre_empresa')
                    .eq('id_empresa', empresaId)
                    .single();

                if (error) {
                    console.error('Error fetching empresa:', error);
                } else if (empresa) {
                    setEmpresa(empresa.nombre_empresa);
                }
            }
        };

        fetchEmpresa();
    }, [empresaId]);

    useEffect(() => {
        if (isOpen) {
            setCustomNumero(initialSelectedNumbers.sort((a, b) => a - b).join(', '));
            setWizardStep(1);
        }
    }, [isOpen, initialSelectedNumbers]);

    useEffect(() => {
        const fetchAllJugadores = async () => {
            if (isOpen && empresaId) {
                setLoading(true);
                try {
                    let allJugadores = [];
                    let from = 0;
                    let to = 999;
                    let hasMore = true;

                    while (hasMore) {
                        const { data, error } = await supabase
                            .from("vw_jugadores")
                            .select("*")
                            .eq("empresa_id", empresaId)
                            .order("nombre", { ascending: true })
                            .range(from, to);

                        if (error) {
                            toast.error("Error al cargar jugadores.");
                            hasMore = false;
                        } else {
                            allJugadores = [...allJugadores, ...data];
                            if (data.length < 1000) {
                                hasMore = false;
                            } else {
                                from += 1000;
                                to += 1000;
                            }
                        }
                    }
                    setJugadores(allJugadores);
                } catch (error) {
                    console.error("Error fetching players:", error);
                    toast.error("Error inesperado al cargar jugadores.");
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchAllJugadores();
    }, [isOpen, empresaId]);

    useEffect(() => {
        if (selectedJugador) {
            const jugador = jugadores.find(j => j.id == selectedJugador);
            const rawFavoritos = jugador?.numeros_favoritos || [];
            const formattedFavoritos = rawFavoritos.map(num => formatTicketNumber(num, rifa?.total_tickets));
            setFavoritos(formattedFavoritos);
        } else {
            setFavoritos([]);
        }
    }, [selectedJugador, jugadores, rifa?.total_tickets]);

    const numerosSeleccionados = useMemo(() => {
        return [...new Set(customNumero.split(',').map(n => n.trim()).filter(n => n.length > 0))];
    }, [customNumero]);

    const filteredJugadores = useMemo(() => {
        if (!jugadorSearchQuery) return jugadores;
        const query = jugadorSearchQuery.toLowerCase();

        const filtered = jugadores.filter(j =>
            `${j.nombre} ${j.apellido}`.toLowerCase().includes(query) ||
            (j.telefono && String(j.telefono).includes(query))
        );

        return filtered.sort((a, b) => {
            const aName = `${a.nombre} ${a.apellido}`.toLowerCase();
            const bName = `${b.nombre} ${b.apellido}`.toLowerCase();

            const aNameStartsWith = aName.startsWith(query);
            const bNameStartsWith = bName.startsWith(query);

            if (aNameStartsWith && !bNameStartsWith) {
                return -1; // a comes first
            }
            if (!aNameStartsWith && bNameStartsWith) {
                return 1; // b comes first
            }

            // If both start with query or neither do, sort alphabetically
            return aName.localeCompare(bName);
        });
    }, [jugadores, jugadorSearchQuery]);

    const handleClose = () => {
        setJugadorSearchQuery("");
        setSelectedJugador("");
        setCustomNumero("");
        setGeneratedTicketInfo(null);
        setWizardStep(1);
        setMetodoPago("efectivo");
        setReferenciaPago("");
        onClose();
    };

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
        const { data: newJugador, error } = await supabase.from("t_jugadores").insert([{ ...playerData, empresa_id: empresaId }]).select().single();
        if (error) {
            toast.error("Error al guardar el jugador: " + error.message);
        } else {
            toast.success("¡Jugador agregado correctamente!");
            const updatedJugadores = [...jugadores, newJugador];
            setJugadores(updatedJugadores);
            setSelectedJugador(newJugador.id);
            setShowNewPlayerModal(false);
            setWizardStep(2);
        }
        setLoading(false);
    };

    const handleFavNumberToggle = (formattedNum) => {
        const newNumbers = numerosSeleccionados.includes(formattedNum) ? numerosSeleccionados.filter(n => n !== formattedNum) : [...numerosSeleccionados, formattedNum];
        setCustomNumero(newNumbers.sort((a, b) => parseInt(a) - parseInt(b)).join(', '));
    };

    const handleSelectAllFavoritos = () => {
        const unavailable = favoritos.filter(formattedNum => ticketStatusMap.get(formattedNum) !== 'disponible');
        if (unavailable.length > 0) toast.info(`Los números favoritos ${unavailable.join(', ')} no están disponibles.`);

        const available = favoritos.filter(formattedNum => ticketStatusMap.get(formattedNum) === 'disponible');
        const newNumbersToAdd = available.filter(formattedNum => !numerosSeleccionados.includes(formattedNum));

        if (newNumbersToAdd.length > 0) {
            const newSelection = [...numerosSeleccionados, ...newNumbersToAdd].sort((a, b) => parseInt(a) - parseInt(b));
            setCustomNumero(newSelection.join(', '));
            toast.success(`${newNumbersToAdd.length} número(s) favorito(s) agregado(s).`);
        } else if (available.length > 0) {
            toast.info("Todos tus favoritos disponibles ya están en la selección.");
        } else if (favoritos.length === 0) {
            toast.info("No tienes números favoritos para seleccionar.");
        }
    };

    const handleAddCustomNumber = () => {
        const num = singleCustomNumberInput.trim();
        if (!num || num.length === 0) {
            toast.error(`Ingresa un número válido.`);
            return;
        }

        const formattedNum = formatTicketNumber(num, rifa?.total_tickets);

        if (numerosSeleccionados.includes(formattedNum)) {
            toast.info(`El número ${formattedNum} ya está en tu selección.`);
            setSingleCustomNumberInput("");
            return;
        }
        if (ticketStatusMap.get(formattedNum) !== 'disponible') {
            toast.error(`El número ${formattedNum} no está disponible.`);
            setSingleCustomNumberInput("");
            return;
        }
        const newNumbers = [...numerosSeleccionados, formattedNum];
        setCustomNumero(newNumbers.sort((a, b) => parseInt(a) - parseInt(b)).join(', '));
        setSingleCustomNumberInput("");
    };

    const handleRemoveFromSelection = (numToRemove) => {
        const newNumbers = numerosSeleccionados.filter(n => n !== numToRemove);
        setCustomNumero(newNumbers.join(', '));
    };

    const handleProceedToConfirmation = () => {
        const unavailableNumbers = numerosSeleccionados.filter(formattedNum => ticketStatusMap.get(formattedNum) !== 'disponible');
        if (unavailableNumbers.length > 0) {
            toast.error(`Los siguientes números ya no están disponibles: ${unavailableNumbers.join(', ')}`);
            const availableNumbers = numerosSeleccionados.filter(formattedNum => !unavailableNumbers.includes(formattedNum));
            setCustomNumero(availableNumbers.sort((a, b) => parseInt(a) - parseInt(b)).join(', '));
        } else if (numerosSeleccionados.length > 0) {
            setWizardStep(3);
        } else {
            toast.info("Por favor, selecciona al menos un número.");
        }
    };

    const handleApartarTickets = async () => {
        setLoading(true);
        if (numerosSeleccionados.length === 0) {
            toast.error("Debes seleccionar al menos un número");
            setLoading(false);
            return;
        }

        const { data: taken, error: checkError } = await
            supabase.from("t_tickets")
                .select("numero, jugador_id")
                .eq("empresa_id", empresaId)
                .eq("rifa_id", rifa.id_rifa)
                .in("numero", numerosSeleccionados);

        if (checkError) {
            toast.error("Error al verificar los tickets: " + checkError.message);
            setLoading(false);
            return;
        }

        if (taken && taken.length > 0) {
            const otherUserTickets = taken.filter(t => t.jugador_id !== selectedJugador);
            if (otherUserTickets.length > 0) {
                toast.error(`Los números ${otherUserTickets.map(t => t.numero).join(', ')} ya están ocupados. Por favor, elige otros.`);
                setLoading(false);
                setWizardStep(2);
                onSuccess(true); // Soft refresh
                return;
            }
            toast.info("Estos tickets ya están apartados a tu nombre. Procediendo al pago.");
            setWizardStep(4);
            setLoading(false);
            return;
        }

        const fechaApartado = new Date().toISOString();
        const { error: insertError } = await supabase.from("t_tickets").insert(
            numerosSeleccionados.map(numero => ({
                rifa_id: rifa.id_rifa,
                jugador_id: selectedJugador,
                numero: numero, // <--- Los números ya están formateados
                estado: "apartado",
                empresa_id: rifa.empresa_id || null,
                fecha_apartado: fechaApartado
            }))
        );
        if (!insertError) {
            toast.success(`Ticket(s) apartado(s) correctamente. Procede con el pago.`);
            onSuccess(true); // Soft refresh
            setWizardStep(4);
        } else {
            toast.error("Error al apartar los tickets: " + insertError.message);
        }
        setLoading(false);
    };

    const handleConfirmarPago = async () => {
        setLoading(true);
        const fechaPago = new Date().toISOString();
        const jugador = jugadores.find(j => j.id == selectedJugador);
        const montoPorTicket = rifa?.precio_ticket || 0;
        const montoTotal = montoPorTicket * numerosSeleccionados.length;

        // Validar que el monto no sea mayor al total de los tickets seleccionados
        if (monto > montoTotal) {
            toast.error(`El monto no puede ser mayor al valor total de $${montoTotal.toFixed(2)}`);
            setLoading(false);
            return;
        }

        try {
            // Procesar cada ticket individualmente
            for (const numero of numerosSeleccionados) {
                const updateData = {
                    estado: 'pagado',
                    estado_pago: 'completado',
                    fecha_pago: fechaPago,
                    updated_at: fechaPago
                };

                console.log('Updating ticket:', {
                    empresa_id: empresaId,
                    rifa_id: rifa?.id_rifa,
                    numero: numero,
                    jugador_id: selectedJugador
                });

                let { error: updateError } = await supabase
                    .from("t_tickets")
                    .update(updateData)
                    .eq("empresa_id", empresaId)
                    .eq("rifa_id", rifa.id_rifa)
                    .eq("numero", numero)
                    .eq("jugador_id", selectedJugador);

                if (updateError && updateError.message?.includes('t_tickets_estado_check')) {
                    const fallbackData = {
                        estado: 'pagado',
                        estado_pago: 'completado',
                        updated_at: fechaPago
                    };

                    const { error: fallbackError } = await supabase
                        .from("t_tickets")
                        .update(fallbackData)
                        .eq("empresa_id", empresaId)
                        .eq("rifa_id", rifa.id_rifa)
                        .eq("numero", numero)
                        .eq("jugador_id", selectedJugador);

                    if (fallbackError) {
                        throw new Error(`Error al actualizar el ticket ${numero}: ` + fallbackError.message);
                    }
                } else if (updateError) {
                    throw new Error(`Error al actualizar el ticket ${numero}: ` + updateError.message);
                }
            } // Cierre del for loop

            // Buscar los tickets afectados para enlazar el pago a un ticket específico
            let ticketIdToLink = null;
            try {
                const { data: ticketsRows, error: tkErr } = await supabase
                    .from("t_tickets")
                    .select("id, ticket_id, numero")
                    .eq("empresa_id", empresaId)
                    .eq("rifa_id", rifa.id_rifa)
                    .eq("jugador_id", selectedJugador)
                    .in("numero", numerosSeleccionados);

                if (!tkErr && ticketsRows && ticketsRows.length > 0) {
                    ticketIdToLink = ticketsRows[0]?.id || ticketsRows[0]?.ticket_id || null;
                }
            } catch (e) {
                console.error("Error fetching ticket ID:", e);
                // Continuar sin ticket_id si hay error
            }

            // Mapear banco de forma consistente
            const bancoMapped =
                metodoPago === 'efectivo' ? 'Efectivo' :
                    metodoPago === 'pago_movil' ? 'Pago Móvil' :
                        metodoPago === 'zelle' ? 'Zelle' :
                            metodoPago === 'transferencia' ? 'Transferencia Bancaria' : 'Otro';

            const pagoData = {
                jugador_id: selectedJugador,
                monto: monto, // Usar el monto del estado en lugar del total
                banco: bancoMapped,
                telefono: jugador?.telefono || null,
                cedula: jugador?.cedula || null,
                referencia_bancaria: referenciaPago || null,
                metodo_pago: metodoPago,
                empresa_id: empresaId,
                tipo_pago: 'completo',
                notas: null,
                rifa_id: rifa?.id_rifa || rifa?.id || null,
                fecha_pago: fechaPago,
                es_abono: false,
                ticket_id: ticketIdToLink
            };

            const { error: pagoError } = await supabase.from("t_pagos").insert([pagoData]);

            if (pagoError) {
                throw new Error("Error al registrar el pago: " + pagoError.message);
            }

            // Actualizar la interfaz de usuario
            toast.success("Pago registrado exitosamente");
            onSuccess(true);

            setGeneratedTicketInfo({
                jugador: `${jugador?.nombre} ${jugador?.apellido}`,
                telefono: jugador?.telefono,
                rifa: rifa?.nombre,
                numeros: numerosSeleccionados,
                total: montoTotal.toFixed(2),
                montoPagado: montoTotal.toFixed(2),
                metodoPago: metodoPago,
                referencia: referenciaPago || 'N/A',
                esAbono: false,
                fecha: new Date()
            });

            setWizardStep(6);

        } catch (error) {
            console.error("Error en handleConfirmarPago:", error);
            toast.error(error.message || "Ocurrió un error al procesar el pago");
        } finally {
            setLoading(false);
        }

        // Buscar los tickets afectados para enlazar el pago a un ticket específico (como en PaymentForm)
        let ticketIdToLink = null;
        try {
            const { data: ticketsRows, error: tkErr } = await supabase
                .from("t_tickets")
                .select("id, ticket_id, numero")
                .eq("empresa_id", empresaId)
                .eq("rifa_id", rifa.id_rifa)
                .eq("jugador_id", selectedJugador)
                .in("numero", numerosSeleccionados);
            if (!tkErr && ticketsRows && ticketsRows.length > 0) {
                ticketIdToLink = ticketsRows[0]?.id || ticketsRows[0]?.ticket_id || null;
            }
        } catch (e) {
            // Si falla, continuamos sin ticket_id; el historial por ticket no mostrará este pago
        }

        // Mapear banco de forma consistente con PaymentForm
        const bancoMapped =
            metodoPago === 'efectivo' ? 'Efectivo' :
                metodoPago === 'pago_movil' ? 'Pago Móvil' :
                    metodoPago === 'zelle' ? 'Zelle' :
                        metodoPago === 'transferencia' ? 'Transferencia Bancaria' : 'Otro';

        const pagoData = {
            jugador_id: selectedJugador,
            monto: montoTotal,
            banco: bancoMapped,
            telefono: jugador?.telefono || null,
            cedula: jugador?.cedula || null,
            referencia_bancaria: referenciaPago || null,
            metodo_pago: metodoPago,
            empresa_id: empresaId,
            tipo_pago: 'completo',
            notas: null,
            rifa_id: rifa?.id_rifa || rifa?.id || null,
            fecha_pago: fechaPago,
            es_abono: false,
            ticket_id: ticketIdToLink
        };

        const { error: pagoError } = await supabase.from("t_pagos").insert([pagoData]);

        if (pagoError) {
            console.error("Error al registrar el pago:", pagoError);
            toast.error("El pago se confirmó, pero hubo un error al registrar el detalle del pago.");
        }

        const mensaje = `Pago completo confirmado para ${jugador?.nombre}`;

        toast.success(mensaje);
        onSuccess(true);

        setGeneratedTicketInfo({
            jugador: `${jugador.nombre} ${jugador.apellido}`,
            telefono: jugador.telefono,
            rifa: rifa?.nombre,
            numeros: numerosSeleccionados,
            total: montoTotal.toFixed(2),
            montoPagado: montoTotal.toFixed(2),
            metodoPago: metodoPago,
            referencia: referenciaPago || 'N/A',
            esAbono: false,
            fecha: new Date()
        });
        setWizardStep(6);
        setLoading(false);
    };

    const handleDownloadTicket = async () => {
        if (!ticketRef.current) return toast.error("No se encontró la referencia del ticket.");
        try {
            const dataUrl = await toPng(ticketRef.current, { cacheBust: true, quality: 0.95, pixelRatio: 2, backgroundColor: '#FFF' });
            const link = document.createElement('a');
            link.download = `ticket-rifa-${generatedTicketInfo?.jugador?.replace(/\s/g, '_') || 'jugador'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error("Error al generar la imagen del ticket:", error);
            toast.error("Ocurrió un error al generar la imagen del ticket.");
        }
    };

    const handleCopyTicket = async () => {
        if (!ticketRef.current) return toast.error("No se encontró la referencia del ticket.");
        try {
            const blob = await toBlob(ticketRef.current, { cacheBust: true, quality: 0.95, pixelRatio: 2, backgroundColor: '#fff' });
            if (blob) {
                await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                toast.success('¡Imagen del ticket copiada al portapapeles!');
            }
        } catch (error) {
            console.error('Error al copiar la imagen:', error);
            toast.error('No se pudo copiar la imagen. Tu navegador podría no ser compatible.');
        }
    };

    const handleSendWhatsApp = () => {
        if (!generatedTicketInfo?.telefono) return toast.error("Este jugador no tiene un número de teléfono registrado.");

        const { jugador, rifa: nombreRifa, numeros, total, montoPagado, esAbono } = generatedTicketInfo;
        const ticketCount = numeros.length;
        const pricePerTicket = rifa?.precio_ticket || 0;

        const ticketNumbers = numeros.map(num => formatTicketNumber(num, rifa?.total_tickets)).join(', ');

        let message = `*${empresa}*\n\n`;
        message += `Hola ${jugador}! 👋\n\n`;
        message += `*Rifa:* ${nombreRifa}\n`;
        message += `*Fecha:* ${new Date().toLocaleDateString('es-ES')}\n\n`;
        message += `*Tus números:* ${ticketNumbers}\n`;

        message += `*Estado del pago:* ✅ *Completo*\n`;
        message += `*Total pagado:* $${total}\n\n`;
        message += `¡Muchas gracias por tu pago! Tu participación está confirmada. 🎉\n\n`;

        message += `¡Mucha suerte! 🍀\n`;
        message += `_Equipo ${empresa}_`;

        // Normalizar teléfono (E.164 sin '+') para WhatsApp
        const rawDigits = (generatedTicketInfo.telefono || '').replace(/\D/g, '');
        let phoneForWa = rawDigits;
        if (rawDigits.length === 11 && rawDigits.startsWith('0')) {
            phoneForWa = `58${rawDigits.slice(1)}`;
        } else if (rawDigits.length === 10 && /^4\d{9}$/.test(rawDigits)) {
            phoneForWa = `58${rawDigits}`;
        } else if (rawDigits.startsWith('58')) {
            phoneForWa = rawDigits;
        }

        const whatsappUrl = `https://wa.me/${phoneForWa}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const formatTicketNumber = (number, totalTickets) => {
        if (number == null || totalTickets == null) return number;
        const numDigits = String(totalTickets - 1).length;
        return String(number).padStart(Math.max(3, numDigits), "0");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className={`bg-[#181c24] border border-[#23283a] rounded-xl w-full ${wizardStep === 4 ? 'max-w-lg' : wizardStep === 6 ? 'max-w-sm' : 'max-w-lg'} p-4 shadow-2xl relative transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]`}>
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a] z-10"><XMarkIcon className="w-5 h-5" /></button>

                {wizardStep === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><UserIcon className="w-6 h-6 text-[#7c3bed]" /></div>
                            <h2 className="text-xl font-bold text-white mb-2">Selecciona un jugador</h2>
                            <p className="text-gray-400 text-sm">Elige el jugador que comprará el ticket</p>
                        </div>
                        <div className="space-y-4 relative">
                            <div className="relative">
                                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" placeholder="Buscar jugador por nombre o teléfono..." value={jugadorSearchQuery} onChange={(e) => { setJugadorSearchQuery(e.target.value); if (selectedJugador) setSelectedJugador(""); }} className="w-full pl-10 pr-4 py-3 rounded-lg bg-[#23283a] border border-[#2d3748] text-white focus:outline-none focus:border-[#7c3bed] transition-colors" />
                            </div>
                            {jugadorSearchQuery && !selectedJugador && (
                                <div className="absolute top-full left-0 right-0 z-10 max-h-60 overflow-y-auto bg-[#23283a] border border-[#2d3748] rounded-lg mt-1 shadow-lg">
                                    {loading && <div className="p-4 text-center text-gray-400">Buscando...</div>}
                                    {!loading && filteredJugadores.length > 0 ? (filteredJugadores.map(j => (<div key={j.id} onClick={() => handleSelectJugador(j)} className="px-4 py-3 hover:bg-[#7c3bed] cursor-pointer transition-colors border-b border-[#2d3748] last:border-b-0"><p className="text-white font-medium">{j.nombre} {j.apellido}</p><p className="text-sm text-gray-400">{j.telefono}</p></div>))) : (!loading && <div className="px-4 py-3 text-gray-400">No se encontraron jugadores.</div>)}
                                </div>
                            )}
                            {selectedJugador && (<div className="bg-green-900/50 border border-green-500/30 rounded-lg p-3 flex items-center justify-between mt-2"><p className="text-white font-medium">{jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}</p><button onClick={handleClearSelection} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-red-500/20"><XMarkIcon className="w-5 h-5" /></button></div>)}
                        </div>
                        <div className="flex justify-between pt-4">
                            <button onClick={() => setShowNewPlayerModal(true)} className="bg-[#4CAF50] hover:bg-[#3e8e41] text-white px-6 py-3 rounded-lg font-semibold transition-all">Agregar jugador</button>
                            <button disabled={!selectedJugador} onClick={() => setWizardStep(numerosSeleccionados.length > 0 ? 3 : 2)} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">Siguiente</button>
                        </div>
                        <div className="flex space-x-2"><div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div></div>
                    </div>
                )}

                {wizardStep === 2 && (
                    <div className="space-y-6">
                        <div className="text-center"><div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><TicketIcon className="w-6 h-6 text-[#7c3bed]" /></div><h2 className="text-xl font-bold text-white mb-2">Elige tus números</h2><p className="text-gray-400 text-sm">Selecciona los números favoritos o ingresa números personalizados</p></div>
                        <div className="space-y-4">
                            {favoritos.length > 0 && (<div><div className="flex justify-between items-center mb-3"><label className="block text-sm font-medium text-gray-300">Números favoritos</label><button onClick={handleSelectAllFavoritos} className="text-xs bg-[#23283a] hover:bg-[#7c3bed] px-3 py-1 rounded-md transition-colors" disabled={favoritos.length === 0}>Marcar todos</button></div><div className="grid grid-cols-5 gap-2 p-3 bg-[#23283a] rounded-lg max-h-32 overflow-y-auto">{favoritos.map(num => (<div key={num} onClick={() => handleFavNumberToggle(num)} className={`p-2 text-center rounded-md cursor-pointer transition-all hover:scale-105 ${numerosSeleccionados.includes(num) ? 'bg-[#7c3bed] text-white shadow-lg' : 'bg-[#0f131b] text-gray-300 hover:bg-[#1a1f2e]'}`}>{num}</div>))}</div></div>)}
                            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-600"></div></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-[#181c24] text-gray-400">o</span></div></div>
                            <div className="space-y-2"><label className="block text-sm font-medium text-gray-300">Agregar otro número</label><div className="flex items-center gap-2"><input type="number" value={singleCustomNumberInput} onChange={e => setSingleCustomNumberInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomNumber(); } }} placeholder={`1 - ${rifa?.total_tickets || 1000}`} className="flex-1 bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors" /><button type="button" onClick={handleAddCustomNumber} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-3 rounded-lg font-bold text-lg leading-none">+</button></div></div>
                            {numerosSeleccionados.length > 0 && (<div className="pt-4 border-t border-[#2d3748]"><h3 className="text-sm font-medium text-gray-300 mb-2">Números seleccionados ({numerosSeleccionados.length})</h3><div className="flex flex-wrap gap-2 p-3 bg-[#0f131b] rounded-lg max-h-28 overflow-y-auto">{numerosSeleccionados.sort((a, b) => a - b).map((num) => (<span key={num} className="inline-flex items-center bg-[#7c3bed] text-white px-2 py-1 rounded-md font-mono text-xs">{num}<button type="button" onClick={() => handleRemoveFromSelection(num)} className="ml-1.5 text-white/70 hover:text-white font-bold" title={`Quitar número ${num}`}>&times;</button></span>))}</div></div>)}
                        </div>
                        <div className="flex justify-between items-center pt-4"><button onClick={() => setWizardStep(1)} className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Atrás</button><button disabled={numerosSeleccionados.length === 0} onClick={handleProceedToConfirmation} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all">Siguiente</button></div>
                        <div className="flex space-x-2"><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div></div>
                    </div>
                )}

                {wizardStep === 3 && (
                    <div className="space-y-6">
                        <div className="text-center"><div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><CreditCardIcon className="w-6 h-6 text-green-500" /></div><h2 className="text-xl font-bold text-white mb-2">Confirmar registro</h2><p className="text-gray-400 text-sm">Revisa los detalles antes de confirmar</p></div>
                        <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                            <div className="flex items-center space-x-3"><UserIcon className="w-5 h-5 text-[#7c3bed]" /><div><p className="text-sm text-gray-400">Jugador</p><p className="text-white font-medium">{jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}</p></div></div>
                            <div className="flex items-start space-x-3"><TicketIcon className="w-5 h-5 text-[#7c3bed] mt-0.5" /><div><p className="text-sm text-gray-400">Números seleccionados</p><div className="flex flex-wrap gap-1 mt-1">{numerosSeleccionados.map((num, index) => (<span key={index} className="bg-[#7c3bed] text-white px-2 py-1 rounded text-sm font-mono">{formatTicketNumber(num, rifa?.total_tickets)}</span>))}</div></div></div>
                            <div className="flex items-center space-x-3"><CreditCardIcon className="w-5 h-5 text-[#7c3bed]" /><div><p className="text-sm text-gray-400">Total a pagar</p><p className="text-white font-medium">${(rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2)}</p></div></div>
                        </div>
                        <div className="flex justify-between items-center pt-4"><button onClick={() => setWizardStep(2)} className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Atrás</button><button onClick={handleApartarTickets} disabled={loading} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2">{loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Apartando...</span></>) : (<span>Apartar y Proceder al Pago</span>)}</button></div>
                        <div className="flex space-x-2"><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div></div>
                    </div>
                )}

                {wizardStep === 4 && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Header fijo */}
                        <div className="flex-shrink-0 text-center space-y-2 pb-4 border-b border-gray-700">
                            <div className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-lg">
                                <CreditCardIcon className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Registrar Pago</h2>
                                <p className="text-gray-400 text-xs">Confirma tu método de pago</p>
                            </div>
                        </div>

                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-[#7c3bed] scrollbar-track-[#23283a] hover:scrollbar-thumb-[#d54ff9]">
                            {/* Tipo de Pago compacto */}
                            <div className="bg-[#23283a] rounded-lg p-4 border border-[#2d3748]">
                                <label className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                                    Tipo de Pago
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEsAbono(false)}
                                        className={`p-3 rounded-lg border-2 transition-all ${!esAbono
                                            ? 'border-green-500 bg-green-500/10 text-green-400'
                                            : 'border-[#2d3748] bg-[#181c24] text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="text-center space-y-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${!esAbono ? 'bg-green-500 text-white' : 'bg-gray-600 text-gray-400'
                                                }`}>
                                                <CheckCircleIcon className="w-4 h-4" />
                                            </div>
                                            <div className="text-xs font-medium">Pago Completo</div>
                                            <div className="text-xs opacity-75">${(rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2)}</div>
                                        </div>
                                        {!esAbono && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                                <CheckCircleIcon className="w-2 h-2 text-white" />
                                            </div>
                                        )}
                                    </button>


                                </div>
                            </div>

                            {/* Método de pago compacto */}
                            <div className="bg-[#23283a] rounded-lg p-4 border border-[#2d3748]">
                                <label className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    Método de Pago
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'efectivo', name: 'Efectivo', icon: BanknotesIcon, color: 'green', description: 'Pago en efectivo' },
                                        { id: 'transferencia', name: 'Transferencia', icon: ArrowDownTrayIcon, color: 'blue', description: 'Transferencia bancaria' },
                                        { id: 'pago_movil', name: 'Pago Móvil', icon: DevicePhoneMobileIcon, color: 'purple', description: 'Pago móvil' },
                                        { id: 'zelle', name: 'Zelle', icon: CurrencyDollarIcon, color: 'yellow', description: 'Zelle' },
                                        { id: 'otro', name: 'Otro', icon: DocumentTextIcon, color: 'gray', description: 'Otro método' }
                                    ].map((metodo) => {
                                        const Icon = metodo.icon;
                                        const isSelected = metodoPago === metodo.name;
                                        return (
                                            <button
                                                key={metodo.name}
                                                type="button"
                                                onClick={() => setMetodoPago(metodo.name)}
                                                className={`group p-3 rounded-lg border-2 transition-all ${isSelected
                                                    ? `border-${metodo.color}-500 bg-${metodo.color}-500/10`
                                                    : 'border-[#2d3748] bg-[#181c24] hover:border-gray-600'
                                                    }`}
                                            >
                                                <div className="text-center space-y-1">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isSelected ? `bg-${metodo.color}-500 text-white` : 'bg-gray-600 text-gray-400'
                                                        }`}>
                                                        <Icon className="w-3 h-3" />
                                                    </div>
                                                    <div className="text-xs font-medium text-white">{metodo.name}</div>
                                                </div>
                                                {isSelected && (
                                                    <div className={`absolute -top-1 -right-1 w-3 h-3 bg-${metodo.color}-500 rounded-full flex items-center justify-center`}>
                                                        <CheckCircleIcon className="w-1.5 h-1.5 text-white" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Referencia compacta */}
                            {metodoPago !== 'efectivo' && (
                                <div className="bg-[#23283a] rounded-lg p-4 border border-[#2d3748]">
                                    <label className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                        Número de Referencia
                                        <span className="text-xs text-gray-400">(Opcional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={referenciaPago}
                                        onChange={(e) => setReferenciaPago(e.target.value)}
                                        placeholder="Ej: V-12345678"
                                        className="w-full px-3 py-2 bg-[#181c24] border border-[#2d3748] rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors text-sm"
                                    />
                                </div>
                            )}

                            {/* Resumen compacto */}
                            {generatedTicketInfo && (
                                <div className="bg-[#23283a] rounded-lg p-4 border border-[#2d3748] space-y-3">
                                    <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                                        Resumen del pago
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between items-center py-2 px-3 bg-[#181c24] rounded border border-[#2d3748]">
                                            <span className="text-gray-400 font-medium">Jugador:</span>
                                            <span className="text-white font-bold text-sm max-w-32 truncate">{generatedTicketInfo.jugador}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-3 bg-[#181c24] rounded border border-[#2d3748]">
                                            <span className="text-gray-400 font-medium">Números:</span>
                                            <span className="text-white font-bold text-sm">{generatedTicketInfo.numeros.length}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-3 bg-[#181c24] rounded border border-[#2d3748]">
                                            <span className="text-gray-400 font-medium">Precio x ticket:</span>
                                            <span className="text-white font-bold text-sm">${rifa?.precio_ticket}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2 px-3 bg-[#181c24] rounded border border-[#2d3748]">
                                            <span className="text-gray-400 font-medium">Total:</span>
                                            <span className="text-white font-bold text-sm">${generatedTicketInfo.total}</span>
                                        </div>

                                        {generatedTicketInfo.esAbono && (
                                            <div className="flex justify-between items-center py-3 px-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                                                <span className="text-yellow-400 font-bold text-sm">Abono:</span>
                                                <span className="text-yellow-400 font-bold text-base">${generatedTicketInfo.montoPagado}</span>
                                            </div>
                                        )}

                                        <div className={`flex justify-between items-center py-3 px-3 rounded text-lg font-bold ${generatedTicketInfo.esAbono ? 'bg-yellow-900/20 border border-yellow-500/30 text-yellow-400' : 'bg-green-900/20 border border-green-500/30 text-green-400'
                                            }`}>
                                            <span>{generatedTicketInfo.esAbono ? 'Abono a pagar:' : 'Total pagado:'}</span>
                                            <span>${generatedTicketInfo.total}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Botones fijos abajo */}
                        <div className="flex-shrink-0 border-t border-gray-700 pt-4 mt-auto">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setWizardStep(3)}
                                    className="flex-1 px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeftIcon className="w-4 h-4" />
                                    <span className="text-sm">Atrás</span>
                                </button>
                                <button
                                    onClick={handleConfirmarPago}
                                    disabled={loading || (esAbono && (!montoAbono || parseFloat(montoAbono) <= 0))}
                                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                            <span className="text-sm">Procesando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-4 h-4" />
                                            <span className="text-sm">{esAbono ? 'Registrar Abono' : 'Confirmar Pago'}</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Indicadores de progreso */}
                            <div className="flex justify-center space-x-2 mt-4">
                                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                                <div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div>
                            </div>
                        </div>
                    </div>
                )}

                {wizardStep === 6 && generatedTicketInfo && (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Header fijo */}
                        <div className="flex-shrink-0 text-center pb-4 border-b border-gray-700">
                            <div className="bg-green-500/20 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <TicketIcon className="w-5 h-5 text-green-500" />
                            </div>
                            <h2 className="text-lg font-bold text-white mb-1">¡Registro Exitoso!</h2>
                            <p className="text-gray-400 text-xs">Comprobante de participación</p>
                        </div>

                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-thumb-[#7c3bed] scrollbar-track-[#23283a] hover:scrollbar-thumb-[#d54ff9]">
                            {/* Ticket compacto */}
                            <div ref={ticketRef} className="bg-[#fff] border border-[#23283a] rounded-lg p-3 space-y-3">
                                {/* Header del ticket */}
                                <div className="text-center border-b border-gray-600 pb-2">
                                    <h3 className="text-lg font-bold text-[#7c3bed] mb-1">{generatedTicketInfo.rifa}</h3>
                                    <p className="text-xs text-[#23283a]">Comprobante de Participación</p>
                                </div>

                                {/* Información del jugador - Diseño adaptativo */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="min-h-0">
                                        <span className="text-[#23283a] block text-xs">Jugador:</span>
                                        <span className="text-black font-medium truncate text-xs leading-tight">{generatedTicketInfo.jugador}</span>
                                    </div>
                                    <div className="min-h-0">
                                        <span className="text-[#23283a] block text-xs">Teléfono:</span>
                                        <span className="text-black text-xs leading-tight">{generatedTicketInfo.telefono || 'N/A'}</span>
                                    </div>
                                    <div className="min-h-0">
                                        <span className="text-[#23283a] block text-xs">Método:</span>
                                        <span className="text-black text-xs leading-tight">{generatedTicketInfo.metodoPago}</span>
                                    </div>
                                    <div className="min-h-0">
                                        <span className="text-[#23283a] block text-xs">Fecha:</span>
                                        <span className="text-black text-xs leading-tight">{generatedTicketInfo.fecha.toLocaleDateString('es-ES')}</span>
                                    </div>
                                    {generatedTicketInfo.referencia && generatedTicketInfo.referencia !== 'N/A' && (
                                        <div className="col-span-2 min-h-0">
                                            <span className="text-[#23283a] block text-xs">Referencia:</span>
                                            <span className="text-black text-xs leading-tight">{generatedTicketInfo.referencia}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Información específica de abonos - Diseño adaptativo */}
                                {generatedTicketInfo && (
                                    <div className="text-center border-t border-gray-700 pt-2">
                                        <div className="text-black text-sm mb-1">Total Pagado:</div>
                                        <div className="text-green-400 font-bold text-lg">${generatedTicketInfo.total}</div>
                                    </div>
                                )}

                                {/* Números adquiridos - Diseño adaptativo */}
                                <div className="border-t border-gray-600 pt-2">
                                    <p className="text-black text-xs mb-2 text-center">Números Adquiridos:</p>
                                    <div className="flex flex-wrap gap-1 justify-center ">
                                        {generatedTicketInfo.numeros.map(num => {
                                            const numeroCount = generatedTicketInfo.numeros.length;
                                            const numeroSize = numeroCount <= 5 ? 'text-base' : numeroCount <= 10 ? 'text-sm' : numeroCount <= 20 ? 'text-xs' : 'text-xs';
                                            const paddingSize = numeroCount <= 5 ? 'px-3 py-1.5' : numeroCount <= 10 ? 'px-2 py-1' : numeroCount <= 20 ? 'px-2 py-0.5' : 'px-1.5 py-0.5';

                                            return (
                                                <span key={num} className={`bg-[#7c3bed] text-white font-mono font-bold rounded ${paddingSize} ${numeroSize}`}>
                                                    {formatTicketNumber(num, rifa?.total_tickets)}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Mensaje de suerte - Diseño compacto */}
                                <div className="text-center pt-2 border-t border-gray-700">
                                    <p className="text-xs text-black">¡Mucha suerte! 🍀</p>
                                </div>
                            </div>
                        </div>

                        {/* Botones de acción - Diseño compacto */}
                        <div className="flex-shrink-0 border-t border-gray-700 pt-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={handleDownloadTicket} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 text-sm">
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    <span>Descargar</span>
                                </button>
                                <button onClick={handleCopyTicket} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 text-sm">
                                    <ClipboardIcon className="w-4 h-4" />
                                    <span>Copiar</span>
                                </button>
                                <button onClick={handleSendWhatsApp} disabled={!generatedTicketInfo?.telefono} className="bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                    <span>WhatsApp</span>
                                </button>
                                <button onClick={handleClose} className="px-3 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors font-semibold text-sm">
                                    Finalizar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <JugadorFormModal isOpen={showNewPlayerModal} onClose={() => setShowNewPlayerModal(false)} onSave={handleSaveNewPlayer} />
        </div>
    );
}
