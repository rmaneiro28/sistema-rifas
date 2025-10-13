import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../api/supabaseClient";

export function ReminderControlModal({ isOpen, onClose, players, rifa, empresa, empresaId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setCurrentIndex(0);
      setHasSent(false);
    }
  }, [isOpen]);

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const handleSend = async () => {
    if (!players || players.length === 0) return;
    const player = players[currentIndex];

    const greeting = getTimeBasedGreeting();
    const nombreRifa = rifa?.nombre || "esta rifa";
    const fechaSorteo = rifa?.fecha_fin ? new Date(rifa.fecha_fin).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "próximamente";
    const nombreEmpresa = empresa?.nombre_empresa || "nuestro equipo";
    const ticketsList = player.tickets.join(', ');
    const amount = player.tickets.length * rifa.precio_ticket;
    
    // Mensaje que se enviará por WhatsApp
    const message = `Hola! ${greeting} ${player.nombre}, le escribimos de ${nombreEmpresa}. Paso por aquí recordando el pago de sus números (${ticketsList}) para la rifa del ${nombreRifa}, por un monto de $${amount}. El sorteo será este ${fechaSorteo}.\n\n‼De no cancelar a tiempo su número puede pasar a rezagado‼`;
    
    // Mostrar ejemplo en consola
    const exampleMessage = `[Ejemplo de mensaje]\n\n${message}`;
    console.log(exampleMessage);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${player.telefono.replace(/\D/g, '')}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    // Guardar en la base de datos que se envió el recordatorio
    try {
      // Verificar que la rifa existe antes de intentar guardar
      const { data: rifaCheck, error: rifaError } = await supabase
        .from('t_rifas')
        .select('id_rifa')
        .eq('id_rifa', rifa.id_rifa)
        .eq('empresa_id', empresaId)
        .single();

      if (rifaError || !rifaCheck) {
        console.error('Rifa no encontrada o error:', rifaError);
        toast.error('Error: La rifa especificada no existe o no tienes permisos');
        return;
      }

      // Verificar que el jugador existe
      const { data: jugadorCheck, error: jugadorError } = await supabase
        .from('t_jugadores')
        .select('id')
        .eq('id', player.id)
        .eq('empresa_id', empresaId)
        .single();

      if (jugadorError || !jugadorCheck) {
        console.error('Jugador no encontrado o error:', jugadorError);
        toast.error('Error: El jugador especificado no existe o no tienes permisos');
        return;
      }

      const { error } = await supabase.from('t_recordatorios_enviados').insert({
        rifa_id: rifa.id_rifa,
        jugador_id: player.id,
        telefono_destino: player.telefono,
        mensaje: message,
        empresa_id: empresaId
      });

      if (error) {
        console.error('Error saving reminder:', error);
        toast.error(`Error al guardar el recordatorio enviado: ${error.message}`);
      } else {
        toast.success('Recordatorio enviado y guardado correctamente');
      }
    } catch (error) {
      console.error('Error saving reminder:', error);
      toast.error('Error al guardar el recordatorio enviado');
    }

    setHasSent(true);
  };

  const handleNext = () => {
    setHasSent(false);
    if (currentIndex < players.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      toast.success("Todos los recordatorios han sido procesados.");
      onClose();
    }
  };

  if (!isOpen || !players || players.length === 0) {
    return null;
  }

  const player = players[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-[#181c24] border border-[#23283a] rounded-xl shadow-lg w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#23283a]">
              <h3 className="text-lg font-bold text-white">Enviar Recordatorio Manual</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-white">
                <div className="text-center mb-4">
                    <p className="text-sm text-gray-400">
                        Recordatorio {currentIndex + 1} de {players.length}
                    </p>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 my-2">
                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${((currentIndex + 1) / players.length) * 100}%` }}></div>
                    </div>
                </div>

                <div className="bg-[#0f131b] p-4 rounded-lg border border-[#23283a] mb-4">
                    <p className="font-semibold text-lg">{player.nombre}</p>
                    <p className="text-sm text-gray-300">Teléfono: {player.telefono}</p>
                    <p className="text-sm text-gray-300">Tickets: <span className="font-mono">{player.tickets.join(', ')}</span></p>
                    <p className="text-sm text-gray-300">Monto a pagar: <span className="font-semibold">${player.tickets.length * rifa.precio_ticket}</span></p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    {!hasSent ? (
                        <button onClick={handleSend} className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-transform transform hover:scale-105">
                            <span>Enviar Recordatorio</span>
                        </button>
                    ) : (
                        <button onClick={handleNext} className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-transform transform hover:scale-105">
                            <span>{currentIndex < players.length - 1 ? 'Siguiente' : 'Finalizar'}</span>
                            <ArrowRightIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
