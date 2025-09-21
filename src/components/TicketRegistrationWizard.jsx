import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { toPng, toBlob } from "html-to-image";
import { UserIcon, TicketIcon, CreditCardIcon, MagnifyingGlassIcon, XMarkIcon, PaperAirplaneIcon, ArrowDownTrayIcon, ClipboardIcon } from "@heroicons/react/24/outline";
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
    const [metodoPago, setMetodoPago] = useState("Efectivo");
    const [referenciaPago, setReferenciaPago] = useState("");
    const ticketRef = useRef();
    const { empresaId } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setCustomNumero(initialSelectedNumbers.sort((a, b) => a - b).join(', '));
            setWizardStep(1);
        }
    }, [isOpen, initialSelectedNumbers]);

    useEffect(() => {
        if (isOpen && empresaId) {
            setLoading(true);
            supabase.from("vw_jugadores").select("*").eq("empresa_id", empresaId).then(({ data, error }) => {
                if (error) toast.error("Error al cargar jugadores.");
                else setJugadores(data || []);
                setLoading(false);
            });
        }
    }, [isOpen, empresaId]);

    useEffect(() => {
        if (selectedJugador) {
            const jugador = jugadores.find(j => j.id == selectedJugador);
            const rawFavoritos = jugador?.numeros_favoritos || [];
            // Formatear los números favoritos según el formato de la rifa
            const formattedFavoritos = rawFavoritos.map(num => formatTicketNumber(num, rifa?.total_tickets));
            setFavoritos(formattedFavoritos);
        } else {
            setFavoritos([]);
        }
    }, [selectedJugador, jugadores, rifa?.total_tickets]);

    // Permitir guardar los números tal cual como texto (ej: '000', '0214')
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
        setMetodoPago("Efectivo");
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
        
        // Formatear el número según el formato de la rifa
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

        // Guardar los números con formato de ceros a la izquierda para asegurar unicidad
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
        const montoTotal = rifa?.precio_ticket * numerosSeleccionados.length;

        // 1. Update tickets to 'pagado'
        const { error: updateError } = await supabase
            .from("t_tickets")
            .update({ estado: "pagado", fecha_pago: fechaPago })
            .eq("rifa_id", rifa.id_rifa)
            .eq("jugador_id", selectedJugador)
            .in("numero", numerosSeleccionados);

        if (updateError) {
            toast.error("Error al confirmar el pago: " + updateError.message);
            setLoading(false);
            return;
        }

        // 2. Create payment record in t_pagos
        const pagoData = {
            jugador_id: selectedJugador,
            monto: montoTotal,
            banco: metodoPago, // As per schema, using metodoPago for the non-nullable banco field.
            telefono: jugador?.telefono || null,
            cedula: jugador?.cedula || null,
            referencia_bancaria: referenciaPago || null,
            metodo_pago: metodoPago,
            empresa_id: empresaId,
        };

        const { error: pagoError } = await supabase.from("t_pagos").insert([pagoData]);

        if (pagoError) {
            console.error("Error al registrar el pago:", pagoError);
            toast.error("El pago se confirmó, pero hubo un error al registrar el detalle del pago.");
        }

        // 3. Proceed with UI update
        toast.success(`Pago confirmado para ${jugador?.nombre}`);
        onSuccess(true);

        setGeneratedTicketInfo({
            jugador: `${jugador.nombre} ${jugador.apellido}`,
            telefono: jugador.telefono,
            rifa: rifa?.nombre,
            numeros: numerosSeleccionados,
            total: montoTotal.toFixed(2),
            metodoPago: metodoPago,
            referencia: referenciaPago || 'N/A',
            fecha: new Date()
        });
        setWizardStep(6);
        setLoading(false);
    };

    const handleDownloadTicket = async () => {
        if (!ticketRef.current) return toast.error("No se encontró la referencia del ticket.");
        try {
            const dataUrl = await toPng(ticketRef.current, { cacheBust: true, quality: 0.95, pixelRatio: 2, backgroundColor: '#0f131b' });
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
            const blob = await toBlob(ticketRef.current, { cacheBust: true, quality: 0.95, pixelRatio: 2, backgroundColor: '#0f131b' });
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
        const { jugador, rifa: nombreRifa, numeros, total } = generatedTicketInfo;
        const message = `Gracias por tu participación ${jugador}! 🎟️\nHas participado en la rifa *${nombreRifa}*.\n\n*Tus números son:* ${numeros.join(', ')}\n*Total Pagado:* $${total}\n\n¡Mucha suerte! 🍀`.trim().replace(/\n/g, '%0A');
        const whatsappUrl = `https://wa.me/${generatedTicketInfo.telefono.replace(/\D/g, '')}?text=${message}`;
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
            <div className={`bg-[#181c24] border border-[#23283a] rounded-xl w-full ${wizardStep === 4 ? 'max-w-lg' : wizardStep === 6 ? 'max-w-md' : 'max-w-lg'} p-6 shadow-2xl relative transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh]`}>
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
                    <div className="space-y-6">
                        <div className="text-center"><div className="bg-[#7c3bed]/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><CreditCardIcon className="w-6 h-6 text-[#7c3bed]" /></div><h2 className="text-xl font-bold text-white mb-2">Registrar Pago</h2><p className="text-gray-400 text-sm">Selecciona el método de pago y confirma.</p></div>
                        <div className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-300 mb-2">Método de Pago</label><select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors"><option>Efectivo</option><option>Transferencia</option><option>Pago Móvil</option><option>Zelle</option><option>Otro</option></select></div>
                            {metodoPago !== 'Efectivo' && (<div><label className="block text-sm font-medium text-gray-300 mb-2">Referencia (opcional)</label><input type="text" value={referenciaPago} onChange={(e) => setReferenciaPago(e.target.value)} placeholder="Ej: 0123456789" className="w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors" /></div>)}
                        </div>
                        <div className="bg-[#23283a] rounded-lg p-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-gray-400">Jugador:</span><span className="text-white font-medium">{jugadores.find(j => j.id == selectedJugador)?.nombre} {jugadores.find(j => j.id == selectedJugador)?.apellido}</span></div><div className="flex justify-between text-sm"><span className="text-gray-400">Números:</span><span className="text-white font-medium">{numerosSeleccionados.length}</span></div><div className="flex justify-between text-lg font-bold"><span className="text-gray-300">Total:</span><span className="text-green-400">${(rifa?.precio_ticket * numerosSeleccionados.length).toFixed(2)}</span></div></div>
                        <div className="flex justify-between items-center pt-4"><button onClick={() => setWizardStep(3)} className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Atrás</button><button onClick={handleConfirmarPago} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2">{loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Confirmando...</span></>) : (<span>Confirmar Pago</span>)}</button></div>
                        <div className="flex space-x-2"><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-gray-600 rounded-full"></div><div className="w-2 h-2 bg-[#7c3bed] rounded-full"></div></div>
                    </div>
                )}

                {wizardStep === 6 && generatedTicketInfo && (
                    <div className="flex-1 flex flex-col space-y-6 overflow-y-auto">
                        <div className="text-center"><div className="bg-green-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><TicketIcon className="w-6 h-6 text-green-500" /></div><h2 className="text-xl font-bold text-white mb-2">¡Registro Exitoso!</h2><p className="text-gray-400 text-sm">Este es el resumen de tu participación en la rifa.</p></div>
                        <div ref={ticketRef} className="bg-[#0f131b] border border-[#23283a] rounded-lg p-4 sm:p-6 space-y-4">
                            <div className="text-center border-b border-solid border-gray-600 pb-4"><h3 className="text-lg font-bold text-[#7c3bed]">{generatedTicketInfo.rifa}</h3><p className="text-xs text-gray-400">Comprobante de Participación</p></div>
                            <div className="space-y-3 text-sm">
                                <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Jugador:</span><span className="text-white font-medium text-left sm:text-right">{generatedTicketInfo.jugador}</span></div>
                                <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Teléfono:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.telefono || 'N/A'}</span></div>
                                <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Método de Pago:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.metodoPago}</span></div>
                                {generatedTicketInfo.referencia && generatedTicketInfo.referencia !== 'N/A' && (<div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Referencia:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.referencia}</span></div>)}
                                <div className="flex flex-col sm:flex-row sm:justify-between"><span className="text-gray-400">Fecha:</span><span className="text-white text-left sm:text-right">{generatedTicketInfo.fecha.toLocaleDateString('es-ES')}</span></div>
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center"><span className="text-gray-400">Total Pagado:</span><span className="text-green-400 font-bold text-lg sm:text-base">${generatedTicketInfo.total}</span></div>
                            </div>
                            <div className="border-t border-solid border-gray-600 pt-4"><p className="text-gray-400 text-sm mb-2">Números Adquiridos:</p><div className="flex flex-wrap gap-2 justify-center">{generatedTicketInfo.numeros.map(num => (<span key={num} className="bg-[#7c3bed] text-white font-mono font-bold px-3 py-1.5 rounded-md text-base">{formatTicketNumber(num, rifa?.total_tickets)}</span>))}</div></div>
                            <div className="text-center pt-4 mt-4 border-t border-gray-700"><p className="text-xs text-gray-500">¡Mucha suerte! 🍀</p></div>
                        </div>
                        <div className="max-md:flex max-md:flex-col sm:grid sm:grid-cols-2 gap-3 pt-4">
                            <button onClick={handleDownloadTicket} className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 sm:py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"><ArrowDownTrayIcon className="w-5 h-5" /><span>Descargar</span></button>
                            <button onClick={handleCopyTicket} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 sm:py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"><ClipboardIcon className="w-5 h-5" /><span>Copiar</span></button>
                            <button onClick={handleSendWhatsApp} disabled={!generatedTicketInfo?.telefono} className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-3 sm:py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"><PaperAirplaneIcon className="w-5 h-5" /><span>WhatsApp</span></button>
                            <button onClick={handleClose} className="px-4 py-3 sm:py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors font-semibold">Finalizar</button>
                        </div>
                    </div>
                )}
            </div>
            <JugadorFormModal isOpen={showNewPlayerModal} onClose={() => setShowNewPlayerModal(false)} onSave={handleSaveNewPlayer} />
        </div>
    );
}
