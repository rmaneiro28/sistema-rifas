import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import RifaForm from "../components/RifaForm";

export function NuevaRifa() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleAddRifa = async (form, resetForm) => {
    setLoading(true);
    const { error } = await supabase.from("rifas").insert([form]);
    setLoading(false);
    if (!error) {
      resetForm();
      navigate("/rifas"); // Redirige a la lista de rifas tras crear
    } else {
      alert("Error al guardar la rifa");
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-[#d54ff9] text-3xl font-bold mb-6">Crear Nueva Rifa</h1>
      <RifaForm onSubmit={handleAddRifa} loading={loading} />
    </div>
  );
}