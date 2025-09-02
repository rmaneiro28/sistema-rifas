import { XMarkIcon, UserIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

export function RequestModal({ isOpen, onClose, request, onApprove, onReject, formatTelephone }) {
  if (!isOpen || !request) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#0f131b]">
            <h2 className="text-white font-semibold text-lg">Solicitud de Pago #{request.ticket?.numero_ticket || 'N/A'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#23283a]">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Player Info */}
                <div className="bg-[#23283a] rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-4 flex items-center"><UserIcon className="w-5 h-5 mr-2 text-blue-400" />Información del Cliente</h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-400">Nombre:</span> <span className="text-white">{request.ticket?.nombre_jugador || 'N/A'}</span></p>
                    <p><span className="text-gray-400">Email:</span> <span className="text-white">{request.ticket?.email_jugador || 'N/A'}</span></p>
                    {request.ticket?.telefono_jugador && <p><span className="text-gray-400">Teléfono:</span> <span className="text-white">{formatTelephone(request.ticket.telefono_jugador)}</span></p>}
                  </div>
                </div>
                {/* Payment Info */}
                <div className="bg-[#23283a] rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-4 flex items-center"><CurrencyDollarIcon className="w-5 h-5 mr-2 text-green-400" />Información del Pago</h3>
                  <div className="space-y-2">
                    <p><span className="text-gray-400">Método:</span> <span className="text-white">{request.metodo_pago}</span></p>
                    <p><span className="text-gray-400">Referencia:</span> <span className="text-white font-mono">{request.referencia}</span></p>
                    <p><span className="text-gray-400">Monto:</span> <span className="text-white font-bold">${request.monto}</span></p>
                  </div>
                </div>
              </div>
              {/* Right Column */}
              <div className="space-y-6">
                {/* Proof */}
                <div className="bg-[#23283a] rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-4">Comprobante de Pago</h3>
                  {request.comprobante_url ? (
                    <a href={request.comprobante_url} target="_blank" rel="noopener noreferrer">
                      <img src={request.comprobante_url} alt="Comprobante" className="w-full h-auto max-h-80 object-contain rounded-lg" />
                    </a>
                  ) : (
                    <p className="text-gray-400">No se ha subido comprobante.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-[#23283a] bg-[#0f131b] flex justify-end gap-4">
            <button onClick={() => onReject(request.id, request.ticket_id)} className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium">Rechazar</button>
            <button onClick={() => onApprove(request.id, request.ticket_id)} className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-medium">Aprobar</button>
          </div>
        </div>
      </div>
    </>
  );
}