import { useState, useEffect } from 'react';
import { XMarkIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

export function AbonoModal({ isOpen, onClose, onConfirm, ticketNumber, maxAmount }) {
  const [abonoAmount, setAbonoAmount] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAbonoAmount('');
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const amount = parseFloat(abonoAmount);
    
    if (isNaN(amount) || amount <= 0) {
      setError('Por favor ingrese un monto válido');
      return;
    }
    
    if (amount >= maxAmount) {
      setError(`El abono no puede ser igual o mayor al valor del ticket. Registre el pago completo en la opción "Marcar como Pagado".`);
      return;
    }
    
    onConfirm(amount);
    onClose();
  };

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
          className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg w-full max-w-md relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Registrar Abono</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Ingrese el monto del abono para el ticket <span className="font-semibold">#{ticketNumber}</span>:
              </p>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                  placeholder={`0.00 (Máx: $${maxAmount.toFixed(2)})`}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  step="0.01"
                  min="0.01"
                  max={maxAmount}
                  autoFocus
                />
              </div>
              
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
              
              <p className="mt-2 text-sm text-gray-400">
                Saldo pendiente: <span className="font-medium">${maxAmount.toFixed(2)}</span>
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleConfirm}
                disabled={!abonoAmount || parseFloat(abonoAmount) <= 0}
              >
                Confirmar Abono
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
