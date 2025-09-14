import { useState, useEffect, useMemo } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { 
  UserIcon, 
  TicketIcon, 
  PlusIcon, 
  XMarkIcon, 
  CheckIcon, 
  CreditCardIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import JugadorFormModal from "./JugadorFormModal";

export function TicketCreator({ isOpen, onClose, rifa, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [jugadores, setJugadores] = useState([]);
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false);
  const [jugadorSearchQuery, setJugadorSearchQuery] = useState("");
  const [selectedJugador, setSelectedJugador] = useState("");
  const [ticketNumbers, setTicketNumbers] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [ticketStatus, setTicketStatus] = useState("apartado");
  const [availableTickets, setAvailableTickets] = useState([]);
  const [ticketStatusMap, setTicketStatusMap] = useState(new Map());

  useEffect(() => {
    if (isOpen) {
      fetchJugadores();
      fetchTicketStatus();
    }
  }, [isOpen, rifa]);

  const fetchJugadores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("vw_jugadores").select("*");
      if (error) throw error;
      setJugadores(data || []);
    } catch (error) {
      toast.error("Error al cargar jugadores: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketStatus = async () => {
    if (!rifa) return;
    
    try {
      const { data, error } = await supabase
        .from("t_tickets")
        .select("numero, estado")
        .eq("rifa_id", rifa.id_rifa);
      
      if (error) throw error;
      
      const statusMap = new Map();
      data?.forEach(ticket => {
        statusMap.set(formatTicketNumber(ticket.numero, rifa.total_tickets), ticket.estado);
      });
      
      setTicketStatusMap(statusMap);
      
      // Generate available tickets list
      const totalTickets = rifa.total_tickets || 1000;
      const available = [];
      for (let i = 0; i < totalTickets; i++) {
        const formattedNum = formatTicketNumber(i, totalTickets);
        if (!statusMap.has(formattedNum) || statusMap.get(formattedNum) === 'disponible') {
          available.push(formattedNum);
        }
      }
      setAvailableTickets(available);
    } catch (error) {
      toast.error("Error al cargar estado de tickets: " + error.message);
    }
  };

  const filteredJugadores = useMemo(() => {
    if (!jugadorSearchQuery) return jugadores;
    const query = jugadorSearchQuery.toLowerCase();
    return jugadores.filter(j =>
      `${j.nombre} ${j.apellido}`.toLowerCase().includes(query) ||
      j.email.toLowerCase().includes(query) ||
      (j.cedula && j.cedula.includes(query))
    );
  }, [jugadores, jugadorSearchQuery]);

  const formatTicketNumber = (number, totalTickets) => {
    if (number == null || totalTickets == null) return number;
    const numDigits = String(totalTickets - 1).length;
    return String(number).padStart(Math.max(3, numDigits), "0");
  };

  const parseTicketNumbers = (input) => {
    if (!input.trim()) return [];
    
    const numbers = new Set();
    
    // Split by comma and process each part
    input.split(',').forEach(part => {
      part = part.trim();
      if (!part) return;
      
      // Check if it's a range (e.g., "001-005")
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => n.trim());
        const startNum = parseInt(start);
        const endNum = parseInt(end);
        
        if (!isNaN(startNum) && !isNaN(endNum) && startNum <= endNum) {
          for (let i = startNum; i <= endNum; i++) {
            numbers.add(formatTicketNumber(i, rifa?.total_tickets));
          }
        }
      } else {
        // Single number
        const num = parseInt(part);
        if (!isNaN(num)) {
          numbers.add(formatTicketNumber(num, rifa?.total_tickets));
        }
      }
    });
    
    return Array.from(numbers).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const selectedNumbers = useMemo(() => {
    return parseTicketNumbers(ticketNumbers);
  }, [ticketNumbers, rifa]);

  const unavailableNumbers = useMemo(() => {
    return selectedNumbers.filter(num => 
      ticketStatusMap.get(num) && ticketStatusMap.get(num) !== 'disponible'
    );
  }, [selectedNumbers, ticketStatusMap]);

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
    try {
      const { data: newJugador, error } = await supabase
        .from("t_jugadores")
        .insert([playerData])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success("¡Jugador agregado correctamente!");
      setJugadores(prev => [...prev, newJugador]);
      setSelectedJugador(newJugador.id);
      setJugadorSearchQuery(`${newJugador.nombre} ${newJugador.apellido}`);
      setShowNewPlayerModal(false);
    } catch (error) {
      toast.error("Error al guardar el jugador: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTickets = async () => {
    if (!selectedJugador) {
      toast.error("Por favor, selecciona un jugador");
      return;
    }
    
    if (selectedNumbers.length === 0) {
      toast.error("Por favor, ingresa al menos un número de ticket");
      return;
    }
    
    if (unavailableNumbers.length > 0) {
      toast.error(`Los siguientes números no están disponibles: ${unavailableNumbers.join(', ')}`);
      return;
    }
    
    setLoading(true);
    
    try {
      const fechaCreacion = new Date().toISOString();
      const ticketsToInsert = selectedNumbers.map(numero => ({
        rifa_id: rifa.id_rifa,
        jugador_id: selectedJugador,
        numero: numero,
        estado: ticketStatus,
        configuracion_id: rifa.configuracion_id || null,
        fecha_creacion_ticket: fechaCreacion,
        ...(ticketStatus === 'apartado' && { fecha_apartado: fechaCreacion }),
        ...(ticketStatus === 'pagado' && { 
          fecha_pago: fechaCreacion,
          metodo_pago: metodoPago,
          referencia_pago: referenciaPago || null
        })
      }));
      
      const { error } = await supabase
        .from("t_tickets")
        .insert(ticketsToInsert);
      
      if (error) throw error;
      
      const jugador = jugadores.find(j => j.id == selectedJugador);
      const successMessage = ticketStatus === 'pagado' 
        ? `¡${selectedNumbers.length} ticket(s) creado(s) y pagado(s) para ${jugador?.nombre}!`
        : `¡${selectedNumbers.length} ticket(s) apartado(s) para ${jugador?.nombre}!`;
      
      toast.success(successMessage);
      
      // Reset form
      setTicketNumbers("");
      setReferenciaPago("");
      setMetodoPago("Efectivo");
      setTicketStatus("apartado");
      
      // Refresh data
      await fetchTicketStatus();
      onSuccess();
      
      // Close modal if only one ticket was created
      if (selectedNumbers.length === 1) {
        onClose();
      }
      
    } catch (error) {
      toast.error("Error al crear los tickets: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (count) => {
    const available = availableTickets.filter(num => !selectedNumbers.includes(num));
    if (available.length < count) {
      toast.error(`Solo hay ${available.length} tickets disponibles`);
      return;
    }
    
    const newNumbers = [...selectedNumbers, ...available.slice(0, count)];
    setTicketNumbers(newNumbers.join(', '));
  };

  const handleRemoveNumber = (numberToRemove) => {
    const newNumbers = selectedNumbers.filter(n => n !== numberToRemove);
    setTicketNumbers(newNumbers.join(', '));
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#181c24] border border-[#23283a] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#0f131b]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
                <TicketIcon className="w-6 h-6 text-[#7c3bed]" />
              </div>
              <h2 className="text-xl font-bold text-white">Crear Tickets</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-6">
              {/* Rifa Info */}
              <div className="bg-[#23283a] rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Rifa Seleccionada</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Nombre:</span>
                    <span className="text-white ml-2">{rifa?.nombre}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Precio:</span>
                    <span className="text-white ml-2">${rifa?.precio_ticket}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Tickets:</span>
                    <span className="text-white ml-2">{rifa?.total_tickets}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Disponibles:</span>
                    <span className="text-green-400 ml-2">{availableTickets.length}</span>
                  </div>
                </div>
              </div>

              {/* Player Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">Seleccionar Jugador</label>
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={jugadorSearchQuery}
                        onChange={(e) => setJugadorSearchQuery(e.target.value)}
                        placeholder="Buscar jugador por nombre, email o cédula..."
                        className="w-full pl-10 pr-4 py-2 bg-[#23283a] border border-[#3a4152] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3bed]"
                      />
                    </div>
                    <button
                      onClick={() => setShowNewPlayerModal(true)}
                      className="px-4 py-2 bg-[#7c3bed] hover:bg-[#6d34d4] text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Nuevo</span>
                    </button>
                    {selectedJugador && (
                      <button
                        onClick={handleClearSelection}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown */}
                  {jugadorSearchQuery && !selectedJugador && filteredJugadores.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-[#23283a] border border-[#3a4152] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredJugadores.map(jugador => (
                        <div
                          key={jugador.id}
                          onClick={() => handleSelectJugador(jugador)}
                          className="p-3 hover:bg-[#3a4152] cursor-pointer transition-colors"
                        >
                          <div className="font-medium text-white">{jugador.nombre} {jugador.apellido}</div>
                          <div className="text-sm text-gray-400">{jugador.email} • {jugador.cedula}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Select */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">Selección Rápida</label>
                <div className="flex flex-wrap gap-2">
                  {[1, 5, 10, 20].map(count => (
                    <button
                      key={count}
                      onClick={() => handleQuickSelect(count)}
                      disabled={availableTickets.length < count}
                      className="px-3 py-1 bg-[#23283a] hover:bg-[#3a4152] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                    >
                      {count} ticket{count > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket Numbers */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">
                  Números de Ticket
                  <span className="text-gray-500 text-xs ml-2">
                    (Ej: 001, 005-010, 015)
                  </span>
                </label>
                <textarea
                  value={ticketNumbers}
                  onChange={(e) => setTicketNumbers(e.target.value)}
                  placeholder="Ingresa los números de ticket separados por comas o rangos (ej: 001, 005-010, 015)"
                  className="w-full p-3 bg-[#23283a] border border-[#3a4152] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3bed] resize-none"
                  rows={3}
                />
                
                {/* Selected Numbers Preview */}
                {selectedNumbers.length > 0 && (
                  <div className="bg-[#23283a] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        {selectedNumbers.length} ticket{selectedNumbers.length > 1 ? 's' : ''} seleccionado{selectedNumbers.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-sm text-gray-400">
                        Total: ${(rifa?.precio_ticket || 0) * selectedNumbers.length}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {selectedNumbers.map(number => (
                        <div
                          key={number}
                          className={`px-2 py-1 rounded text-sm font-mono flex items-center space-x-1 ${
                            unavailableNumbers.includes(number)
                              ? 'bg-red-600/20 text-red-400'
                              : 'bg-green-600/20 text-green-400'
                          }`}
                        >
                          <span>#{number}</span>
                          <button
                            onClick={() => handleRemoveNumber(number)}
                            className="text-gray-400 hover:text-white"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {unavailableNumbers.length > 0 && (
                      <div className="mt-2 text-xs text-red-400">
                        {unavailableNumbers.length} número(s) no disponible(s)
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-300">Estado del Ticket</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTicketStatus("apartado")}
                    className={`p-3 rounded-lg border transition-colors ${
                      ticketStatus === "apartado"
                        ? "border-yellow-500 bg-yellow-500/20 text-yellow-400"
                        : "border-[#3a4152] bg-[#23283a] text-gray-400 hover:border-[#4a5162]"
                    }`}
                  >
                    <CreditCardIcon className="w-6 h-6 mx-auto mb-1" />
                    <div className="text-sm font-medium">Apartado</div>
                  </button>
                  <button
                    onClick={() => setTicketStatus("pagado")}
                    className={`p-3 rounded-lg border transition-colors ${
                      ticketStatus === "pagado"
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-[#3a4152] bg-[#23283a] text-gray-400 hover:border-[#4a5162]"
                    }`}
                  >
                    <CheckIcon className="w-6 h-6 mx-auto mb-1" />
                    <div className="text-sm font-medium">Pagado</div>
                  </button>
                </div>
              </div>

              {/* Payment Details (only if pagado) */}
              {ticketStatus === "pagado" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-300">Método de Pago</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full p-3 bg-[#23283a] border border-[#3a4152] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7c3bed]"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Zelle">Zelle</option>
                    <option value="Otro">Otro</option>
                  </select>
                  
                  <label className="block text-sm font-medium text-gray-300">Referencia de Pago</label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    placeholder="Número de referencia, comprobante, etc."
                    className="w-full p-3 bg-[#23283a] border border-[#3a4152] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3bed]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[#23283a] bg-[#0f131b]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                {selectedNumbers.length > 0 && (
                  <span>
                    {selectedNumbers.length} ticket{selectedNumbers.length > 1 ? 's' : ''} • ${(rifa?.precio_ticket || 0) * selectedNumbers.length}
                  </span>
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTickets}
                  disabled={loading || !selectedJugador || selectedNumbers.length === 0 || unavailableNumbers.length > 0}
                  className="px-6 py-2 bg-[#7c3bed] hover:bg-[#6d34d4] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {loading ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  <span>
                    {ticketStatus === "pagado" ? "Crear y Pagar" : "Apartar Tickets"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Player Modal */}
      {showNewPlayerModal && (
        <JugadorFormModal
          isOpen={showNewPlayerModal}
          onClose={() => setShowNewPlayerModal(false)}
          onSave={handleSaveNewPlayer}
        />
      )}
    </>
  );
}
