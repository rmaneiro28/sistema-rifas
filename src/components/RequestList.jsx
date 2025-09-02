import { ArrowPathIcon, CheckCircleIcon, XCircleIcon, EyeIcon, TicketIcon } from "@heroicons/react/24/outline";

export function RequestList({ loading, paymentRequests, onApproveRequest, onRejectRequest, onViewRequest }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-4 text-gray-400">Cargando solicitudes...</span>
      </div>
    );
  }

  if (paymentRequests.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="w-16 h-16 bg-[#23283a] rounded-full flex items-center justify-center mx-auto mb-4">
          <TicketIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-white text-lg font-semibold mb-2">No hay solicitudes de pago</h3>
        <p className="text-gray-400 text-sm">
          No se encontraron solicitudes de pago pendientes.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden">
      <div className="hidden md:block bg-[#0f131b] px-6 py-4 border-b border-[#23283a]">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-2">Ticket</div>
          <div className="col-span-3">Jugador</div>
          <div className="col-span-3">Rifa</div>
          <div className="col-span-2">Referencia</div>
          <div className="col-span-2 text-center">Acciones</div>
        </div>
      </div>
      <div className="divide-y divide-[#23283a]">
        {paymentRequests.map((request) => (
          <div key={request.id} className="px-6 py-4 hover:bg-[#1a1f2e] transition-colors">
            <div className="grid grid-cols-12 gap-4 items-center">
              <p className="col-span-2 text-white font-bold text-sm">#{request.ticket?.numero_ticket || 'N/A'}</p>
              <div className="col-span-3">
                <p className="text-white font-medium truncate">{request.ticket?.nombre_jugador || 'Sin asignar'}</p>
                <p className="text-gray-400 text-xs truncate">{request.ticket?.email_jugador || 'Sin email'}</p>
              </div>
              <p className="col-span-3 text-white font-medium truncate">{request.ticket?.nombre_rifa || 'Rifa no disponible'}</p>
              <div className="col-span-2">
                <p className="text-white font-mono text-sm">{request.referencia}</p>
                <p className="text-gray-400 text-xs">Monto: ${request.monto}</p>
              </div>
              <div className="col-span-2 flex justify-center items-center space-x-2">
                <button onClick={() => onViewRequest(request)} className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30" title="Ver detalles">
                  <EyeIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onApproveRequest(request.id, request.ticket_id)} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30" title="Aprobar">
                  <CheckCircleIcon className="w-5 h-5" />
                </button>
                <button onClick={() => onRejectRequest(request.id, request.ticket_id)} className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30" title="Rechazar">
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}