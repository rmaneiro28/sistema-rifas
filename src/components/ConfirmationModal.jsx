import { useState, useEffect } from 'react';
import { XMarkIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  confirmPhrase
}) {
  const [inputPhrase, setInputPhrase] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputPhrase("");
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputPhrase.toLowerCase() === confirmPhrase.toLowerCase()) {
      onConfirm();
      onClose();
    } else {
      setError(`La frase de confirmación no es correcta. Escribe "${confirmPhrase}".`);
    }
  };

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
            className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start p-6">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <ShieldExclamationIcon className="h-6 w-6 text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-4 text-left">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <div className="mt-2">
                        <p className="text-sm text-gray-300">{message}</p>
                    </div>
                </div>
            </div>
            
            <div className="px-6 pb-6">
                <p className="text-sm text-gray-400 mb-2">
                    Para confirmar, escribe la siguiente frase: <strong className="text-red-400 font-mono">{confirmPhrase}</strong>
                </p>
                <input
                    type="text"
                    value={inputPhrase}
                    onChange={(e) => setInputPhrase(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-red-500 transition-colors"
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            <div className="bg-gray-800/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                onClick={handleConfirm}
                disabled={inputPhrase.toLowerCase() !== confirmPhrase.toLowerCase()}
              >
                {confirmText || 'Confirmar'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-600 shadow-sm px-4 py-2 bg-gray-700 text-base font-medium text-gray-300 hover:bg-gray-600 focus:outline-none sm:mt-0 sm:w-auto sm:text-sm"
                onClick={onClose}
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
