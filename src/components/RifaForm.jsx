import { useState } from "react";
import { PlusIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

export default function RifaForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    fecha_inicio: "",
    fecha_cierre: "",
    total_tickets: "",
    precio_ticket: "",
    estado: "activa",
  });
  const [errors, setErrors] = useState({});

  // Validación simple
  const validate = () => {
    const newErrors = {};
    if (!form.nombre) newErrors.nombre = "El nombre es obligatorio";
    if (!form.fecha_inicio) newErrors.fecha_inicio = "La fecha de inicio es obligatoria";
    if (!form.fecha_cierre) newErrors.fecha_cierre = "La fecha de cierre es obligatoria";
    if (!form.total_tickets || form.total_tickets <= 0) newErrors.total_tickets = "Debe ser mayor a 0";
    if (!form.precio_ticket || form.precio_ticket <= 0) newErrors.precio_ticket = "Debe ser mayor a 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(form, () => {
      setForm({
        nombre: "",
        descripcion: "",
        fecha_inicio: "",
        fecha_cierre: "",
        total_tickets: "",
        precio_ticket: "",
        estado: "activa",
      });
      setErrors({});
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 p-6 rounded-xl border border-[#23283a] bg-[#181c24] flex flex-col gap-4 flex-wrap"
    >
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-sm text-white mb-1 flex items-center gap-1">
            Nombre <span className="text-pink-400">*</span>
          </label>
          <input
            type="text"
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Rifa MacBook Pro"
            className={`rounded-lg bg-[#23283a] border-none px-4 py-2 text-white ${errors.nombre ? "border border-red-400" : ""}`}
            required
          />
          {errors.nombre && <span className="text-xs text-red-400">{errors.nombre}</span>}
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-sm text-white mb-1">Descripción</label>
          <textarea
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Describe el premio o reglas..."
            className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white min-h-[42px]"
            rows={2}
          />
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col w-40">
          <label className="text-sm text-white mb-1 flex items-center gap-1">
            Fecha inicio <span className="text-pink-400">*</span>
          </label>
          <input
            type="datetime-local"
            name="fecha_inicio"
            value={form.fecha_inicio}
            onChange={handleChange}
            className={`rounded-lg bg-[#23283a] border-none px-4 py-2 text-white ${errors.fecha_inicio ? "border border-red-400" : ""}`}
            required
          />
          {errors.fecha_inicio && <span className="text-xs text-red-400">{errors.fecha_inicio}</span>}
        </div>
        <div className="flex flex-col w-40">
          <label className="text-sm text-white mb-1 flex items-center gap-1">
            Fecha cierre <span className="text-pink-400">*</span>
          </label>
          <input
            type="datetime-local"
            name="fecha_cierre"
            value={form.fecha_cierre}
            onChange={handleChange}
            className={`rounded-lg bg-[#23283a] border-none px-4 py-2 text-white ${errors.fecha_cierre ? "border border-red-400" : ""}`}
            required
          />
          {errors.fecha_cierre && <span className="text-xs text-red-400">{errors.fecha_cierre}</span>}
        </div>
        <div className="flex flex-col w-32">
          <label className="text-sm text-white mb-1 flex items-center gap-1">
            Total Tickets <span className="text-pink-400">*</span>
            <InformationCircleIcon title="Cantidad máxima de boletos" className="w-4 h-4 text-gray-400" />
          </label>
          <input
            type="number"
            name="total_tickets"
            min={1}
            value={form.total_tickets}
            onChange={handleChange}
            placeholder="Ej: 100"
            className={`rounded-lg bg-[#23283a] border-none px-4 py-2 text-white ${errors.total_tickets ? "border border-red-400" : ""}`}
            required
          />
          {errors.total_tickets && <span className="text-xs text-red-400">{errors.total_tickets}</span>}
        </div>
        <div className="flex flex-col w-32">
          <label className="text-sm text-white mb-1 flex items-center gap-1">
            Precio Ticket <span className="text-pink-400">*</span>
            <InformationCircleIcon title="Precio por boleto" className="w-4 h-4 text-gray-400" />
          </label>
          <input
            type="number"
            step="0.01"
            min={1}
            name="precio_ticket"
            value={form.precio_ticket}
            onChange={handleChange}
            placeholder="Ej: 5.00"
            className={`rounded-lg bg-[#23283a] border-none px-4 py-2 text-white ${errors.precio_ticket ? "border border-red-400" : ""}`}
            required
          />
          {errors.precio_ticket && <span className="text-xs text-red-400">{errors.precio_ticket}</span>}
        </div>
        <div className="flex flex-col w-32">
          <label className="text-sm text-white mb-1">Estado</label>
          <select
            name="estado"
            value={form.estado}
            onChange={handleChange}
            className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
          >
            <option value="activa">Activa</option>
            <option value="finalizada">Finalizada</option>
            <option value="pausada">Pausada</option>
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold transition mt-2"
      >
        <PlusIcon className="w-5 h-5" />
        {loading ? "Guardando..." : "Crear Rifa"}
      </button>
    </form>
  );
}