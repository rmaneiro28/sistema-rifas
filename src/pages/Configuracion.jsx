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
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  BuildingLibraryIcon
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
    className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${active
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
  const [backupMessage, setBackupMessage] = useState({ type: '', text: '' });
  const [autoBackup, setAutoBackup] = useState(false);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [backupHistory, setBackupHistory] = useState([]);
  const fileInputRef = useRef(null);
  const { empresaId } = useAuth();

  useEffect(() => {
    const loadBackupHistory = async () => {
      try {
        const history = localStorage.getItem(`backup_history_${empresaId}`);
        if (history) setBackupHistory(JSON.parse(history));
      } catch (error) { console.error(error); }
    };
    if (empresaId) loadBackupHistory();
  }, [empresaId]);

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
      const existing = JSON.parse(localStorage.getItem(`backup_history_${empresaId}`) || '[]');
      const updated = [historyItem, ...existing].slice(0, 10);
      localStorage.setItem(`backup_history_${empresaId}`, JSON.stringify(updated));
      setBackupHistory(updated);
    } catch (e) { console.error(e); }
  };

  const handleBackup = async () => {
    if (!empresaId) return;
    setIsLoading(true);
    setBackupMessage({ type: 'info', text: 'Empaquetando datos...' });
    try {
      const { data: empresaData } = await supabase.from('t_empresas').select('*').eq('id_empresa', empresaId).single();
      const { data: jugadores } = await supabase.from('t_jugadores').select('*').eq('empresa_id', empresaId);
      const { data: rifas } = await supabase.from('vw_rifas').select('*').eq('empresa_id', empresaId);
      const { data: tickets } = await supabase.from('vw_tickets').select('*').eq('empresa_id', empresaId);
      const { data: pagos } = await supabase.from('t_pagos').select('*').eq('empresa_id', empresaId);

      const backupData = { empresa: empresaData, jugadores, rifas, tickets, pagos, metadata: { backupDate: new Date().toISOString(), empresaId, version: '1.0' } };
      saveToHistory(backupData);

      const dataStr = JSON.stringify(backupData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `backup_${empresaData.nombre_empresa.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
      link.click();

      setBackupMessage({ type: 'success', text: 'Copia descargada correctamente' });
    } catch (error) {
      setBackupMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally { setIsLoading(false); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      if (!backupData.empresa || backupData.metadata.empresaId !== empresaId) throw new Error('Copia no válida para esta empresa');

      if (!window.confirm("¿Restaurar copia? Se borrarán los datos actuales.")) return;

      setBackupMessage({ type: 'info', text: 'Limpiando base de datos...' });
      await supabase.from('t_tickets').delete().eq('empresa_id', empresaId);
      await supabase.from('t_pagos').delete().eq('empresa_id', empresaId);
      await supabase.from('t_jugadores').delete().eq('empresa_id', empresaId);
      await supabase.from('t_rifas').delete().eq('empresa_id', empresaId);

      setBackupMessage({ type: 'info', text: 'Inyectando respaldos...' });
      const rifaIdMapping = new Map();

      if (backupData.rifas?.length > 0) {
        const rifasToInsert = backupData.rifas.map(r => ({
          nombre: r.nombre, descripcion: r.descripcion, precio_ticket: r.precio_ticket,
          fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin,
          total_tickets: r.numero_tickets || r.total_tickets, empresa_id: empresaId,
          estado: r.estado || 'activa', imagen_url: r.imagen_url,
          premio_principal: r.premio_descripcion || r.premio_principal,
          segundo_premio: r.segundo_premio, tercer_premio: r.tercer_premio,
          cuarto_premio: r.cuarto_premio, categoria: r.categoria, reglas: r.reglas
        }));

        const { data: insertedRifas } = await supabase.from('t_rifas').insert(rifasToInsert).select('id_rifa, nombre');
        if (insertedRifas) {
          insertedRifas.forEach((newR, i) => {
            const oldId = backupData.rifas[i].id || backupData.rifas[i].id_rifa;
            if (oldId) rifaIdMapping.set(oldId, newR.id_rifa);
          });
        }
      }

      if (backupData.jugadores?.length > 0) {
        await supabase.from('t_jugadores').insert(backupData.jugadores.map(j => ({
          id: j.id, nombre: j.nombre, apellido: j.apellido, cedula: j.cedula,
          telefono: j.telefono, email: j.email, direccion: j.direccion,
          numeros_favoritos: j.numeros_favoritos || [], empresa_id: empresaId
        })));
      }

      if (backupData.pagos?.length > 0) {
        await supabase.from('t_pagos').insert(backupData.pagos.map(p => ({
          id: p.id, jugador_id: p.jugador_id, monto: p.monto, banco: p.banco,
          telefono: p.telefono, cedula: p.cedula, referencia_bancaria: p.referencia_bancaria,
          metodo_pago: p.metodo_pago, empresa_id: empresaId, tipo_pago: p.tipo_pago,
          notas: p.notas, fecha_pago: p.fecha_pago
        })));
      }

      if (backupData.tickets?.length > 0) {
        const tkts = backupData.tickets.map(t => ({
          id: t.ticket_id || t.id, rifa_id: rifaIdMapping.get(t.rifa_id) || t.rifa_id,
          jugador_id: t.jugador_id, numero: t.numero || parseInt(t.numero_ticket?.replace(/\D/g, '')),
          estado: t.estado_ticket || t.estado || 'apartado', empresa_id: empresaId,
          fecha_apartado: t.fecha_apartado, fecha_pago: t.fecha_pago
        })).filter(t => t.numero != null && t.rifa_id);

        for (let i = 0; i < tkts.length; i += 100) {
          await supabase.from('t_tickets').insert(tkts.slice(i, i + 100));
        }
      }

      setBackupMessage({ type: 'success', text: 'Restauración completada. Reiniciando...' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setBackupMessage({ type: 'error', text: error.message });
    } finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Action Card */}
      <div className="bg-[#1e2235] rounded-[32px] border border-gray-800 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full"></div>

        <div className="relative">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <CloudArrowUpIcon className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">Centro de Respaldo</h3>
              <p className="text-[9px] text-gray-500 font-medium uppercase tracking-[1.5px]">Seguridad de la Información</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={handleBackup}
              disabled={isLoading}
              className="group relative h-14 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center gap-3 px-6 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
            >
              {isLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin text-white" /> : (
                <>
                  <CloudArrowUpIcon className="h-4 w-4 text-white group-hover:scale-125 transition-transform" />
                  <span className="text-white text-[10px] font-black uppercase tracking-widest text-center">Crear Nueva Copia</span>
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="h-14 bg-[#23283a] rounded-xl flex items-center justify-center gap-3 px-6 border border-gray-700 hover:border-indigo-500/50 hover:bg-[#2d3748] active:scale-95 transition-all"
            >
              <CloudArrowDownIcon className="h-4 w-4 text-indigo-400" />
              <span className="text-gray-300 text-[10px] font-black uppercase tracking-widest text-center">Restaurar Datos</span>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
            </button>
          </div>

          {/* Auto Backup Toggle */}
          <div className="mt-10 pt-8 border-t border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${autoBackup ? 'bg-indigo-500/10' : 'bg-gray-800/50'}`}>
                <ClockIcon className={`h-5 w-5 ${autoBackup ? 'text-indigo-400' : 'text-gray-600'}`} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">Sincronización Automática</h4>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Copia de seguridad periódica</p>
              </div>
            </div>

            <Switch
              checked={autoBackup}
              onChange={setAutoBackup}
              className={`${autoBackup ? 'bg-indigo-600' : 'bg-gray-800'} relative inline-flex h-7 w-12 items-center rounded-full border border-gray-700 transition-all`}
            >
              <span className={`${autoBackup ? 'translate-x-[26px]' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md`} />
            </Switch>
          </div>
        </div>
      </div>

      {/* History Card - Mobile Optimized */}
      <div className="bg-[#181c24] rounded-[32px] border border-gray-800/50 overflow-hidden shadow-xl">
        <div className="p-6 sm:p-8 bg-[#1e2235]/40 border-b border-gray-800/50 flex items-center gap-3">
          <ClockIcon className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Historial Reciente</h3>
        </div>

        <div className="p-4 sm:p-8">
          {backupHistory.length > 0 ? (
            <div className="space-y-4">
              {backupHistory.map((backup) => (
                <div key={backup.id} className="group relative bg-[#1e2235]/50 rounded-2xl border border-gray-800 p-4 sm:p-5 hover:border-indigo-500/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <p className="text-xs font-bold text-white truncate font-mono opacity-80">{backup.name}</p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">Fecha</span>
                          <span className="text-[11px] font-medium text-gray-400">{new Date(backup.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">Peso</span>
                          <span className="text-[11px] font-medium text-indigo-400">{backup.size}</span>
                        </div>
                        <div className="flex flex-col col-span-2">
                          <span className="text-[9px] font-black text-gray-600 uppercase tracking-tighter">Registros</span>
                          <span className="text-[11px] font-medium text-gray-400">{backup.records.jugadores}J • {backup.records.tickets}T • {backup.records.pagos}P</span>
                        </div>
                      </div>
                    </div>
                    <button className="h-10 px-5 bg-gray-800 hover:bg-indigo-600 text-[10px] font-black uppercase tracking-widest text-white rounded-xl border border-gray-700 transition-all active:scale-95 whitespace-nowrap">
                      Descargar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-800">
                <CloudArrowDownIcon className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sin registros locales</p>
            </div>
          )}
        </div>
      </div>

      {backupMessage.text && (
        <div className={`mt-4 p-4 rounded-2xl text-[11px] font-black uppercase tracking-[1px] text-center animate-fadeIn ${backupMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : backupMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
          {backupMessage.text}
        </div>
      )}
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
          setPaymentMethods([
            { id: 'efectivo', method_id: 'efectivo', method_name: 'Efectivo', is_enabled: true, is_default: true, config_data: {} },
            { id: 'transferencia', method_id: 'transferencia', method_name: 'Transferencia', is_enabled: true, is_default: false, config_data: { bankName: '', accountNumber: '', bankLogoUrl: null } },
            { id: 'pago_movil', method_id: 'pago_movil', method_name: 'Pago Móvil', is_enabled: true, is_default: false, config_data: { phone: '', ci: '' } },
            { id: 'zelle', method_id: 'zelle', method_name: 'Zelle', is_enabled: false, is_default: false, config_data: { email: '' } },
          ]);
        } else {
          setPaymentMethods(data.map(pm => ({
            id: pm.method_id,
            method_id: pm.method_id,
            method_name: pm.method_name,
            is_enabled: pm.is_enabled,
            is_default: pm.is_default,
            config_data: pm.config_data || {}
          })));
        }
      } catch (error) {
        setSaveMessage({ type: 'error', text: 'Error al cargar métodos' });
      } finally {
        setLoading(false);
      }
    };
    loadPaymentMethods();
  }, [empresaId]);

  const togglePaymentMethod = (id, enabled) => {
    setPaymentMethods(paymentMethods.map(pm => pm.id === id ? { ...pm, is_enabled: enabled } : pm));
  };

  const setDefaultMethod = (id) => {
    setPaymentMethods(paymentMethods.map(pm => ({ ...pm, is_default: pm.id === id })));
  };

  const updatePaymentDetails = (id, field, value) => {
    setPaymentMethods(paymentMethods.map(pm => pm.id === id ? { ...pm, config_data: { ...pm.config_data, [field]: value } } : pm));
  };

  const savePaymentMethods = async () => {
    if (!empresaId) return;
    setSaving(true);
    setSaveMessage({ type: 'info', text: 'Sincronizando...' });
    try {
      await supabase.from('t_payment_methods').delete().eq('empresa_id', empresaId);
      const toInsert = paymentMethods.map(pm => ({
        empresa_id: empresaId,
        method_id: pm.method_id,
        method_name: pm.method_name,
        is_enabled: pm.is_enabled,
        is_default: pm.is_default,
        config_data: pm.config_data
      }));
      const { error } = await supabase.from('t_payment_methods').insert(toInsert);
      if (error) throw error;
      setSaveMessage({ type: 'success', text: 'Configuración actualizada' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Error: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const getIcon = (id) => {
    const props = "h-5 w-5";
    switch (id) {
      case 'efectivo': return <BanknotesIcon className={`${props} text-emerald-400`} />;
      case 'transferencia': return <BuildingLibraryIcon className={`${props} text-blue-400`} />;
      case 'pago_movil': return <DevicePhoneMobileIcon className={`${props} text-purple-400`} />;
      case 'zelle': return <CurrencyDollarIcon className={`${props} text-indigo-400`} />;
      default: return <CreditCardIcon className={`${props} text-gray-400`} />;
    }
  };

  if (loading) return <div className="p-12 text-center animate-pulse text-indigo-400 font-black uppercase tracking-widest text-xs">Cargando pasarelas...</div>;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeInUp">
      {/* Premium Header Card */}
      <div className="bg-gradient-to-br from-[#1e2235] to-[#181c24] rounded-[32px] p-6 sm:p-8 border border-gray-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full -mr-10 -mt-10 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <CreditCardIcon className="h-7 w-7 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">Pasarelas de Pago</h3>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-[2px]">Activa tus canales de cobro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Grid - Full Width Mobile Fix */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        {paymentMethods.map((method) => (
          <div key={method.id} className={`group relative transition-all duration-500 ${method.is_enabled ? 'opacity-100' : 'opacity-60'}`}>
            <div className={`relative bg-[#1e2235] rounded-[28px] border transition-all duration-300 overflow-hidden ${method.is_enabled ? 'border-gray-800 hover:border-indigo-500/30 shadow-xl' : 'border-gray-900 border-dashed hover:border-gray-800'}`}>

              <div className="p-5 sm:p-6 lg:p-8">
                {/* Method Row - Stack on Mobile to prevent overflow */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${method.is_enabled ? 'bg-gray-800 border-gray-700 shadow-inner' : 'bg-gray-900 border-gray-800'}`}>
                      {getIcon(method.id)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-white truncate tracking-tight">{method.method_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${method.is_enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-800/50 text-gray-600 border-gray-800'}`}>
                          {method.is_enabled ? 'Activo' : 'Inactivo'}
                        </span>
                        {method.is_default && (
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Principal</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions - Flex row to stay side by side but with good spacing */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-gray-800/50 pt-4 sm:pt-0 sm:border-none">
                    <div className="flex flex-col items-center">
                      <Switch
                        checked={method.is_enabled}
                        onChange={() => togglePaymentMethod(method.id, !method.is_enabled)}
                        className={`${method.is_enabled ? 'bg-indigo-600' : 'bg-gray-800'
                          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors border border-gray-700`}
                      >
                        <span className={`${method.is_enabled ? 'translate-x-6' : 'translate-x-1'
                          } inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform`} />
                      </Switch>
                      <span className="text-[8px] font-black uppercase text-gray-500 mt-1">{method.is_enabled ? 'ON' : 'OFF'}</span>
                    </div>

                    {method.is_enabled && !method.is_default && (
                      <button
                        onClick={() => setDefaultMethod(method.id)}
                        className="px-4 h-9 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-700 transition-all active:scale-95"
                      >
                        Hacer Principal
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Forms - Compact & Mobile Safe */}
                {method.is_enabled && (
                  <div className="mt-8 pt-8 border-t border-gray-800/80 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {method.id === 'transferencia' && (
                        <>
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Banco Emisor</label>
                            <input
                              type="text"
                              value={method.config_data.bankName || ''}
                              onChange={(e) => updatePaymentDetails(method.id, 'bankName', e.target.value)}
                              className="w-full bg-[#0f131b]/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500/50 focus:ring-0 transition-all transition-all"
                              placeholder="Ej: Banesco"
                            />
                          </div>
                          <div className="lg:col-span-2">
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Cuenta Clave (20 dígitos)</label>
                            <input
                              type="text"
                              value={method.config_data.accountNumber || ''}
                              onChange={(e) => updatePaymentDetails(method.id, 'accountNumber', e.target.value)}
                              className="w-full bg-[#0f131b]/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500/50 focus:ring-0 transition-all font-mono"
                              placeholder="0134 0000 0000 0000 0000"
                            />
                          </div>
                        </>
                      )}

                      {method.id === 'pago_movil' && (
                        <>
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Teléfono Vinculado</label>
                            <input
                              type="tel"
                              value={method.config_data.phone || ''}
                              onChange={(e) => updatePaymentDetails(method.id, 'phone', e.target.value)}
                              className="w-full bg-[#0f131b]/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500/50 focus:ring-0 transition-all"
                              placeholder="0424..."
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Documento (V/J/E)</label>
                            <input
                              type="text"
                              value={method.config_data.ci || ''}
                              onChange={(e) => updatePaymentDetails(method.id, 'ci', e.target.value)}
                              className="w-full bg-[#0f131b]/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500/50 focus:ring-0 transition-all"
                              placeholder="V-12.345.678"
                            />
                          </div>
                        </>
                      )}

                      {method.id === 'zelle' && (
                        <div className="md:col-span-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">Correo Electrónico Zelle</label>
                          <input
                            type="email"
                            value={method.config_data.email || ''}
                            onChange={(e) => updatePaymentDetails(method.id, 'email', e.target.value)}
                            className="w-full bg-[#0f131b]/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm font-bold focus:border-indigo-500/50 focus:ring-0 transition-all"
                            placeholder="zelle@negocio.com"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="mt-8">
        <button
          onClick={savePaymentMethods}
          disabled={saving}
          className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-[2px] text-sm rounded-2xl hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center shadow-xl shadow-indigo-600/20 group"
        >
          {saving ? (
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <CheckIcon className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />
              <span>Sincronizar Pasarelas</span>
            </>
          )}
        </button>
      </div>

      {saveMessage.text && (
        <div className={`mt-4 p-4 rounded-2xl text-[11px] font-black uppercase tracking-[1px] text-center animate-fadeIn ${saveMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : saveMessage.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
          {saveMessage.text}
        </div>
      )}
    </div>
  );
};

// Reminder Configuration Component
const ReminderConfig = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { empresaId } = useAuth();

  const defaultTemplates = [
    { name: 'Mensaje 1 (Cercano)', content: 'Hola {{saludo}} {{nombre_jugador}}! 🎫 Le escribimos de {{nombre_empresa}} para recordarle que tiene pendiente el pago de sus números: {{lista_tickets}}. El sorteo es el {{fecha_sorteo}}. ¡Mucha suerte!', is_active: true },
    { name: 'Mensaje 2 (Cobro)', content: '{{saludo}} {{nombre_jugador}}, por aquí le envío el recordatorio de sus números ({{lista_tickets}}) para el sorteo de {{nombre_rifa}}. El total a cancelar es ${{monto_total}}. ¡Gracias!', is_active: false },
    { name: 'Mensaje 3 (Promoción)', content: '✨ {{saludo}} {{nombre_jugador}}! Recuerda que pagando antes del miércoles participas en sorteos adicionales. Sus números: {{lista_tickets}}.', is_active: false }
  ];

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!empresaId) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('t_reminder_templates')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          setTemplates(data);
        } else {
          // Initialize with defaults if empty
          setTemplates(defaultTemplates.map((t, i) => ({ ...t, id: `new-${i}` })));
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        setMessage({ type: 'error', text: 'Error al cargar las plantillas' });
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [empresaId]);

  const handleUpdateContent = (id, newContent) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, content: newContent } : t));
  };

  const setAsDefault = async (id) => {
    if (!empresaId) return;

    // Update local state first
    const updatedTemplates = templates.map(t => ({
      ...t,
      is_active: t.id === id
    }));
    setTemplates(updatedTemplates);

    // Persist immediately using the updated array
    await saveTemplates(updatedTemplates);
  };

  const [activeTextarea, setActiveTextarea] = useState(null);

  const insertVariable = (variableTag) => {
    if (activeTextarea === null) {
      setMessage({ type: 'error', text: 'Haz clic primero en un mensaje para saber dónde insertar la variable' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }

    const template = templates.find(t => t.id === activeTextarea);
    if (!template) return;

    const textarea = document.getElementById(`template-textarea-${activeTextarea}`);
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = template.content;
    const newContent = content.substring(0, start) + variableTag + content.substring(end);

    handleUpdateContent(activeTextarea, newContent);

    // Reposition cursor after the inserted variable (using timeout to wait for React render)
    setTimeout(() => {
      textarea.focus();
      const newPos = start + variableTag.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const saveTemplates = async (templatesToSave) => {
    const toSave = Array.isArray(templatesToSave) ? templatesToSave : templates;
    if (!empresaId) return;
    setSaving(true);
    try {
      // Step 1: Handle all updates/inserts in a single sequence
      for (const template of toSave) {
        const payload = {
          name: template.name,
          content: template.content,
          is_active: template.is_active === true, // Explicit boolean
          empresa_id: empresaId,
          updated_at: new Date().toISOString()
        };

        if (template.id.toString().startsWith('new-')) {
          const { error } = await supabase.from('t_reminder_templates').insert(payload);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('t_reminder_templates')
            .update(payload)
            .eq('id', template.id);
          if (error) throw error;
        }
      }

      // Refresh to get real IDs
      const { data } = await supabase
        .from('t_reminder_templates')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('name');
      setTemplates(data);

      setMessage({ type: 'success', text: 'Plantillas guardadas correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving templates:', error);
      setMessage({ type: 'error', text: 'Error al guardar: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  const variables = [
    { tag: '{{saludo}}', desc: 'Buenos días/tardes/noches' },
    { tag: '{{nombre_jugador}}', desc: 'Nombre del cliente' },
    { tag: '{{nombre_empresa}}', desc: 'Nombre de tu negocio' },
    { tag: '{{lista_tickets}}', desc: 'Números apartados' },
    { tag: '{{nombre_rifa}}', desc: 'Nombre de la rifa' },
    { tag: '{{monto_total}}', desc: 'Total a pagar' },
    { tag: '{{fecha_sorteo}}', desc: 'Fecha del sorteo' },
  ];

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando plantillas...</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-[#181c24] shadow-xl rounded-2xl p-4 sm:p-6 border border-gray-700/50">
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <DevicePhoneMobileIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Plantillas de WhatsApp
            </h3>
          </div>
          {activeTextarea !== null && (
            <button
              onClick={() => setActiveTextarea(null)}
              className="text-[10px] sm:text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-indigo-500/20 transition-all flex items-center gap-1"
            >
              <span>← Volver</span>
            </button>
          )}
        </div>

        {/* Dynamic Variables Grid - Optimized for Mobile */}
        <div className="bg-[#1e2235]/30 p-4 sm:p-6 rounded-[24px] border border-gray-800/50 mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-[1.5px]">Variables Disponibles</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {variables.map(v => (
              <button
                key={v.tag}
                onClick={() => insertVariable(v.tag)}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#23283a] rounded-lg border border-gray-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all active:scale-95 group shadow-sm"
                title={v.desc}
              >
                <code className="text-indigo-400 text-[9px] font-black tracking-tight">{v.tag}</code>
              </button>
            ))}
          </div>

          <p className="mt-4 text-[10px] text-gray-500 font-medium italic border-t border-gray-800/50 pt-3">
            Toca una variable para insertarla en la posición actual del cursor.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {templates
            .filter(t => activeTextarea === null || t.id === activeTextarea)
            .map((template, idx) => {
              const isActive = activeTextarea === template.id;
              return (
                <div
                  key={template.id}
                  className={`bg-[#1e2235] p-4 sm:p-5 rounded-xl sm:rounded-2xl border transition-all duration-300 ${isActive
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg'
                    : 'border-gray-700 hover:border-gray-600'
                    }`}
                >
                  <div className="flex justify-between items-center mb-2 sm:mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-black ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                        {idx + 1}
                      </span>
                      <label className={`text-[11px] font-bold tracking-tight ${isActive ? 'text-indigo-300' : 'text-gray-300'}`}>
                        {template.name}
                      </label>
                    </div>
                    {!isActive ? (
                      <div className="flex gap-2">
                        {!template.is_active && (
                          <button
                            onClick={() => setAsDefault(template.id)}
                            className="text-[9px] text-gray-500 hover:text-indigo-400 font-bold uppercase tracking-wider"
                            title="Marcar como predeterminado"
                          >
                            Hacer Predeterminado
                          </button>
                        )}
                        {template.is_active && (
                          <span className="text-[8px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded font-black tracking-widest uppercase border border-green-500/20">Predeterminado</span>
                        )}
                        <button
                          onClick={() => setActiveTextarea(template.id)}
                          className="text-[9px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
                        >
                          Editar
                        </button>
                      </div>
                    ) : (
                      <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded font-black tracking-widest uppercase">Editando</span>
                    )}
                  </div>
                  <textarea
                    id={`template-textarea-${template.id}`}
                    value={template.content}
                    onChange={(e) => handleUpdateContent(template.id, e.target.value)}
                    onFocus={() => setActiveTextarea(template.id)}
                    rows={isActive ? (window.innerWidth < 640 ? "8" : "10") : "3"}
                    className={`w-full px-3 py-2 sm:px-4 sm:py-3 bg-[#0f131b]/30 border-none rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500/40 transition-all resize-none ${isActive ? 'font-medium leading-relaxed' : 'text-gray-500 overflow-hidden'
                      }`}
                    placeholder="Escribe aquí el mensaje..."
                  />

                  {isActive && (
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">{template.content.length} caracteres</span>
                      <button
                        onClick={() => setActiveTextarea(null)}
                        className="text-[9px] text-gray-400 underline decoration-gray-700 underline-offset-4 font-bold"
                      >
                        Cerrar editor
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        {message.text && (
          <div className={`mt-6 p-4 rounded-2xl text-xs font-bold text-center animate-fadeIn ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {message.text}
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={saveTemplates}
            disabled={saving}
            className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-[1.5px] text-[12px] rounded-xl hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-indigo-600/10"
          >
            {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : (
              <>
                <CheckIcon className="w-4 h-4 mr-2.5" />
                <span>Guardar Plantillas</span>
              </>
            )}
          </button>
        </div>
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
      <div className="space-y-6 sm:space-y-8 animate-fadeInUp">
        {/* Header - Native App Style */}
        <div className="flex items-center gap-4 border-b border-gray-800/50 pb-5">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BuildingOffice2Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Identidad Visual</h3>
            <p className="text-[10px] text-indigo-400 font-medium uppercase tracking-[1px]">Gestión de Perfil</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-8">
          {/* Form Group */}
          <div className="space-y-5 sm:space-y-6">
            {/* Input Card: Name */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-[#1e2235] rounded-[24px] p-5 sm:p-6 border border-gray-800 focus-within:border-indigo-500/50 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[1.5px]">Nombre de tu Negocio</label>
                  <BuildingOffice2Icon className="h-3 w-3 text-indigo-500/50" />
                </div>
                <input
                  type="text"
                  value={empresa.nombre_empresa || ''}
                  onChange={(e) => handleEmpresaInputChange('nombre_empresa', e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-white text-sm sm:text-base font-bold placeholder:text-gray-700 focus:ring-0"
                  placeholder="Ej: El Fénix Rápido"
                />
              </div>
            </div>

            {/* Input Card: Address */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
              <div className="relative bg-[#1e2235] rounded-[24px] p-5 sm:p-6 border border-gray-800 focus-within:border-indigo-500/50 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[9px] font-black text-gray-500 uppercase tracking-[1.5px]">Ubicación y Sede</label>
                  <MapPinIcon className="h-3 w-3 text-indigo-500/50" />
                </div>
                <textarea
                  value={empresa.direccion_empresa || ''}
                  onChange={(e) => handleEmpresaInputChange('direccion_empresa', e.target.value)}
                  rows="2"
                  className="w-full bg-transparent border-none p-0 text-white text-[13px] font-medium placeholder:text-gray-700 focus:ring-0 resize-none"
                  placeholder="Donde te encuentran tus clientes..."
                />
              </div>
            </div>
          </div>

          {/* Logo Upload Card */}
          <div className="relative group lg:h-full">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-[32px] blur-xl"></div>
            <div className="relative h-full bg-[#1e2235] rounded-[32px] p-6 sm:p-8 border border-gray-800 flex flex-col items-center justify-center transition-all group-hover:border-indigo-500/30">
              <div className="mb-6 text-center">
                <h4 className="text-sm font-black text-white uppercase tracking-[2px] mb-1">Tu Logotipo</h4>
                <p className="text-[10px] text-gray-500">Para recibos y PDF compartidos</p>
              </div>

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className="w-full"
              >
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleChange}
                />
                <label htmlFor="logo-upload" className="cursor-pointer block">
                  {logoPreview ? (
                    <div className="relative mx-auto w-32 h-32 sm:w-40 sm:h-40 group/img">
                      <div className="absolute -inset-2 bg-indigo-500/20 rounded-[40px] blur-md opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="relative w-full h-full object-cover rounded-[32px] border-4 border-[#23283a] bg-[#0f131b] shadow-2xl transition-transform group-hover/img:scale-105 duration-500"
                      />
                      <div className="absolute top-2 right-2 p-2 bg-indigo-600 rounded-xl shadow-lg opacity-0 group-hover/img:opacity-100 transition-opacity scale-75 group-hover/img:scale-100 duration-300">
                        <ArrowPathIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="mx-auto w-32 h-32 sm:w-40 sm:h-40 bg-[#0f131b]/50 border-2 border-dashed border-gray-700 rounded-[32px] flex flex-col items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                      <PhotoIcon className="h-10 w-10 text-gray-700 group-hover:text-indigo-500 transition-colors" />
                      <span className="mt-2 text-[10px] font-black text-gray-600 uppercase">Subir</span>
                    </div>
                  )}
                </label>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 w-full">
                <div className="bg-[#23283a] rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black text-white mb-0.5">PNG/JPG</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest">Formatos</p>
                </div>
                <div className="bg-[#23283a] rounded-2xl p-3 text-center">
                  <p className="text-[10px] font-black text-white mb-0.5">2 MB</p>
                  <p className="text-[8px] text-gray-500 uppercase tracking-widest">Límite</p>
                </div>
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
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent tracking-tight">
              Configuración
            </h1>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
              Perfil y Preferencias del Sistema
            </p>
          </div>
        </div>
      </div>

      {/* Menú de Navegación - Reducido y Minimalista */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {[
          { key: 'empresa', label: 'Empresa', badge: 'Perfil', icon: BuildingOffice2Icon },
          { key: 'recordatorios', label: 'Recordatorios', badge: 'Mensajes', icon: ChatBubbleLeftRightIcon },
          { key: 'backup', label: 'Seguridad', badge: 'Respaldos', icon: CloudArrowDownIcon }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 group active:scale-[0.98] ${isActive
                ? 'bg-[#1e2235] border-indigo-500/40 shadow-lg shadow-indigo-500/5'
                : 'bg-[#131722]/40 border-gray-800/30 hover:border-gray-700'
                }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-600 group-hover:text-gray-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className={`text-[8px] font-black uppercase tracking-[1px] leading-tight ${isActive ? 'text-indigo-400' : 'text-gray-700'}`}>
                    {tab.badge}
                  </p>
                  <p className={`text-[11px] font-bold leading-tight ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {tab.label}
                  </p>
                </div>
              </div>
              <div className={`w-1 h-1 rounded-full transition-all duration-500 ${isActive ? 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)] scale-110' : 'bg-transparent'}`}></div>
            </button>
          );
        })}
      </div>

      {message.text && (
        <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl border backdrop-blur-sm transition-all duration-300 mobile-message ${message.type === 'success'
          ? 'bg-green-500/10 text-green-300 border-green-500/30 shadow-lg shadow-green-500/10'
          : 'bg-red-500/10 text-red-300 border-red-500/30 shadow-lg shadow-red-500/10'
          }`}>
          <div className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${message.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'
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
        <div className="mt-4 sm:mt-6 animate-fadeIn">
          <div className="bg-[#181c24] border border-gray-800/50 rounded-[40px] shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-10">
              <SeccionEmpresa />
            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-[#0f131b]/50 px-6 py-6 sm:px-10 border-t border-gray-800/50">
              <button
                onClick={guardarEmpresa}
                disabled={saving}
                className="w-full h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black uppercase tracking-[2px] text-sm rounded-2xl hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center shadow-xl shadow-indigo-600/20 group"
              >
                {saving ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckIcon className="w-5 h-5 mr-3 group-hover:scale-125 transition-transform" />
                    <span>Confirmar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recordatorios' && <ReminderConfig />}

      {activeTab === 'backup' && (
        <div className="mt-4 sm:mt-6 animate-fadeIn">
          <BackupConfig />
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

        /* Fade in up animation for payment methods */
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