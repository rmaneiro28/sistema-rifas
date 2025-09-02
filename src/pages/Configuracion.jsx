import { useState, useEffect } from "react";
import {
  Cog6ToothIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
  BellIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PhotoIcon
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { InboxIcon } from "@heroicons/react/24/outline";

function Configuracion() {
  const [activeSection, setActiveSection] = useState("general");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Estados para la configuración
  const [config, setConfig] = useState({
    general: {
      nombre_sitio: "Rifas Online",
      descripcion: "Sistema de gestión de rifas y tickets",
      moneda: "$",
      timezone: "America/Caracas",
      idioma: "es"
    },
    apariencia: {
      tema: "oscuro",
      color_primario: "#7c3bed",
      logo_url: "",
      favicon_url: ""
    },
    pagos: {
      metodos_activos: ["transferencia", "pago_movil", "efectivo"],
      comision_porcentaje: 0,
      dias_vencimiento: 3,
      notificar_pagos: true
    },
    notificaciones: {
      email_nuevo_ticket: true,
      email_pago_confirmado: true,
      email_solicitud_pago: true,
      sms_habilitado: false,
      telegram_habilitado: false
    },
    usuarios: {
      registro_abierto: true,
      verificar_email: true,
      roles_predeterminados: ["usuario", "vendedor", "administrador"]
    },
    seguridad: {
      intentos_login: 3,
      bloqueo_temporal: 30,
      requerir_2fa: false,
      log_accesos: true
    }
  });

  // Cargar configuración al iniciar
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('t_configuracion')
        .select('*');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Convertir la configuración de la base de datos al formato del estado
        const configFromDB = data.reduce((acc, item) => {
          acc[item.seccion] = item.configuracion;
          return acc;
        }, {});
        
        setConfig(prev => ({ ...prev, ...configFromDB }));
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setMessage({ type: 'error', text: 'Error al cargar la configuración' });
    }
    setLoading(false);
  };

  const guardarConfiguracion = async (seccion) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('configuraciones')
        .upsert({
          seccion,
          configuracion: config[seccion],
          actualizado_en: new Date().toISOString()
        }, { onConflict: 'seccion' });
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error guardando configuración:', error);
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    }
    setSaving(false);
  };

  const handleInputChange = (seccion, campo, valor) => {
    setConfig(prev => ({
      ...prev,
      [seccion]: {
        ...prev[seccion],
        [campo]: valor
      }
    }));
  };

  const handleArrayChange = (seccion, campo, valor, checked) => {
    setConfig(prev => {
      const currentArray = prev[seccion][campo] || [];
      let newArray;
      
      if (checked) {
        newArray = [...currentArray, valor];
      } else {
        newArray = currentArray.filter(item => item !== valor);
      }
      
      return {
        ...prev,
        [seccion]: {
          ...prev[seccion],
          [campo]: newArray
        }
      };
    });
  };

  const MenuItem = ({ id, label, description }) => (
    <button
      onClick={() => setActiveSection(id)}
      className={`w-full text-left p-4 rounded-lg transition-colors ${
        activeSection === id
          ? 'bg-[#7c3bed] text-white'
          : 'text-gray-300 hover:bg-[#23283a] hover:text-white'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-sm opacity-75">{description}</div>
        </div>
      </div>
    </button>
  );

  const SeccionGeneral = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Información General</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Sitio
            </label>
            <input
              type="text"
              value={config.general.nombre_sitio}
              onChange={(e) => handleInputChange('general', 'nombre_sitio', e.target.value)}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <input
              type="text"
              value={config.general.descripcion}
              onChange={(e) => handleInputChange('general', 'descripcion', e.target.value)}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Moneda
            </label>
            <select
              value={config.general.moneda}
              onChange={(e) => handleInputChange('general', 'moneda', e.target.value)}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            >
              <option value="$">$ - Dólar</option>
              <option value="€">€ - Euro</option>
              <option value="Bs">Bs - Bolívares</option>
              <option value="₡">₡ - Colones</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Zona Horaria
            </label>
            <select
              value={config.general.timezone}
              onChange={(e) => handleInputChange('general', 'timezone', e.target.value)}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            >
              <option value="America/Caracas">Caracas (UTC-4)</option>
              <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
              <option value="America/Bogota">Bogotá (UTC-5)</option>
              <option value="America/Lima">Lima (UTC-5)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const SeccionApariencia = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Apariencia</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tema
            </label>
            <select
              value={config.apariencia.tema}
              onChange={(e) => handleInputChange('apariencia', 'tema', e.target.value)}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            >
              <option value="oscuro">Oscuro</option>
              <option value="claro">Claro</option>
              <option value="auto">Automático</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Color Primario
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={config.apariencia.color_primario}
                onChange={(e) => handleInputChange('apariencia', 'color_primario', e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={config.apariencia.color_primario}
                onChange={(e) => handleInputChange('apariencia', 'color_primario', e.target.value)}
                className="flex-1 px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
              />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Logo del Sitio
            </label>
            <div className="flex items-center space-x-4">
              {config.apariencia.logo_url && (
                <img
                  src={config.apariencia.logo_url}
                  alt="Logo"
                  className="w-16 h-16 object-contain bg-white rounded-lg"
                />
              )}
              <input
                type="text"
                placeholder="URL del logo"
                value={config.apariencia.logo_url}
                onChange={(e) => handleInputChange('apariencia', 'logo_url', e.target.value)}
                className="flex-1 px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
              />
              <button className="px-4 py-2 bg-[#343a4a] text-white rounded-lg hover:bg-[#7c3bed] transition-colors">
                <PhotoIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SeccionPagos = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configuración de Pagos</h3>
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Métodos de Pago Activos
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {['transferencia', 'pago_movil', 'efectivo', 'paypal', 'binance', 'zelle'].map((metodo) => (
                <label key={metodo} className="flex items-center space-x-3 p-3 bg-[#23283a] rounded-lg border border-[#343a4a] hover:border-[#7c3bed] transition-colors">
                  <input
                    type="checkbox"
                    checked={config.pagos.metodos_activos.includes(metodo)}
                    onChange={(e) => handleArrayChange('pagos', 'metodos_activos', metodo, e.target.checked)}
                    className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
                  />
                  <span className="text-white capitalize">{metodo.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Comisión por Transacción (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={config.pagos.comision_porcentaje}
                onChange={(e) => handleInputChange('pagos', 'comision_porcentaje', parseFloat(e.target.value))}
                className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Días para Vencimiento
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={config.pagos.dias_vencimiento}
                onChange={(e) => handleInputChange('pagos', 'dias_vencimiento', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
              />
            </div>
          </div>
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.pagos.notificar_pagos}
                onChange={(e) => handleInputChange('pagos', 'notificar_pagos', e.target.checked)}
                className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
              />
              <span className="text-white">Notificar pagos automáticamente</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const SeccionNotificaciones = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Notificaciones</h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#23283a] rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Notificaciones por Email</h4>
            <div className="space-y-3">
              {[
                { key: 'email_nuevo_ticket', label: 'Nuevo ticket comprado' },
                { key: 'email_pago_confirmado', label: 'Pago confirmado' },
                { key: 'email_solicitud_pago', label: 'Nueva solicitud de pago' }
              ].map((item) => (
                <label key={item.key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={config.notificaciones[item.key]}
                    onChange={(e) => handleInputChange('notificaciones', item.key, e.target.checked)}
                    className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
                  />
                  <span className="text-white">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="bg-[#23283a] rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Otros Canales</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.notificaciones.sms_habilitado}
                  onChange={(e) => handleInputChange('notificaciones', 'sms_habilitado', e.target.checked)}
                  className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
                />
                <span className="text-white">Habilitar notificaciones por SMS</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.notificaciones.telegram_habilitado}
                  onChange={(e) => handleInputChange('notificaciones', 'telegram_habilitado', e.target.checked)}
                  className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
                />
                <span className="text-white">Habilitar notificaciones por Telegram</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SeccionUsuarios = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Configuración de Usuarios</h3>
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-[#23283a] rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Registro de Usuarios</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.usuarios.registro_abierto}
                  onChange={(e) => handleInputChange('usuarios', 'registro_abierto', e.target.checked)}
                  className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
                />
                <span className="text-white">Registro abierto al público</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={config.usuarios.verificar_email}
                  onChange={(e) => handleInputChange('usuarios', 'verificar_email', e.target.checked)}
                  className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
                />
                <span className="text-white">Requerir verificación de email</span>
              </label>
            </div>
          </div>
          <div className="bg-[#23283a] rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">Roles del Sistema</h4>
            <div className="space-y-2">
              {config.usuarios.roles_predeterminados.map((rol, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span className="px-2 py-1 bg-[#7c3bed] text-white text-xs rounded capitalize">
                    {rol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SeccionSeguridad = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Seguridad</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Intentos de Login Permitidos
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.seguridad.intentos_login}
              onChange={(e) => handleInputChange('seguridad', 'intentos_login', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Minutos de Bloqueo
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={config.seguridad.bloqueo_temporal}
              onChange={(e) => handleInputChange('seguridad', 'bloqueo_temporal', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
            />
          </div>
          <div className="md:col-span-2 space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.seguridad.requerir_2fa}
                onChange={(e) => handleInputChange('seguridad', 'requerir_2fa', e.target.checked)}
                className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
              />
              <span className="text-white">Requerir autenticación de dos factores (2FA)</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.seguridad.log_accesos}
                onChange={(e) => handleInputChange('seguridad', 'log_accesos', e.target.checked)}
                className="rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]"
              />
              <span className="text-white">Registrar logs de acceso</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return <SeccionGeneral />;
      case 'apariencia':
        return <SeccionApariencia />;
      case 'pagos':
        return <SeccionPagos />;
      case 'notificaciones':
        return <SeccionNotificaciones />;
      case 'usuarios':
        return <SeccionUsuarios />;
      case 'seguridad':
        return <SeccionSeguridad />;
      default:
        return <SeccionGeneral />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-400">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">
            Configuración
          </h1>
          <p className="text-gray-400">
            Gestiona la configuración de tu plataforma de rifas
          </p>
        </div>
      </div>

      {/* Mensaje de estado */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckIcon className="w-5 h-5 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Menú lateral */}
        <div className="lg:col-span-1">
          <div className="bg-[#181c24] border border-[#23283a] rounded-xl p-4 space-y-2">
            <MenuItem
              id="general"
              icon={Cog6ToothIcon}
              label="General"
              description="Configuración básica"
            />
            <MenuItem
              id="apariencia"
              icon={PhotoIcon}
              label="Apariencia"
              description="Personaliza el look"
            />
            <MenuItem
              id="pagos"
              icon={CreditCardIcon}
              label="Pagos"
              description="Métodos y comisiones"
            />
            <MenuItem
              id="notificaciones"
              icon={BellIcon}
              label="Notificaciones"
              description="Alertas y mensajes"
            />
            <MenuItem
              id="usuarios"
              icon={UserGroupIcon}
              label="Usuarios"
              description="Gestión de usuarios"
            />
            <MenuItem
              id="seguridad"
              icon={ShieldCheckIcon}
              label="Seguridad"
              description="Protección y acceso"
            />
          </div>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3">
          <div className="bg-[#181c24] border border-[#23283a] rounded-xl p-6">
            {renderSection()}
            
            {/* Botones de acción */}
            <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-[#23283a]">
              <button
                onClick={() => cargarConfiguracion()}
                className="px-4 py-2 bg-[#23283a] text-white rounded-lg hover:bg-[#343a4a] transition-colors flex items-center"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Restablecer
              </button>
              <button
                onClick={() => guardarConfiguracion(activeSection)}
                disabled={saving}
                className="px-6 py-2 bg-[#7c3bed] text-white rounded-lg hover:bg-[#6b2dcc] disabled:opacity-50 transition-colors flex items-center"
              >
                {saving ? (
                  <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <InboxIcon className="w-4 h-4 mr-2" />
                )}
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuracion;