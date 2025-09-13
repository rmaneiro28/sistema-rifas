import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import Confetti from "react-confetti";
import { TrophyIcon, XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";

// Helper hook for confetti
const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        }
        window.addEventListener("resize", handleResize);
        handleResize();
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    return windowSize;
};

export function WinnerRegistrationModal({ isOpen, onClose, rifa, allTickets, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [winningNumber, setWinningNumber] = useState("");
    const [announcementStep, setAnnouncementStep] = useState('form'); // 'form', 'countdown', 'reveal'
    const [countdown, setCountdown] = useState(3);
    const [winnerInfo, setWinnerInfo] = useState(null); // To store details for the reveal
    const { width, height } = useWindowSize();

    const handleClose = () => {
        setWinningNumber('');
        setWinnerInfo(null);
        // Reset to form for next time
        setTimeout(() => {
            setAnnouncementStep('form');
            setLoading(false);
            onClose();
        }, 300); // Delay to allow modal to close gracefully
    };

    const handleSaveWinner = async () => {
        if (!winningNumber) {
            toast.error('Por favor, ingresa el número ganador.');
            return;
        }

        console.log('=== DEPURACIÓN DETALLADA ===');
        console.log('Buscando ticket ganador:', { winningNumber, allTickets: allTickets?.length });
        
        if (!allTickets || allTickets.length === 0) {
            console.error('❌ No hay tickets disponibles');
            toast.error('No hay tickets disponibles para esta rifa.');
            return;
        }
        
        console.log('📋 Estructura del primer ticket:', JSON.stringify(allTickets[0], null, 2));
        console.log('📋 Todos los tickets (solo IDs y números):', allTickets.map(t => ({
            id: t.id,
            numero_ticket: t.numero_ticket,
            numero: t.numero,
            numero_ticket_ticket: t.numero_ticket_ticket,
            jugador_id: t.jugador_id
        })));
        
        const searchNumber = parseInt(winningNumber, 10);
        console.log('🔍 Número a buscar:', searchNumber, '(tipo:', typeof searchNumber + ')');
        
        // Buscar en diferentes propiedades posibles
        let foundTicket = null;
        for (let i = 0; i < allTickets.length; i++) {
            const ticket = allTickets[i];
            console.log(`\n🎫 Ticket ${i}:`, JSON.stringify({
                numero_ticket: ticket.numero_ticket,
                numero: ticket.numero,
                numero_ticket_ticket: ticket.numero_ticket_ticket,
                id: ticket.id
            }, null, 2));
            
            // Convertir todos los valores a números para comparación
            const ticketNumero = parseInt(ticket.numero_ticket, 10) || parseInt(ticket.numero, 10) || parseInt(ticket.numero_ticket_ticket, 10) || parseInt(ticket.id, 10);
            const ticketNumeroStr = String(ticket.numero_ticket) || String(ticket.numero) || String(ticket.numero_ticket_ticket) || String(ticket.id);
            
            console.log(`🔍 Comparando: ${searchNumber} (buscado) vs ${ticketNumero} (ticket número) vs '${ticketNumeroStr}' (ticket string)`);
            
            if (
                ticketNumero === searchNumber ||
                ticketNumeroStr === winningNumber ||
                ticketNumeroStr === String(searchNumber).padStart(3, '0') ||
                ticketNumeroStr === String(searchNumber)
            ) {
                foundTicket = {
                    ...ticket,
                    jugador_id: ticket.id // Usar el ID del ticket como jugador_id
                };
                console.log('✅ ¡TICKET ENCONTRADO!:');
                break;
            }
        }
        
        console.log('🎯 Resultado final:', foundTicket ? 'ENCONTRADO' : 'NO ENCONTRADO');
        if (foundTicket) {
            console.log('📝 Ticket encontrado:', JSON.stringify(foundTicket, null, 2));
        }

        if (!foundTicket) {
            toast.error(`No se encontró el ticket #${winningNumber}.`);
            return;
        }

        console.log('👤 Propiedades del jugador:', JSON.stringify({
            jugador_id: foundTicket.jugador_id,
            jugador: foundTicket.jugador,
            nombre_jugador: foundTicket.nombre_jugador,
            telefono: foundTicket.telefono,
            telefono_jugador: foundTicket.telefono_jugador,
            id_jugador: foundTicket.id_jugador,
            jugador_id: foundTicket.jugador_id
        }, null, 2));

        // Verificar si tiene alguna propiedad relacionada con jugador
        const hasPlayer = foundTicket.jugador_id || foundTicket.jugador || foundTicket.nombre_jugador || foundTicket.id_jugador;
        
        if (!hasPlayer) {
            toast.error('El ticket no tiene un jugador asignado.');
            return;
        }

        console.log('✅ Ticket tiene jugador asignado');

        if (foundTicket.estado_ticket !== 'pagado' && foundTicket.estado !== 'pagado') {
            toast.error(`El ticket #${winningNumber} no está pagado. Su estado es: ${foundTicket.estado_ticket || foundTicket.estado}.`);
            return;
        }

        setLoading(true);

        const { data: existingWinner, error: checkError } = await supabase
            .from('t_ganadores')
            .select('id')
            .eq('rifa_id', rifa.id_rifa)
            .maybeSingle();

        if (checkError) {
            toast.error('Error al verificar ganador existente: ' + checkError.message);
            setLoading(false);
            return;
        }

        if (existingWinner) {
            toast.error('Ya existe un ganador registrado para esta rifa.');
            setLoading(false);
            return;
        }

        setWinnerInfo({
            numero: foundTicket.numero_ticket,
            jugador: foundTicket.jugador || foundTicket.nombre_jugador || 'Jugador',
            telefono: foundTicket.telefono || foundTicket.telefono_jugador,
        });

        setAnnouncementStep('countdown');
        let count = 3;
        setCountdown(count);

        const countdownInterval = setInterval(() => {
            count -= 1;
            setCountdown(count);
            if (count === 0) {
                clearInterval(countdownInterval);
                setAnnouncementStep('reveal');

                (async () => {
                    // Buscar jugador existente por cédula (no crear nuevos jugadores)
                    console.log('🔍 Buscando jugador existente por cédula:', foundTicket.cedula_jugador);
                    
                    let jugadorId = null;
                    
                    // Buscar jugador por cédula
                    const { data: existingPlayer, error: checkError } = await supabase
                        .from('t_jugadores')
                        .select('id')
                        .eq('cedula', foundTicket.cedula_jugador)
                        .single();
                    
                    console.log('📋 Resultado de búsqueda de jugador:', { existingPlayer, checkError });
                    
                    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
                        console.error('Error al verificar jugador:', checkError);
                    }
                    
                    if (existingPlayer) {
                        jugadorId = existingPlayer.id;
                        console.log('✅ Jugador encontrado:', existingPlayer);
                    } else {
                        console.error('❌ No se encontró jugador con cédula:', foundTicket.cedula_jugador);
                        toast.error('No se encontró un jugador registrado con la cédula: ' + foundTicket.cedula_jugador);
                        setLoading(false);
                        return;
                    }
                    
                    console.log('Insertando ganador:', {
                        rifa_id: rifa.id_rifa,
                        ticket_id: foundTicket.id,
                        jugador_id: jugadorId,
                        numero_ganador: foundTicket.numero_ticket,
                        premio: rifa.nombre
                    });
                    
                    const { error: insertError } = await supabase
                        .from('t_ganadores')
                        .insert([{
                            rifa_id: rifa.id_rifa,
                            ticket_id: foundTicket.id,
                            jugador_id: jugadorId,
                            numero_ganador: foundTicket.numero_ticket,
                            premio: rifa.nombre
                        }]);
                    
                    if (insertError) {
                        console.error('Error al insertar ganador:', insertError);
                        toast.error('Error al registrar el ganador: ' + insertError.message);
                        setLoading(false);
                        return;
                    }

                    const { error: updateRaffleError } = await supabase
                        .from('t_rifas')
                        .update({ estado: 'finalizada' })
                        .eq('id_rifa', rifa.id_rifa);

                    if (updateRaffleError) {
                        toast.error('Ganador registrado, pero hubo un error al actualizar el estado de la rifa.');
                    } else {
                        toast.success(`¡Ganador #${winningNumber} registrado exitosamente!`);
                        
                        // Esperar 5 segundos antes de cerrar para que el usuario vea el resultado
                        setTimeout(() => {
                            onSuccess();
                        }, 5000);
                    }
                    setLoading(false);
                })();
            }
        }, 1000);
    };

    const handleSendWinnerWhatsApp = () => {
        if (!winnerInfo || !winnerInfo.telefono) {
            toast.error("Este jugador no tiene un número de teléfono registrado.");
            return;
        }
        console.log("INFO: ", winnerInfo.numero)

        const message = `
¡Felicidades, ${winnerInfo.jugador}! 🏆
Has ganado la rifa *${rifa.nombre}* con el número *${winnerInfo.numero}*.

¡Nos pondremos en contacto contigo pronto para coordinar la entrega del premio! 🎉
    `.trim().replace(/\n/g, '%0A');

        const whatsappUrl = `https://wa.me/${winnerInfo.telefono.replace(/\D/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-md p-6 shadow-2xl relative transform transition-all duration-300 scale-100 flex flex-col overflow-hidden">
                <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a] z-10">
                    <XMarkIcon className="w-5 h-5" />
                </button>

                {announcementStep === 'form' && (
                    <>
                        <div className="text-center">
                            <div className="bg-yellow-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"><TrophyIcon className="w-6 h-6 text-yellow-500" /></div>
                            <h2 className="text-xl font-bold text-white mb-2">Registrar Ganador</h2>
                            <p className="text-gray-400 text-sm">Ingresa el número del ticket ganador para esta rifa.</p>
                        </div>
                        <div className="mt-6 space-y-4">
                            <div>
                                <label htmlFor="winningNumber" className="block text-sm font-medium text-gray-300 mb-2">Número Ganador</label>
                                <input id="winningNumber" type="number" value={winningNumber} onChange={(e) => setWinningNumber(e.target.value)} placeholder={`1 - ${rifa?.total_tickets}`} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-yellow-500 focus:outline-none transition-colors" />
                            </div>
                            <div className="bg-[#23283a] rounded-lg p-3 text-center"><p className="text-sm text-gray-400">Premio</p><p className="text-white font-semibold">{rifa?.nombre}</p></div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Cancelar</button>
                            <button onClick={handleSaveWinner} disabled={loading} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2">{loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div><span>Guardando...</span></>) : (<span>Confirmar Ganador</span>)}</button>
                        </div>
                    </>
                )}

                {announcementStep === 'countdown' && (<div className="text-center py-10"><p className="text-gray-400 text-lg mb-4">El número ganador es...</p><p className="text-8xl font-bold text-yellow-400 animate-ping">{countdown}</p></div>)}

                {announcementStep === 'reveal' && winnerInfo && (
                    <>
                        <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />
                        <div className="text-center"><TrophyIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" /><h2 className="text-3xl font-bold text-white mb-2">¡Felicidades!</h2><p className="text-gray-300">El ganador de la rifa <span className="font-bold text-white">{rifa.nombre}</span> es:</p></div>
                        <div className="my-6 bg-[#23283a] rounded-lg p-6 text-center space-y-4">
                            <div><p className="text-sm text-gray-400">Número Ganador</p><p className="text-5xl font-bold text-yellow-400 tracking-widest">{winnerInfo.numero}</p></div>
                            <div><p className="text-sm text-gray-400">Jugador</p><p className="text-2xl font-semibold text-white">{winnerInfo.jugador}</p></div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button onClick={handleSendWinnerWhatsApp} disabled={!winnerInfo.telefono} className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"><PaperAirplaneIcon className="w-5 h-5" /><span>Notificar por WhatsApp</span></button>
                            <button onClick={handleClose} className="w-full px-4 py-2 rounded-lg bg-[#23283a] hover:bg-[#2d3748] text-white transition-colors">Cerrar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

