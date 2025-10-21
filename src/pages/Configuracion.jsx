import { useState, useEffect, useRef } from "react";
import { Switch } from "@headlessui/react";
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  CloudArrowDownIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  MapPinIcon,
  PlusIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { InboxIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

// Helper function to calculate file hash
const getFileHash = async (file) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// Tab component for configuration sections
const Tab = ({ active, onClick, children, icon: Icon }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
      active
        ? 'bg-[#181c24] text-white border-t-2 border-indigo-600'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`}
  >
    {Icon && <Icon className="w-5 h-5 mr-2" />}
    {children}
  </button>
);

// Backup Configuration Component
const BackupConfig = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodDescription, setNewMethodDescription] = useState('');
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [backupHistory, setBackupHistory] = useState([]);

  const fileInputRef = useRef(null);

  const { empresaId } = useAuth();

  // Load backup history from localStorage
  useEffect(() => {
    const loadBackupHistory = async () => {
      try {
        const history = localStorage.getItem(`backup_history_${empresaId}`);
        if (history) {
          setBackupHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error('Error loading backup history:', error);
      }
    };

    if (empresaId) {
      loadBackupHistory();
    }
  }, [empresaId]);

  // Save backup to history
  const saveToHistory = (backupData) => {
    try {
      const historyItem = {
        id: Date.now().toString(),
        name: `backup_${backupData.empresa.nombre_empresa.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`,
        date: new Date().toISOString(),
        size: `${(JSON.stringify(backupData).length / 1024).toFixed(1)} KB`,
        empresa: backupData.empresa.nombre_empresa,
        records: {
          jugadores: backupData.jugadores?.length || 0,
          tickets: backupData.tickets?.length || 0,
          pagos: backupData.pagos?.length || 0
        }
      };

      const existingHistory = JSON.parse(localStorage.getItem(`backup_history_${empresaId}`) || '[]');
      const updatedHistory = [historyItem, ...existingHistory].slice(0, 10); // Keep only last 10

      localStorage.setItem(`backup_history_${empresaId}`, JSON.stringify(updatedHistory));
      setBackupHistory(updatedHistory);
    } catch (error) {
      console.error('Error saving to backup history:', error);
    }
  };

  const handleBackup = async () => {
    if (!empresaId) {
      setBackupMessage({ type: 'error', text: 'No se pudo identificar la empresa' });
      return;
    }

    setIsLoading(true);
    setBackupMessage({ type: 'info', text: 'Creando copia de seguridad...' });

    try {
      // 1. Get all data for the company
      const { data: empresaData, error: empresaError } = await supabase
        .from('t_empresas')
        .select('*')
        .eq('id_empresa', empresaId)
        .single();

      if (empresaError) throw empresaError;

      const { data: jugadoresData, error: jugadoresError } = await supabase
        .from('t_jugadores')
        .select('*')
        .eq('empresa_id', empresaId);

      if (jugadoresError) throw jugadoresError;

      const { data: rifasData, error: rifasError } = await supabase
        .from('vw_rifas')
        .select('*')
        .eq('empresa_id', empresaId);

      if (rifasError) throw rifasError;

      const { data: ticketsData, error: ticketsError } = await supabase
        .from('vw_tickets')
        .select('*')
        .eq('empresa_id', empresaId);

      if (ticketsError) throw ticketsError;

      const { data: pagosData, error: pagosError } = await supabase
        .from('t_pagos')
        .select('*')
        .eq('empresa_id', empresaId);

      if (pagosError) throw pagosError;

      // 2. Create backup object
      const backupData = {
        empresa: empresaData,
        jugadores: jugadoresData || [],
        rifas: rifasData || [],
        tickets: ticketsData || [],
        pagos: pagosData || [],
        metadata: {
          backupDate: new Date().toISOString(),
          empresaId: empresaId,
          version: '1.0'
        }
      };

      // Save to history before downloading
      saveToHistory(backupData);

      // 3. Create downloadable JSON file
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportFileDefaultName = `backup_${empresaData.nombre_empresa.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      setBackupMessage({
        type: 'success',
        text: 'Copia de seguridad creada y descargada exitosamente'
      });

    } catch (error) {
      console.error('Error creating backup:', error);
      setBackupMessage({
        type: 'error',
        text: 'Error al crear la copia de seguridad: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setBackupMessage({ type: 'error', text: 'Solo se permiten archivos JSON' });
      return;
    }

    setIsLoading(true);
    setBackupMessage({ type: 'info', text: 'Procesando archivo de respaldo...' });

    try {
      const text = await file.text();
      const backupData = JSON.parse(text);

      // Validate backup file structure
      if (!backupData.empresa || !backupData.metadata) {
        throw new Error('Archivo de respaldo inválido');
      }

      if (backupData.metadata.empresaId !== empresaId) {
        throw new Error('Este respaldo pertenece a otra empresa');
      }

      // Ask for confirmation before restore
      const confirmed = window.confirm(
        `¿Estás seguro de que quieres restaurar los datos de ${backupData.empresa.nombre_empresa}?\n\nEsta acción sobrescribirá todos los datos actuales:\n- ${backupData.jugadores?.length || 0} jugadores\n- ${backupData.rifas?.length || 0} rifas\n- ${backupData.tickets?.length || 0} tickets\n- ${backupData.pagos?.length || 0} pagos\n\nEsta acción no se puede deshacer.`
      );

      if (!confirmed) {
        setBackupMessage({ type: 'info', text: 'Restauración cancelada' });
        setIsLoading(false);
        return;
      }

      setBackupMessage({ type: 'info', text: 'Eliminando datos actuales...' });

      // 1. Delete existing data for this company (in reverse order to respect foreign keys)
      const { error: deleteTicketsError } = await supabase
        .from('t_tickets')
        .delete()
        .eq('empresa_id', empresaId);

      if (deleteTicketsError) {
        console.warn('Error deleting tickets:', deleteTicketsError);
      }

      const { error: deletePagosError } = await supabase
        .from('t_pagos')
        .delete()
        .eq('empresa_id', empresaId);

      if (deletePagosError) {
        console.warn('Error deleting pagos:', deletePagosError);
      }

      const { error: deleteJugadoresError } = await supabase
        .from('t_jugadores')
        .delete()
        .eq('empresa_id', empresaId);

      if (deleteJugadoresError) {
        console.warn('Error deleting jugadores:', deleteJugadoresError);
      }

      // Delete rifas as well since they exist in t_rifas table
      const { error: deleteRifasError } = await supabase
        .from('t_rifas')
        .delete()
        .eq('empresa_id', empresaId);

      if (deleteRifasError) {
        console.warn('Error deleting rifas:', deleteRifasError);
      }

      setBackupMessage({ type: 'info', text: 'Restaurando datos...' });

      // 2. Restore empresa data (if different from current)
      if (backupData.empresa.id_empresa !== empresaId) {
        console.warn('Empresa ID mismatch in backup, skipping empresa restore');
      }

      // Track successful insertions
      let restoredJugadores = 0;
      let restoredTickets = 0;
      let restoredPagos = 0;
      let restoredRifas = 0;

      // Create mapping for old rifa IDs to new rifa IDs
      const rifaIdMapping = new Map();

      // 3. Restore rifas first (they are needed for tickets)
      if (backupData.rifas && backupData.rifas.length > 0) {
        // Debug: Log first rifa to see field names
        if (backupData.rifas.length > 0) {
          console.log('Sample rifa data:', backupData.rifas[0]);
        }

        const rifasToInsert = backupData.rifas.map(r => ({
          // Don't include id - let database auto-generate it
          nombre: r.nombre,
          descripcion: r.descripcion,
          precio_ticket: r.precio_ticket,
          fecha_inicio: r.fecha_inicio,
          fecha_fin: r.fecha_fin,
          total_tickets: r.numero_tickets || r.total_tickets,
          empresa_id: empresaId, // Ensure correct empresa_id
          estado: r.estado || 'activa',
          imagen_url: r.imagen_url,
          premio_principal: r.premio_descripcion || r.premio_principal,
          segundo_premio: r.segundo_premio,
          tercer_premio: r.tercer_premio,
          cuarto_premio: r.cuarto_premio,
          categoria: r.categoria,
          reglas: r.reglas
        })).filter(r => r.nombre && r.fecha_inicio); // Filter out rifas with missing required fields

        if (rifasToInsert.length > 0) {
          // Insert rifas in batches of 50 to avoid potential limits
          const batchSize = 50;
          let insertedCount = 0;

          for (let i = 0; i < rifasToInsert.length; i += batchSize) {
            const batch = rifasToInsert.slice(i, i + batchSize);

            const { data: insertedRifas, error: batchError } = await supabase
              .from('t_rifas')
              .insert(batch)
              .select('id_rifa, nombre'); // Get back the new IDs and names for mapping

            if (batchError) {
              console.error(`Error inserting rifas batch ${Math.floor(i / batchSize) + 1}:`, batchError);
              throw new Error(`Error al restaurar rifas (lote ${Math.floor(i / batchSize) + 1}): ` + batchError.message);
            } else {
              insertedCount += batch.length;

              // Create mapping from old rifa data to new IDs
              if (insertedRifas) {
                insertedRifas.forEach((newRifa, index) => {
                  const originalRifa = backupData.rifas[i + index];
                  if (originalRifa) {
                    // Try different possible field names for rifa ID
                    const oldRifaId = originalRifa.id || originalRifa.id_rifa || originalRifa.rifa_id;
                    if (oldRifaId) {
                      rifaIdMapping.set(oldRifaId, newRifa.id_rifa);
                    } else {
                      console.warn('Could not find rifa ID field in:', originalRifa);
                    }
                  }
                });
              }
            }
          }

          restoredRifas = insertedCount;
        }

        // Wait a moment to ensure rifas are fully committed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 4. Restore jugadores
      if (backupData.jugadores && backupData.jugadores.length > 0) {
        const jugadoresToInsert = backupData.jugadores.map(j => ({
          id: j.id, // Preserve original UUID for relationships
          nombre: j.nombre,
          apellido: j.apellido,
          cedula: j.cedula,
          telefono: j.telefono,
          email: j.email,
          direccion: j.direccion,
          numeros_favoritos: Array.isArray(j.numeros_favoritos) ? j.numeros_favoritos : [],
          empresa_id: empresaId // Ensure correct empresa_id
          // Note: created_at, updated_at, status fields don't exist in t_jugadores table based on JugadorFormModal.jsx
        })).filter(j => j.nombre && j.apellido); // Filter out jugadores with missing required fields

        if (jugadoresToInsert.length > 0) {
          // Insert jugadores in batches of 50 to avoid potential limits
          const batchSize = 50;
          let insertedCount = 0;

          for (let i = 0; i < jugadoresToInsert.length; i += batchSize) {
            const batch = jugadoresToInsert.slice(i, i + batchSize);

            const { error: batchError } = await supabase
              .from('t_jugadores')
              .insert(batch);

            if (batchError) {
              console.error(`Error inserting jugadores batch ${Math.floor(i / batchSize) + 1}:`, batchError);
              throw new Error(`Error al restaurar jugadores (lote ${Math.floor(i / batchSize) + 1}): ` + batchError.message);
            } else {
              insertedCount += batch.length;
            }
          }

          restoredJugadores = insertedCount;
        }

        // Wait a moment to ensure jugadores are fully committed
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 4. Restore pagos
      if (backupData.pagos && backupData.pagos.length > 0) {
        const pagosToInsert = backupData.pagos.map(p => ({
          id: p.id, // Preserve original UUID for relationships
          jugador_id: p.jugador_id,
          monto: p.monto,
          banco: p.banco,
          telefono: p.telefono,
          cedula: p.cedula,
          referencia_bancaria: p.referencia_bancaria,
          metodo_pago: p.metodo_pago,
          empresa_id: empresaId, // Ensure correct empresa_id
          tipo_pago: p.tipo_pago,
          notas: p.notas,
          fecha_pago: p.fecha_pago
          // Note: imagen field doesn't exist in t_pagos table based on the wizard code
        })).filter(p => p.jugador_id && p.monto != null); // Filter out pagos with missing required fields

        if (pagosToInsert.length > 0) {
          // Insert pagos in batches of 50 to avoid potential limits
          const batchSize = 50;
          let insertedCount = 0;

          for (let i = 0; i < pagosToInsert.length; i += batchSize) {
            const batch = pagosToInsert.slice(i, i + batchSize);

            const { error: batchError } = await supabase
              .from('t_pagos')
              .insert(batch);

            if (batchError) {
              console.error(`Error inserting pagos batch ${Math.floor(i / batchSize) + 1}:`, batchError);
              throw new Error(`Error al restaurar pagos (lote ${Math.floor(i / batchSize) + 1}): ` + batchError.message);
            } else {
              insertedCount += batch.length;
            }
          }

          restoredPagos = insertedCount;
        }
      }

      // 5. Restore tickets
      if (backupData.tickets && backupData.tickets.length > 0) {
        const ticketsToInsert = backupData.tickets.map(t => {
          // Extract raw numero from numero_ticket if numero is null
          let rawNumero = t.numero_ticket;
          if (!rawNumero && t.numero_ticket) {
            // Extract the numeric part from formatted numero_ticket
            const extracted = t.numero_ticket.replace(/\D/g, '');
            rawNumero = extracted ? parseInt(extracted) : null;
          }

          // Map old rifa_id to new rifa_id
          const newRifaId = rifaIdMapping.get(t.rifa_id);
          if (!newRifaId) {
            console.warn(`Could not find mapping for rifa_id ${t.rifa_id} in tickets`);
          }

          return {
            id: t.ticket_id, // Preserve original UUID for tickets
            rifa_id: newRifaId || t.rifa_id, // Use new rifa_id if available, fallback to old one
            jugador_id: t.jugador_id,
            numero: rawNumero, // Use extracted raw numero
            estado: t.estado_ticket || t.estado || 'apartado', // Use estado_ticket if available, fallback to estado, then default to 'apartado'
            empresa_id: empresaId, // Ensure correct empresa_id
            fecha_apartado: t.fecha_apartado,
            fecha_pago: t.fecha_pago
            // Note: fecha_cancelacion might not exist in t_tickets table
          };
        }).filter(t => {
          const isValid = t.numero != null && t.rifa_id && t.jugador_id && t.estado && t.fecha_apartado;
          return isValid;
        }); // Filter out tickets with missing required fields

        if (ticketsToInsert.length > 0) {
          // Insert tickets in batches of 50 to avoid potential limits
          const batchSize = 50;
          let insertedCount = 0;

          for (let i = 0; i < ticketsToInsert.length; i += batchSize) {
            const batch = ticketsToInsert.slice(i, i + batchSize);

            const { error: batchError } = await supabase
              .from('t_tickets')
              .insert(batch);

            if (batchError) {
              console.error(`Error inserting ticket batch ${Math.floor(i / batchSize) + 1}:`, batchError);
              throw new Error(`Error al restaurar tickets (lote ${Math.floor(i / batchSize) + 1}): ` + batchError.message);
            } else {
              insertedCount += batch.length;
            }
          }

          restoredTickets = insertedCount;
        }
      }

      setBackupMessage({
        type: 'success',
        text: `Datos restaurados exitosamente:\n- ${restoredRifas} rifas\n- ${restoredJugadores} jugadores\n- ${restoredTickets} tickets\n- ${restoredPagos} pagos\n\nLa página se recargará para reflejar los cambios.`
      });

      // Reload page after successful restore
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Error restoring backup:', error);
      setBackupMessage({
        type: 'error',
        text: 'Error al procesar el archivo de respaldo: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#181c24] shadow rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">
          <CloudArrowDownIcon className="w-6 h-6 inline-block mr-2 text-indigo-400" />
          Copias de Seguridad
        </h3>

        <div className="bg-[#1e2235] p-6 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-300 mb-6">
            Crea una copia de seguridad de todos tus datos en un archivo descargable.
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleBackup}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creando copia...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="-ml-1 mr-2 h-5 w-5" />
                  Crear Copia de Seguridad
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-white bg-[#2d3748] hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <CloudArrowDownIcon className="-ml-1 mr-2 h-5 w-5 text-gray-300" />
              Restaurar desde Archivo
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".json"
              />
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-white">Copia de seguridad automática</h4>
                <p className="text-xs text-gray-400">Copia de seguridad automática cada {backupFrequency === 'daily' ? 'día' : backupFrequency === 'weekly' ? 'semana' : 'mes'}</p>
              </div>
              <Switch
                checked={autoBackup}
                onChange={setAutoBackup}
                className={`${
                  autoBackup ? 'bg-indigo-600' : 'bg-gray-700'
                } relative inline-flex h-6 w-11 items-center rounded-full`}
              >
                <span className="sr-only">Activar copia de seguridad automática</span>
                <span
                  className={`${
                    autoBackup ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                />
              </Switch>
            </div>

            {autoBackup && (
              <div className="mt-4">
                <label htmlFor="backup-frequency" className="block text-sm font-medium text-gray-300 mb-1">
                  Frecuencia
                </label>
                <select
                  id="backup-frequency"
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-[#2d3748] border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="daily">Diariamente</option>
                  <option value="weekly">Semanalmente</option>
                  <option value="monthly">Mensualmente</option>
                </select>
              </div>
            )}
          </div>

          {backupMessage.text && (
            <div className={`mt-4 p-3 rounded-md ${
              backupMessage.type === 'error'
                ? 'bg-red-900/30 border border-red-800/50'
                : backupMessage.type === 'success'
                ? 'bg-green-900/30 border border-green-800/50'
                : 'bg-blue-900/30 border border-blue-800/50'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {backupMessage.type === 'error' ? (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                  ) : backupMessage.type === 'success' ? (
                    <CheckIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
                  ) : (
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    backupMessage.type === 'error'
                      ? 'text-red-300'
                      : backupMessage.type === 'success'
                      ? 'text-green-300'
                      : 'text-blue-300'
                  }`}>
                    {backupMessage.text}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#181c24] shadow rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">
          <ClockIcon className="w-6 h-6 inline-block mr-2 text-indigo-400" />
          Historial de Copias de Seguridad
        </h3>
        <div className="bg-[#1e2235] p-6 rounded-lg border border-gray-700">
          {backupHistory.length > 0 ? (
            <div className="space-y-3">
              {backupHistory.map((backup, index) => (
                <div key={backup.id} className="flex items-center justify-between p-3 bg-[#23283a] rounded-lg border border-gray-600/50 hover:border-gray-500/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">
                        {backup.name}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                        <span>{new Date(backup.date).toLocaleDateString('es-ES')}</span>
                        <span>{backup.size}</span>
                        <span>{backup.empresa}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span>{backup.records.jugadores} jugadores</span>
                        <span>{backup.records.tickets} tickets</span>
                        <span>{backup.records.pagos} pagos</span>
                      </div>
                    </div>
                  </div>
                  <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors">
                    Descargar
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CloudArrowDownIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
              <p className="text-sm text-gray-400">
                No hay copias de seguridad recientes
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Crea tu primera copia de seguridad usando el botón de arriba
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Payment Methods Configuration Component
const PaymentMethodsConfig = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodDescription, setNewMethodDescription] = useState('');
  const [newMethodLogoUrl, setNewMethodLogoUrl] = useState(null);

  const { empresaId } = useAuth();

  // Load payment methods from database
  useEffect(() => {
    const loadPaymentMethods = async () => {
      if (!empresaId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('t_payment_methods')
          .select('*')
          .eq('empresa_id', empresaId);

        if (error) {
          console.error('Error loading payment methods:', error);
          // Initialize with default methods if table doesn't exist yet
          setPaymentMethods([
            { id: 'efectivo', method_id: 'efectivo', method_name: 'Efectivo', is_enabled: true, is_default: true, config_data: {} },
            { id: 'transferencia', method_id: 'transferencia', method_name: 'Transferencia', is_enabled: true, is_default: false, config_data: { bankName: '', accountNumber: '', bankLogoUrl: null } },
            { id: 'pago_movil', method_id: 'pago_movil', method_name: 'Pago Móvil', is_enabled: true, is_default: false, config_data: { phone: '', ci: '' } },
            { id: 'zelle', method_id: 'zelle', method_name: 'Zelle', is_enabled: false, is_default: false, config_data: { email: '' } },
            { id: 'otro', method_id: 'otro', method_name: 'Otro', is_enabled: false, is_default: false, config_data: { description: '' } },
          ]);
        } else {
          // Transform database data to component format
          const methods = data.map(pm => ({
            id: pm.method_id,
            method_id: pm.method_id,
            method_name: pm.method_name,
            is_enabled: pm.is_enabled,
            is_default: pm.is_default,
            config_data: pm.config_data || {}
          }));
          setPaymentMethods(methods);
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
        setSaveMessage({ type: 'error', text: 'Error al cargar métodos de pago' });
      } finally {
        setLoading(false);
      }
    };

    loadPaymentMethods();
  }, [empresaId]);

  const togglePaymentMethod = (id, enabled) => {
    setPaymentMethods(paymentMethods.map(pm =>
      pm.id === id ? { ...pm, is_enabled: enabled } : pm
    ));
  };

  const setDefaultMethod = (id) => {
    setPaymentMethods(paymentMethods.map(pm => ({
      ...pm,
      is_default: pm.id === id
    })));
  };

  const updatePaymentDetails = (id, field, value) => {
    setPaymentMethods(paymentMethods.map(pm =>
      pm.id === id
        ? {
            ...pm,
            config_data: { ...pm.config_data, [field]: value }
          }
        : pm
    ));
  };

  const addNewMethod = () => {
    if (!newMethodName.trim()) return;

    const newMethod = {
      id: `custom_${Date.now()}`,
      method_id: `custom_${Date.now()}`,
      method_name: newMethodName.trim(),
      is_enabled: false,
      is_default: false,
      config_data: {
        description: newMethodDescription.trim(),
        logoUrl: newMethodLogoUrl
      }
    };

    setPaymentMethods([...paymentMethods, newMethod]);
    setNewMethodName('');
    setNewMethodDescription('');
    setNewMethodLogoUrl(null);
    setShowAddMethod(false);
  };

  const handleBankLogoUpload = async (methodId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const hash = await getFileHash(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${hash}.${fileExt}`;
      const filePath = `banco/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('raffle-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('raffle-images')
        .getPublicUrl(filePath);

      updatePaymentDetails(methodId, 'bankLogoUrl', urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading bank logo:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error al subir el logo del banco: ' + error.message
      });
    }
  };

  const handleMethodLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const hash = await getFileHash(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${hash}.${fileExt}`;
      const filePath = `metodo/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('raffle-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('raffle-images')
        .getPublicUrl(filePath);

      setNewMethodLogoUrl(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading method logo:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error al subir el logo del método: ' + error.message
      });
    }
  };

  const savePaymentMethods = async () => {
    if (!empresaId) return;

    setSaving(true);
    setSaveMessage({ type: 'info', text: 'Guardando configuración...' });

    try {
      // Delete existing payment methods for this company
      const { error: deleteError } = await supabase
        .from('t_payment_methods')
        .delete()
        .eq('empresa_id', empresaId);

      if (deleteError) {
        console.error('Error deleting old payment methods:', deleteError);
      }

      // Insert new payment methods
      const paymentMethodsToInsert = paymentMethods.map(pm => ({
        empresa_id: empresaId,
        method_id: pm.method_id,
        method_name: pm.method_name,
        is_enabled: pm.is_enabled,
        is_default: pm.is_default,
        config_data: pm.config_data
      }));

      const { error: insertError } = await supabase
        .from('t_payment_methods')
        .insert(paymentMethodsToInsert);

      if (insertError) throw insertError;

      setSaveMessage({
        type: 'success',
        text: 'Configuración de métodos de pago guardada exitosamente'
      });

      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving payment methods:', error);
      setSaveMessage({
        type: 'error',
        text: 'Error al guardar la configuración: ' + error.message
      });
    } finally {
      setSaving(false);
    }
  };

  const getPaymentMethodIcon = (id) => {
    switch(id) {
      case 'efectivo':
        return <BanknotesIcon className="w-4 h-4 text-green-600" />;
      case 'transferencia':
        return <CreditCardIcon className="w-4 h-4 text-blue-600" />;
      case 'pago_movil':
        return <DevicePhoneMobileIcon className="w-4 h-4 text-purple-600" />;
      case 'zelle':
        return <CurrencyDollarIcon className="w-4 h-4 text-indigo-600" />;
      default:
        return <CreditCardIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        <span className="ml-2 text-gray-300 text-sm">Cargando métodos de pago...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-2">
            <CreditCardIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white truncate">Métodos de Pago</h3>
              <p className="text-xs text-gray-400">Configura los métodos de pago disponibles</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-400/30">
              {paymentMethods.filter(pm => pm.is_enabled).length} activos
            </span>
            <button
              onClick={() => setShowAddMethod(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="w-3 h-3 mr-1" />
              Agregar
            </button>
          </div>
        </div>
      </div>

      {/* Add New Method Form */}
      {showAddMethod && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <PlusIcon className="w-5 h-5 text-indigo-400" />
              <h4 className="text-base font-medium text-white">Agregar Nuevo Método de Pago</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre del Método *
                </label>
                <input
                  type="text"
                  value={newMethodName}
                  onChange={(e) => setNewMethodName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ej: Bitcoin, PayPal, Tarjeta de Crédito..."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={newMethodDescription}
                  onChange={(e) => setNewMethodDescription(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Describe cómo funciona este método de pago, instrucciones para los usuarios, etc."
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Logo del Método (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="file"
                      id="method-logo"
                      accept="image/*"
                      onChange={(e) => handleMethodLogoUpload(e)}
                      className="hidden"
                    />
                    <label
                      htmlFor="method-logo"
                      className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer transition-colors"
                    >
                      <PhotoIcon className="w-4 h-4 mr-2" />
                      {newMethodLogoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                    </label>
                  </div>
                  {newMethodLogoUrl && (
                    <button
                      onClick={() => setNewMethodLogoUrl(null)}
                      className="text-red-400 hover:text-red-300 p-1"
                      title="Eliminar logo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {newMethodLogoUrl && (
                  <div className="mt-2">
                    <img
                      src={newMethodLogoUrl}
                      alt="Logo del método"
                      className="h-8 w-auto object-contain rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-700">
              <button
                onClick={addNewMethod}
                disabled={!newMethodName.trim()}
                className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Agregar Método
              </button>
              <button
                onClick={() => {
                  setShowAddMethod(false);
                  setNewMethodName('');
                  setNewMethodDescription('');
                  setNewMethodLogoUrl(null);
                }}
                className="flex-1 bg-gray-700 text-gray-300 text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Methods List */}
      <div className="space-y-2">
        {paymentMethods.map((method) => (
          <div key={method.id} className="bg-gray-800 rounded-lg border border-gray-700 p-2">
            {/* Method Header */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                {getPaymentMethodIcon(method.id)}
                {method.config_data.logoUrl && (
                  <img
                    src={method.config_data.logoUrl}
                    alt="Logo del método"
                    className="h-4 w-4 object-contain"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-medium truncate ${method.is_enabled ? 'text-white' : 'text-gray-400'}`}>
                      {method.method_name}
                    </h4>
                    {method.id.startsWith('custom_') && (
                      <button
                        onClick={() => removeCustomMethod(method.id)}
                        className="text-red-400 hover:text-red-300 p-0.5"
                        title="Eliminar método personalizado"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-xs px-1 py-0.5 rounded ${method.is_enabled ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                      {method.is_enabled ? 'Habilitado' : 'Deshabilitado'}
                    </span>
                    {method.is_default && (
                      <span className="text-xs px-1 py-0.5 rounded bg-yellow-900 text-yellow-300">
                        Predeterminado
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Toggle Switch */}
                <button
                  onClick={() => togglePaymentMethod(method.id, !method.is_enabled)}
                  className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors touch-manipulation ${method.is_enabled ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${method.is_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>

                {/* Default Button */}
                {method.is_enabled && (
                  <button
                    onClick={() => setDefaultMethod(method.id)}
                    disabled={method.is_default}
                    className={`px-2 py-0.5 text-xs rounded transition-colors whitespace-nowrap ${method.is_default ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    {method.is_default ? 'Predeterminado' : 'Establecer'}
                  </button>
                )}
              </div>
            </div>

            {/* Configuration Panel */}
            {method.is_enabled && (
              <div className="border-t border-gray-700 pt-2 space-y-2">
                {method.id === 'transferencia' && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-300 mb-2">Información Bancaria</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-0.5">
                          Nombre del Banco
                        </label>
                        <input
                          type="text"
                          value={method.config_data.bankName || ''}
                          onChange={(e) => updatePaymentDetails(method.id, 'bankName', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Banco de Venezuela"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-0.5">
                          Número de Cuenta
                        </label>
                        <input
                          type="text"
                          value={method.config_data.accountNumber || ''}
                          onChange={(e) => updatePaymentDetails(method.id, 'accountNumber', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="Número de cuenta"
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-400 mb-0.5">
                        Logo del Banco
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <input
                            type="file"
                            id={`bank-logo-${method.id}`}
                            accept="image/*"
                            onChange={(e) => handleBankLogoUpload(method.id, e)}
                            className="hidden"
                          />
                          <label
                            htmlFor={`bank-logo-${method.id}`}
                            className="inline-flex items-center px-3 py-1 text-xs font-medium rounded bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer transition-colors"
                          >
                            <PhotoIcon className="w-3 h-3 mr-1" />
                            {method.config_data.bankLogoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                          </label>
                        </div>
                        {method.config_data.bankLogoUrl && (
                          <button
                            onClick={() => removeBankLogo(method.id)}
                            className="text-red-400 hover:text-red-300 p-1"
                            title="Eliminar logo"
                          >
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {method.config_data.bankLogoUrl && (
                        <div className="mt-2">
                          <img
                            src={method.config_data.bankLogoUrl}
                            alt="Logo del banco"
                            className="h-8 w-auto object-contain rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {method.id === 'pago_movil' && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-300 mb-1">Información de Pago Móvil</h5>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                      <div className="lg:col-span-2">
                        <label className="block text-xs font-medium text-gray-400 mb-0.5">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={method.config_data.phone || ''}
                          onChange={(e) => updatePaymentDetails(method.id, 'phone', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="04141234567"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-0.5">
                          Cédula
                        </label>
                        <input
                          type="text"
                          value={method.config_data.ci || ''}
                          onChange={(e) => updatePaymentDetails(method.id, 'ci', e.target.value)}
                          className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          placeholder="V12345678"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {method.id === 'zelle' && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-300 mb-1">Información de Zelle</h5>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-0.5">
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={method.config_data.email || ''}
                        onChange={(e) => updatePaymentDetails(method.id, 'email', e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </div>
                )}

                {(method.id === 'otro' || method.id.startsWith('custom_')) && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-300 mb-1">Información Adicional</h5>
                    <div>
                      <label className="block text-xs font-medium text-gray-400 mb-0.5">
                        Descripción
                      </label>
                      <textarea
                        value={method.config_data.description || ''}
                        onChange={(e) => updatePaymentDetails(method.id, 'description', e.target.value)}
                        rows="2"
                        className="w-full px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        placeholder="Describe el método de pago..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Section */}
      {saveMessage.text && (
        <div className={`p-3 rounded-lg border ${saveMessage.type === 'error' ? 'bg-red-900/30 border-red-700 text-red-300' : saveMessage.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-blue-900/30 border-blue-700 text-blue-300'}`}>
          <div className="flex items-start gap-2">
            {saveMessage.type === 'error' ? (
              <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : saveMessage.type === 'success' ? (
              <CheckIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            ) : (
              <ArrowPathIcon className="w-4 h-4 animate-spin flex-shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium break-words">{saveMessage.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePaymentMethods}
          disabled={saving}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <CheckIcon className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

function Configuracion() {
  const [activeTab, setActiveTab] = useState('empresa');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { empresaId } = useAuth();

  // State for company data
  const [empresa, setEmpresa] = useState({ nombre_empresa: '', direccion_empresa: '', logo_url: '', logo_hash: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (empresaId) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('t_empresas')
            .select('*')
            .eq('id_empresa', empresaId)
            .single();

          if (error) throw error;

          if (data) {
            setEmpresa(data);
            if (data.logo_url) {
              setLogoPreview(data.logo_url);
            }
          }
        } catch (error) {
          console.error('Error cargando datos de la empresa:', error);
          setMessage({ type: 'error', text: 'Error al cargar los datos de la empresa' });
        }
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  const handleEmpresaInputChange = (campo, valor) => {
    setEmpresa(prev => ({ ...prev, [campo]: valor }));
  };

  const handleFileSelect = (file) => {
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const guardarEmpresa = async () => {
    if (!empresaId) return;

    setSaving(true);
    let logoUrlToSave = empresa.logo_url;
    let logoHashToSave = empresa.logo_hash;

    try {
      if (logoFile) {
        const newHash = await getFileHash(logoFile);

        // Check if image with same hash already exists
        const { data: existingImages, error: hashError } = await supabase
          .from('t_empresas')
          .select('logo_url, logo_hash')
          .eq('logo_hash', newHash)
          .limit(1);

        if (hashError) {
            // If the column logo_hash does not exist, this query will fail.
            // We can ignore the error and proceed to upload.
            console.warn("Could not check for existing logo hash. This might be because the 'logo_hash' column does not exist yet.", hashError);
        }


        if (existingImages && existingImages.length > 0) {
          logoUrlToSave = existingImages[0].logo_url;
          logoHashToSave = existingImages[0].logo_hash;
        } else {
          // If not, upload the new file
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `${newHash}.${fileExt}`;
          const filePath = `usuario/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('raffle-images')
            .upload(filePath, logoFile, {
              cacheControl: '3600',
              upsert: true, // Set to true to avoid "resource already exists" error
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('raffle-images')
            .getPublicUrl(filePath);

          logoUrlToSave = urlData.publicUrl;
          logoHashToSave = newHash;
        }
      }

      const { error: updateError } = await supabase
        .from('t_empresas')
        .update({
          nombre_empresa: empresa.nombre_empresa,
          direccion_empresa: empresa.direccion_empresa,
          logo_url: logoUrlToSave,
          logo_hash: logoHashToSave,
        })
        .eq('id_empresa', empresaId);

      if (updateError) throw updateError;

      setEmpresa(prev => ({ ...prev, logo_url: logoUrlToSave, logo_hash: logoHashToSave }));
      setMessage({ type: 'success', text: 'Datos de la empresa guardados correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error) {
      console.error('Error guardando datos de la empresa:', error);
      setMessage({ type: 'error', text: 'Error al guardar los datos de la empresa: ' + error.message });
    }
    setSaving(false);
  };

  const SeccionEmpresa = () => {
    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") {
        setDragActive(true);
      } else if (e.type === "dragleave") {
        setDragActive(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    };

    const handleChange = (e) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    };

    return (
      <div className="space-y-6">
        {/* Header Section */}
        <div className="border-b border-gray-800 pb-4">
          <h3 className="text-xl font-bold text-white">Información de la Empresa</h3>
          <p className="mt-1 text-sm text-gray-400">Actualiza los datos básicos de tu negocio</p>
        </div>

        <div className="space-y-6">
          {/* Company Name */}
          <div className="bg-[#1e2235] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-500/10 p-2 rounded-lg">
                <BuildingOffice2Icon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={empresa.nombre_empresa || ''}
                  onChange={(e) => handleEmpresaInputChange('nombre_empresa', e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#23283a] border border-gray-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                  placeholder="Ej: Mi Tienda, S.A."
                />
                <p className="mt-1 text-xs text-gray-400">
                  El nombre que aparecerá en facturas y recibos
                </p>
              </div>
            </div>
          </div>

          {/* Company Address */}
          <div className="bg-[#1e2235] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-500/10 p-2 rounded-lg">
                <MapPinIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dirección de la Empresa
                </label>
                <textarea
                  value={empresa.direccion_empresa || ''}
                  onChange={(e) => handleEmpresaInputChange('direccion_empresa', e.target.value)}
                  rows="3"
                  className="w-full px-4 py-2.5 bg-[#23283a] border border-gray-700 rounded-lg text-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all duration-200"
                  placeholder="Av. Principal #123, Ciudad, País"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Dirección fiscal de tu negocio
                </p>
              </div>
            </div>
          </div>
          {/* Company Logo */}
          <div className="bg-[#1e2235] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-colors">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-500/10 p-2 rounded-lg">
                <PhotoIcon className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Logo de la Empresa
                </label>

                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`mt-2 border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200 ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-500/5'
                      : 'border-gray-700 hover:border-gray-600 bg-[#23283a]'
                  }`}
                >
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleChange}
                  />
                  <label
                    htmlFor="logo-upload"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="relative">
                      {logoPreview ? (
                        <>
                          <div className="relative group">
                            <img
                              src={logoPreview}
                              alt="Vista previa del logo"
                              className="mx-auto h-24 w-auto max-w-full object-contain rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity p-4">
                              <PhotoIcon className="h-8 w-8 text-white mb-2" />
                              <span className="text-sm text-white text-center">
                                Haz clic para cambiar la imagen
                              </span>
                            </div>
                          </div>
                          {logoFile && (
                            <div className="mt-2 text-xs text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full inline-flex items-center">
                              <span className="truncate max-w-[200px]">
                                {logoFile.name}
                              </span>
                              <span className="ml-2 text-gray-500">
                                {(logoFile.size / 1024).toFixed(1)} KB
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6">
                          <div className="p-3 bg-indigo-500/10 rounded-full mb-3">
                            <PhotoIcon className="h-8 w-8 text-indigo-400" />
                          </div>
                          <p className="text-sm text-gray-300 mb-1">
                            <span className="text-indigo-400 font-medium">Sube tu logo</span> o arrastra una imagen
                          </p>
                          <p className="text-xs text-gray-400">
                            Formatos: PNG, JPG, GIF (máx. 5MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Recomendado: 500x500px, fondo transparente, formato PNG
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">
              Configuración
            </h1>
            <p className="text-sm sm:text-base text-gray-400">
              Gestiona la configuración de tu cuenta y preferencias
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Improved Mobile Design */}
      <div className="mb-6 sm:mb-8">
        <div className="relative">
          {/* Mobile: Vertical tabs, Desktop: Horizontal tabs */}
          <div className="block sm:hidden">
            <div className="space-y-2">
              {[
                { key: 'empresa', label: 'Empresa', icon: BuildingOffice2Icon, shortLabel: 'Info' },
                { key: 'pagos', label: 'Métodos de Pago', icon: CreditCardIcon, shortLabel: 'Pagos' },
                { key: 'backup', label: 'Copias de Seguridad', icon: CloudArrowDownIcon, shortLabel: 'Backup' }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all duration-200 mobile-tab-button ${
                      activeTab === tab.key
                        ? 'bg-[#2d3748] border-indigo-500/30 text-white shadow-lg shadow-indigo-500/20'
                        : 'bg-[#1e2235] border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-[#23283a]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{tab.label}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      activeTab === tab.key
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {tab.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: Horizontal tabs */}
          <div className="hidden sm:block">
            <div className="flex space-x-1 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
              <div className="inline-flex bg-[#1e2235] p-1 rounded-lg min-w-max mx-auto sm:mx-0">
                <button
                  onClick={() => setActiveTab('empresa')}
                  className={`flex items-center px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'empresa'
                      ? 'bg-[#2d3748] text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#2d3748]/50'
                  }`}
                >
                  <BuildingOffice2Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Empresa</span>
                  <span className="sm:hidden">Info</span>
                </button>
                <button
                  onClick={() => setActiveTab('pagos')}
                  className={`flex items-center px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'pagos'
                      ? 'bg-[#2d3748] text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#2d3748]/50'
                  }`}
                >
                  <CreditCardIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Métodos de Pago</span>
                  <span className="sm:hidden">Pagos</span>
                </button>
                <button
                  onClick={() => setActiveTab('backup')}
                  className={`flex items-center px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 whitespace-nowrap ${
                    activeTab === 'backup'
                      ? 'bg-[#2d3748] text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-[#2d3748]/50'
                  }`}
                >
                  <CloudArrowDownIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" />
                  <span className="hidden sm:inline">Copias de Seguridad</span>
                  <span className="sm:hidden">Backup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 mobile-message ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-300 border-green-500/30 shadow-lg shadow-green-500/10'
            : 'bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/10'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
              message.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {message.type === 'success' ? (
                <CheckIcon className="w-3 h-3 text-green-400" />
              ) : (
                <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-words">{message.text}</p>
              {message.type === 'success' && (
                <p className="text-xs text-green-400/80 mt-1">
                  Los cambios se han aplicado correctamente
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'empresa' && (
        <div className="bg-[#181c24] border border-[#23283a] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
          <div className="p-4 sm:p-6 lg:p-8">
            <SeccionEmpresa />
          </div>

          <div className="bg-gradient-to-r from-[#1e2235] to-[#23283a] px-4 py-4 sm:px-6 lg:px-8 border-t border-[#23283a] sm:rounded-b-2xl">
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                onClick={guardarEmpresa}
                disabled={saving}
                className="w-full sm:w-auto px-4 sm:px-6 lg:px-8 py-3 bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] text-white text-sm font-semibold rounded-xl hover:from-[#6b2dcc] hover:to-[#c23ff0] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {saving ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Guardando cambios...</span>
                    <span className="sm:hidden">Guardando...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Guardar Cambios</span>
                    <span className="sm:hidden">Guardar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pagos' && (
        <div className="bg-[#181c24] border border-[#23283a] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-indigo-500/10 mb-4 sm:mb-6">
                <CreditCardIcon className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
                Métodos de Pago
              </h3>
              <p className="text-gray-400 text-base sm:text-lg mb-4 sm:mb-6">
                Próximamente
              </p>
              <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
                Estamos trabajando en la configuración avanzada de métodos de pago.
                Pronto podrás gestionar múltiples opciones de pago directamente desde aquí.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="bg-[#181c24] border border-[#23283a] rounded-2xl overflow-hidden shadow-xl shadow-black/25">
          <div className="p-4 sm:p-6 lg:p-8">
            <BackupConfig />
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }

        /* Improved touch targets for mobile */
        @media (max-width: 768px) {
          button, [role="button"], [type="button"], [type="submit"], [type="reset"] {
            min-height: 48px;
            min-width: 48px;
          }

          input[type="text"],
          input[type="email"],
          input[type="password"],
          input[type="number"],
          input[type="tel"],
          textarea,
          select {
            font-size: 16px; /* Prevents iOS zoom on focus */
            min-height: 48px;
          }

          /* Better spacing for mobile */
          .space-y-6 > * + * {
            margin-top: 1.5rem;
          }

          /* Improved card shadows on mobile */
          .shadow-xl {
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
          }

          /* Better mobile tab design */
          .mobile-tab-button {
            touch-action: manipulation;
          }

          /* Improved mobile message design */
          .mobile-message {
            border-radius: 12px;
          }
        }

        /* Smooth animations for all interactions */
        * {
          transition-property: color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }

        /* Better focus states */
        button:focus-visible,
        input:focus-visible,
        select:focus-visible,
        textarea:focus-visible {
          outline: 2px solid #7c3bed;
          outline-offset: 2px;
        }

        /* Loading animation improvements */
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        {/* Fade in up animation for payment methods */}
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default Configuracion;