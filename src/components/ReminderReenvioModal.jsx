import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export function ReminderReenvioModal({ isOpen, onClose, onConfirm }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
              Confirmar Reenvío de Recordatorios
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 text-white">
            <div className="mb-6">
              <p className="text-gray-300">
                Todos los jugadores ya han recibido recordatorios para esta rifa. Si continúas, se limpiará el historial de recordatorios enviados y podrás enviarlos nuevamente.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-[#23283a] hover:bg-[#2d3748] text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Limpiar e Enviar Nuevamente
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
