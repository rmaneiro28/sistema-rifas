import { useState, useEffect } from "react";
import { XMarkIcon, UserIcon, EnvelopeIcon, PhoneIcon, IdentificationIcon, MapPinIcon, StarIcon } from "@heroicons/react/24/outline";

export default function JugadorFormModal({ isOpen, onClose, onSave, initialData }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    cedula: "",
    email: "",
    telefono: "",
    direccion: "",
    numeros_favoritos: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        numeros_favoritos: Array.isArray(initialData.numeros_favoritos)
          ? initialData.numeros_favoritos.join(",")
          : initialData.numeros_favoritos || "",
      });
    } else {
      setForm({
        nombre: "",
        apellido: "",
        cedula: "",
        email: "",
        telefono: "",
        direccion: "",
        numeros_favoritos: "",
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = {
      ...form,
      numeros_favoritos: form.numeros_favoritos
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n),
    };
    await onSave(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-[#181c24] border border-[#23283a] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#23283a] sticky top-0 bg-[#181c24] z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-[#7c3bed]" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {initialData ? "Editar Jugador" : "Nuevo Jugador"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a] disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid max-md:grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                  Información Personal
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Nombre *</label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="nombre"
                        value={form.nombre}
                        onChange={handleChange}
                        placeholder="Ingresa el nombre"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Apellido *</label>
                    <div className="relative">
                      <UserIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="apellido"
                        value={form.apellido}
                        onChange={handleChange}
                        placeholder="Ingresa el apellido"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Cédula *</label>
                    <div className="relative">
                      <IdentificationIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="cedula"
                        value={form.cedula}
                        onChange={handleChange}
                        placeholder="12.345.678"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <EnvelopeIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                  Información de Contacto
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Email *</label>
                    <div className="relative">
                      <EnvelopeIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="ejemplo@correo.com"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Teléfono</label>
                    <div className="relative">
                      <PhoneIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="telefono"
                        value={form.telefono}
                        onChange={handleChange}
                        placeholder="+58 414-1234567"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Additional Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <MapPinIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                  Información Adicional
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Dirección</label>
                    <div className="relative">
                      <MapPinIcon className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                      <textarea
                        name="direccion"
                        value={form.direccion}
                        onChange={handleChange}
                        placeholder="Ingresa la dirección completa"
                        rows={4}
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors resize-none"
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Números Favoritos</label>
                    <div className="relative">
                      <StarIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        name="numeros_favoritos"
                        value={form.numeros_favoritos}
                        onChange={handleChange}
                        placeholder="1, 7, 13, 21 (separados por coma)"
                        className="w-full pl-10 pr-4 py-3 bg-[#23283a] border border-[#2d3748] rounded-lg text-white focus:outline-none focus:border-[#7c3bed] transition-colors"
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-gray-400">
                      Ingresa los números favoritos separados por comas. Ejemplo: 1, 7, 13, 21
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-[#23283a] rounded-lg p-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <UserIcon className="w-4 h-4 mr-2 text-[#7c3bed]" />
                  Vista Previa
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#7c3bed]/20 rounded-full flex items-center justify-center">
                      <span className="text-[#7c3bed] font-bold text-xs">
                        {form.nombre?.charAt(0) || '?'}{form.apellido?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {form.nombre || 'Nombre'} {form.apellido || 'Apellido'}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {form.email || 'email@ejemplo.com'}
                      </p>
                    </div>
                  </div>
                  {form.telefono && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <PhoneIcon className="w-4 h-4" />
                      <span>{form.telefono}</span>
                    </div>
                  )}
                  {form.cedula && (
                    <div className="flex items-center space-x-2 text-gray-300">
                      <IdentificationIcon className="w-4 h-4" />
                      <span>C.I: {form.cedula}</span>
                    </div>
                  )}
                  {form.numeros_favoritos && (
                    <div className="flex items-start space-x-2 text-gray-300">
                      <StarIcon className="w-4 h-4 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Números favoritos:</p>
                        <div className="flex flex-wrap gap-1">
                          {form.numeros_favoritos.split(',').map((num, index) => {
                            const trimmed = num.trim();
                            return trimmed ? (
                              <span key={index} className="bg-[#7c3bed] text-white px-2 py-1 rounded text-xs font-mono">
                                {trimmed}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="col-span-1 lg:col-span-2">
            <div className="flex space-x-4 pt-6 border-t border-[#23283a] mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 bg-[#23283a] hover:bg-[#2d3748] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>{initialData ? "Guardando..." : "Creando..."}</span>
                  </>
                ) : (
                  <span>{initialData ? "Guardar Cambios" : "Crear Jugador"}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}