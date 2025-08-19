import { useState, useEffect } from "react";

export default function JugadorFormModal({ isOpen, onClose, onSave, initialData }) {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    fecha_nacimiento: "",
    direccion: "",
    ciudad: "",
    estado: "",
    codigo_postal: "",
    pais: "",
    numeros_favoritos: "",
  });

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
        email: "",
        telefono: "",
        fecha_nacimiento: "",
        direccion: "",
        ciudad: "",
        estado: "",
        codigo_postal: "",
        pais: "",
        numeros_favoritos: "",
      });
    }
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      numeros_favoritos: form.numeros_favoritos
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n),
    };
    onSave(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
      <div className="bg-[#181c24] rounded-xl shadow-lg p-8 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-white">
          {initialData ? "Editar Jugador" : "Nuevo Jugador"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="input" required />
            <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="input" required />
          </div>
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="input" required type="email" />
          <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="input" />
          <input name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} placeholder="Fecha de nacimiento" className="input" type="date" />
          <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" className="input" />
          <div className="flex gap-2">
            <input name="ciudad" value={form.ciudad} onChange={handleChange} placeholder="Ciudad" className="input" />
            <input name="estado" value={form.estado} onChange={handleChange} placeholder="Estado" className="input" />
          </div>
          <div className="flex gap-2">
            <input name="codigo_postal" value={form.codigo_postal} onChange={handleChange} placeholder="Código Postal" className="input" />
            <input name="pais" value={form.pais} onChange={handleChange} placeholder="País" className="input" />
          </div>
          <input name="numeros_favoritos" value={form.numeros_favoritos} onChange={handleChange} placeholder="Números favoritos (separados por coma)" className="input" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg">Cancelar</button>
            <button type="submit" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-semibold">
              {initialData ? "Guardar cambios" : "Crear"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .input {
          background: #23283a;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #2d3140;
          width: 100%;
          outline: none;
        }
        .input:focus {
          border-color: #7c3bed;
        }
      `}</style>
    </div>
  );
}