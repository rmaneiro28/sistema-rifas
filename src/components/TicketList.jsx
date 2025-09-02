import { ArrowPathIcon, ChevronUpIcon, ChevronDownIcon, TicketIcon, UserIcon, EnvelopeIcon, PhoneIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";

export function TicketList({
    loading,
    paginatedGroups,
    expandedGroups,
    sortConfig,
    onSort,
    onToggleGroup,
    onTicketClick,
    formatTelephone
}) {
    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                <span className="ml-4 text-gray-400">Cargando tickets...</span>
            </div>
        );
    }

    if (paginatedGroups.length === 0) {
        return (
            <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 bg-[#23283a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <TicketIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-white text-lg font-semibold mb-2">No se encontraron tickets</h3>
                <p className="text-gray-400 text-sm">
                    No hay tickets disponibles para los filtros seleccionados.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#181c24] border border-[#23283a] rounded-xl overflow-hidden">
            {/* Header de la tabla */}
            <div className="bg-[#0f131b] px-6 py-4 border-b border-[#23283a]">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <div className="col-span-4">
                        <button
                            onClick={() => onSort("nombre_jugador")}
                            className="flex items-center space-x-1 hover:text-white transition-colors"
                        >
                            <span>Jugador</span>
                            {sortConfig.key === "nombre_jugador" && (
                                sortConfig.direction === "asc" ?
                                    <ChevronUpIcon className="w-3 h-3" /> :
                                    <ChevronDownIcon className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    <div className="col-span-2 text-center">
                        <button
                            onClick={() => onSort("total_tickets")}
                            className="flex items-center justify-center space-x-1 hover:text-white transition-colors w-full"
                        >
                            <span>Tickets</span>
                            {sortConfig.key === "total_tickets" && (
                                sortConfig.direction === "asc" ?
                                    <ChevronUpIcon className="w-3 h-3" /> :
                                    <ChevronDownIcon className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    <div className="col-span-2 text-center">
                        <button
                            onClick={() => onSort("total_gastado")}
                            className="flex items-center justify-center space-x-1 hover:text-white transition-colors w-full"
                        >
                            <span>Total Gastado</span>
                            {sortConfig.key === "total_gastado" && (
                                sortConfig.direction === "asc" ?
                                    <ChevronUpIcon className="w-3 h-3" /> :
                                    <ChevronDownIcon className="w-3 h-3" />
                            )}
                        </button>
                    </div>
                    <div className="col-span-3 text-center">Rifas</div>
                    <div className="col-span-1"></div>
                </div>
            </div>

            {/* Lista de grupos de tickets */}
            <div className="divide-y divide-[#23283a]">
                {paginatedGroups.map((group) => (
                    <div key={group.jugador_id} className="bg-[#181c24]">
                        {/* Encabezado del grupo */}
                        <div
                            className="px-6 py-4 hover:bg-[#1a1f2e] transition-colors cursor-pointer"
                            onClick={() => onToggleGroup(group.jugador_id)}
                        >
                            <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-4 flex items-center space-x-3">
                                    <div className="bg-[#7c3bed]/20 rounded-lg p-2 flex-shrink-0">
                                        <UserIcon className="w-5 h-5 text-[#7c3bed]" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{group.nombre_jugador}</p>
                                        <p className="text-gray-400 text-sm">{group.email_jugador}</p>
                                    </div>
                                </div>

                                <div className="col-span-2 text-center">
                                    <p className="text-white font-bold">{group.tickets.length} tickets</p>
                                </div>

                                <div className="col-span-2 text-center">
                                    <p className="text-white font-bold">${group.total_gastado.toFixed(2)}</p>
                                </div>

                                <div className="col-span-3">
                                    <div className="flex flex-wrap gap-1 justify-center">
                                        {[...new Set(group.tickets.map(t => t.nombre_rifa))].slice(0, 2).map((rifa, i) => (
                                            <span key={i} className="px-2 py-1 bg-[#7c3bed]/20 text-[#7c3bed] rounded-full text-xs">
                                                {rifa}
                                            </span>
                                        ))}
                                        {[...new Set(group.tickets.map(t => t.nombre_rifa))].length > 2 && (
                                            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded-full text-xs">
                                                +{[...new Set(group.tickets.map(t => t.nombre_rifa))].length - 2} más
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="col-span-1 flex justify-end">
                                    {expandedGroups[group.jugador_id] ? (
                                        <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tickets expandidos */}
                        {expandedGroups[group.jugador_id] && (
                            <div className="bg-[#1a1f2e] px-6 py-4 border-t border-[#23283a]">
                                <div className="mb-4 flex items-center justify-between">
                                    <h4 className="text-white font-semibold">Tickets de {group.nombre_jugador}</h4>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex items-center text-sm text-gray-400">
                                            <UserIcon className="w-4 h-4 mr-1" />
                                            {group.nombre_jugador}
                                        </div>
                                        <div className="flex items-center text-sm text-gray-400">
                                            <EnvelopeIcon className="w-4 h-4 mr-1" />
                                            {group.email_jugador}
                                        </div>
                                        {group.telefono_jugador && (
                                            <div className="flex items-center text-sm text-gray-400">
                                                <PhoneIcon className="w-4 h-4 mr-1" />
                                                {formatTelephone(group.telefono_jugador)}
                                            </div>
                                        )}
                                        <div className="flex items-center text-sm text-green-400">
                                            <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                                            Total: ${group.total_gastado.toFixed(2)}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.tickets.map((ticket) => (
                                        <div
                                            key={ticket.ticket_id}
                                            className="bg-[#23283a] rounded-lg p-4 cursor-pointer hover:bg-[#2d3748] transition-colors"
                                            onClick={() => onTicketClick(ticket)}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <div className="bg-[#7c3bed]/20 rounded-lg p-2">
                                                        <TicketIcon className="w-5 h-5 text-[#7c3bed]" />
                                                    </div>
                                                    <span className="text-white font-bold">#{ticket.numero_ticket}</span>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ticket.estado === 'pagado' ? 'bg-green-500/20 text-green-400' :
                                                    ticket.estado === 'apartado' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        ticket.estado === 'cancelado' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {ticket.estado ? ticket.estado.charAt(0).toUpperCase() + ticket.estado.slice(1) : 'Activo'}
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-white text-sm font-medium">{ticket.nombre_rifa}</p>
                                                <p className="text-gray-400 text-xs">Precio: ${ticket.precio_ticket}</p>
                                                <p className="text-gray-400 text-xs">
                                                    Fecha: {ticket.fecha_creacion_ticket ? new Date(ticket.fecha_creacion_ticket).toLocaleDateString('es-ES') : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}