import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowRightIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "../api/supabaseClient";

export function ReminderControlModal({ isOpen, onClose, players, rifa, empresa, empresaId }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasSent, setHasSent] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setCurrentIndex(0);
      setHasSent(false);
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    if (!empresaId) return;
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('t_reminder_templates')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const formatMessage = (templateContent, player) => {
    const greeting = getTimeBasedGreeting();
    const nombreRifa = rifa?.nombre || "esta rifa";
    const fechaSorteo = rifa?.fecha_fin ? new Date(rifa.fecha_fin).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "próximamente";
    const nombreEmpresa = empresa?.nombre_empresa || "nuestro equipo";
    const ticketsList = player.tickets.join(', ');
    const amount = player.tickets.length * rifa.precio_ticket;

    return templateContent
      .replace(/{{saludo}}/g, greeting)
      .replace(/{{nombre_jugador}}/g, player.nombre)
      .replace(/{{nombre_empresa}}/g, nombreEmpresa)
      .replace(/{{lista_tickets}}/g, ticketsList)
      .replace(/{{nombre_rifa}}/g, nombreRifa)
      .replace(/{{monto_total}}/g, amount)
      .replace(/{{fecha_sorteo}}/g, fechaSorteo);
  };

  const handleSend = async () => {
    if (!players || players.length === 0) return;
    const player = players[currentIndex];

    let message = "";
    if (templates.length > 0) {
      message = formatMessage(templates[selectedTemplateIndex].content, player);
    } else {
      // Default fallback message if no templates exist
      const greeting = getTimeBasedGreeting();
      const ticketsList = player.tickets.join(', ');
      const amount = player.tickets.length * rifa.precio_ticket;
      message = `Hola! ${greeting} ${player.nombre}, le escribimos de ${empresa?.nombre_empresa || 'nuestro equipo'}. Paso por aquí recordando el pago de sus números (${ticketsList}) para la rifa del ${rifa?.nombre || 'esta rifa'}, por un monto de $${amount}.`;
    }

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${player.telefono}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    try {
      // Registrar recordatorio
      const { error } = await supabase.from('t_recordatorios_enviados').insert({
        rifa_id: rifa.id_rifa,
        jugador_id: player.id,
        telefono_destino: player.telefono,
        mensaje: message,
        empresa_id: empresaId
      });

      if (error) console.error('Error saving reminder log:', error);
      toast.success('Recordatorio preparado en WhatsApp');
    } catch (error) {
      console.error('Error saving reminder:', error);
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
              <h3 className="text-lg font-bold text-white">Enviar Recordatorio</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 text-white text-sm sm:text-base">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-400">
                  Recordatorio {currentIndex + 1} de {players.length}
                </p>
                <div className="w-full bg-gray-700 rounded-full h-1.5 my-2">
                  <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" style={{ width: `${((currentIndex + 1) / players.length) * 100}%` }}></div>
                </div>
              </div>

              <div className="bg-[#0f131b] p-4 rounded-lg border border-[#23283a] mb-6">
                <p className="font-semibold text-lg text-indigo-400">{player.nombre}</p>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Tickets: {player.tickets.join(', ')}</span>
                  <span className="font-bold text-white">${player.tickets.length * rifa.precio_ticket}</span>
                </div>
              </div>

              {/* Template Selector */}
              {templates.length > 0 && (
                <div className="mb-6">
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Seleccionar Mensaje</label>
                  <div className="grid grid-cols-3 gap-2">
                    {templates.map((t, idx) => (
                      <button
                        key={t.id}
                        onClick={() => { setSelectedTemplateIndex(idx); setHasSent(false); }}
                        className={`p-2 text-xs rounded-lg border transition-all ${selectedTemplateIndex === idx
                            ? 'bg-indigo-600/20 border-indigo-500 text-white'
                            : 'bg-[#23283a] border-gray-700 text-gray-500 hover:border-gray-600'
                          }`}
                      >
                        Msg {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Vista Previa</label>
                <div className="bg-[#0f131b] p-3 rounded-lg border border-[#23283a] italic text-xs text-gray-300 max-h-32 overflow-y-auto">
                  {templates.length > 0
                    ? formatMessage(templates[selectedTemplateIndex].content, player)
                    : "Cargando mensaje..."
                  }
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {!hasSent ? (
                  <button onClick={handleSend} className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform transform active:scale-95 shadow-lg shadow-green-500/20">
                    <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    <span>Abrir WhatsApp</span>
                  </button>
                ) : (
                  <button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform transform active:scale-95 shadow-lg shadow-indigo-500/20">
                    <span>{currentIndex < players.length - 1 ? 'Siguiente Jugador' : 'Finalizar'}</span>
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
