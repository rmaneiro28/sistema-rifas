import { useState } from "react";
import { UserIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, HashtagIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";

export function NuevoJugador() {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    favoriteNumbers: []
  });
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleAddNumber = () => {
    const num = parseInt(form.favInput);
    if (!isNaN(num) && num > 0 && num <= 1000 && !form.favoriteNumbers.includes(num)) {
      toast.success(`Número ${num} agregado a favoritos.`);
      setForm({ ...form, favoriteNumbers: [...form.favoriteNumbers, num], favInput: "" });
    } else if (isNaN(num) || num <= 0 || num > 1000) {
      toast.error("Por favor, ingresa un número válido entre 1 y 1000.");
    } else if (form.favoriteNumbers.includes(num)) {
      toast.info(`El número ${num} ya está en tu lista de favoritos.`);
    }
  };

  const handleRemoveNumber = (num) => {
    toast.info(`Número ${num} eliminado de favoritos.`);
    setForm({ ...form, favoriteNumbers: form.favoriteNumbers.filter(n => n !== num) });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { firstName, lastName, cedula, email, phone, street, favoriteNumbers } = form;

    // Validación básica
    if (!firstName || !lastName || !email) {
      toast.error("Nombre, apellido y correo son obligatorios.");
      setLoading(false);
      return;
    }

    // Construir objeto para Supabase
    const playerData = {
      nombre: firstName,
      apellido: lastName,
      cedula: cedula,
      email,
      telefono: phone,
      direccion: street,
      numeros_favoritos: favoriteNumbers,
      // Agrega campos extra según tu tabla
    };

    // Insertar en Supabase
    const { error } = await supabase
      .from("t_jugadores")
      .insert([playerData]);

    if (error) {
      if (error.status === 404) {
        toast.error("No se encontró la tabla");
      }
      toast.error("Error al guardar el jugador: " + error.message);
    } else {
      toast.success("¡Jugador agregado correctamente!");
      setTimeout(() => navigate("/jugadores"), 1200);
    }
    setLoading(false);
  };

  function formatNumber() {
    const phone = form.phone;
    let result = phone.replace(/\D/g, "").replace(/(\d{4})(\d{3})(\d{4})/, "+58-$1-$2-$3");
    return result;
  }
  return (
    <>
      {loading && <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-[#181c24] p-6 rounded-lg flex items-center gap-4">
          <span className="text-white text-lg font-bold">Loading...</span>
          <div className="w-8 h-8 border-[#7c3bed] border-2 rounded-full animate-spin"></div>
        </div>
      </div>
      }

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto py-8">
        {/* Personal Info */}
        <div className="bg-[#181c24] rounded-xl p-6 border border-[#23283a] mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <UserIcon className="w-5 h-5" />Información personal
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white" placeholder="Ingrese el nombre" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Apellido *</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white" placeholder="Ingrese el apellido" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Cédula de Identidad</label>
              <div className="flex items-center bg-[#11141a] border border-[#23283a] rounded-lg">
                <UserIcon className="w-5 h-5 text-gray-400 ml-2" />
                <input name="cedula" value={form.cedula} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="V-12345678" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Correo electrónico *</label>
              <div className="flex items-center bg-[#11141a] border border-[#23283a] rounded-lg">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 ml-2" />
                <input type="email" name="email" value={form.email} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="jugador@ejemplo.com" required />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Número de teléfono</label>
              <div className="flex items-center bg-[#11141a] border border-[#23283a] rounded-lg">
                <PhoneIcon className="w-5 h-5 text-gray-400 ml-2" />
                <input name="phone" value={formatNumber(form.phone)} onChange={handleChange} className="bg-transparent flex-1 p-2 text-white outline-none" placeholder="0123-456-7890" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#181c24] rounded-xl p-6 border border-[#23283a] mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <MapPinIcon className="w-5 h-5" /> Información de dirección
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Dirección</label>
              <input name="street" value={form.street} onChange={handleChange} className="w-full bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white" placeholder="Av. Principal" />
            </div>
          </div>
        </div>

        {/* Números favoritos */}
        <div className="bg-[#181c24] rounded-xl p-6 border border-[#23283a]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <HashtagIcon className="w-5 h-5" /> Números favoritos
          </h2>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={1000}
              value={form.favInput}
              onChange={e => setForm({ ...form, favInput: e.target.value })}
              className="flex-1 bg-[#11141a] border border-[#23283a] rounded-lg p-2 text-white"
              placeholder="Ingrese un número (1-1000)"
            />
            <button type="button" onClick={handleAddNumber} className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-4 py-2 rounded-lg font-bold text-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {form.favoriteNumbers.map(num => (
              <span key={num} className="inline-flex items-center bg-[#23283a] text-white px-2 py-1 rounded-md font-mono text-xs">
                {num}
                <button type="button" onClick={() => handleRemoveNumber(num)} className="ml-1 text-[#d54ff9] hover:text-red-500 font-bold">&times;</button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button type="submit" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold transition" disabled={loading}>
            {loading ? "Guardando..." : "Agregar Jugador"}
          </button>
        </div>
      </form>
    </>
  );
}