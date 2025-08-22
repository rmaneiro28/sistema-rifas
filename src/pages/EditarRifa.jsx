import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftIcon, PhotoIcon } from "@heroicons/react/24/outline";

export function EditarRifa() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        total_tickets: 100,
        precio_ticket: 1,
        fecha_inicio: "",
        fecha_fin: "",
        fecha_sorteo: "",
        estado: "activa",
        destacada: false,
        imagen_url: "",
        valor_premio: 0,
    });

    useEffect(() => {
        const fetchRaffleData = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('t_rifas')
                .select('*')
                .eq('id_rifa', id)
                .single();

            if (error) {
                toast.error('Error al cargar los datos de la rifa.');
                console.error(error);
                navigate('/rifas');
            } else if (data) {
                // Format dates for input fields
                const formattedData = {
                    ...data,
                    fecha_inicio: data.fecha_inicio ? new Date(data.fecha_inicio).toISOString().split('T')[0] : '',
                    fecha_fin: data.fecha_fin ? new Date(data.fecha_fin).toISOString().split('T')[0] : '',
                    fecha_sorteo: data.fecha_sorteo ? new Date(data.fecha_sorteo).toISOString().slice(0, 16) : '',
                };
                setFormData(formattedData);
            }
            setLoading(false);
        };

        fetchRaffleData();
    }, [id, navigate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Exclude id_rifa from the update payload as it's the primary key
        const { id_rifa, ...updateData } = formData;

        const { error } = await supabase
            .from("t_rifas")
            .update(updateData)
            .eq("id_rifa", id);

        if (error) {
            toast.error("Error al actualizar la rifa: " + error.message);
            console.error(error);
        } else {
            toast.success("Rifa actualizada con éxito");
            navigate(`/detalle-rifa/${id}`);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="text-center text-white">Cargando datos de la rifa...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <NavLink to={`/detalle-rifa/${id}`} className="flex items-center gap-2 text-[#d54ff9] hover:underline text-sm">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Volver a los detalles
                </NavLink>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent mb-2">
                Editar Rifa
            </h1>
            <p className="text-gray-400 mb-8">Modifica los detalles de tu rifa.</p>

            <form onSubmit={handleSubmit} className="space-y-6 bg-[#181c24] p-8 rounded-xl border border-[#23283a]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Columna Izquierda */}
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-2">Nombre de la Rifa</label>
                            <input type="text" name="nombre" id="nombre" value={formData.nombre} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" required />
                        </div>
                        <div>
                            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
                            <textarea name="descripcion" id="descripcion" value={formData.descripcion} onChange={handleChange} rows="4" className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none"></textarea>
                        </div>
                        <div>
                            <label htmlFor="imagen_url" className="block text-sm font-medium text-gray-300 mb-2">URL de la Imagen</label>
                            <div className="relative">
                                <PhotoIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input type="text" name="imagen_url" id="imagen_url" value={formData.imagen_url} onChange={handleChange} className="w-full pl-10 bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" placeholder="https://ejemplo.com/imagen.png" />
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="total_tickets" className="block text-sm font-medium text-gray-300 mb-2">Total de Tickets</label>
                                <input type="number" name="total_tickets" id="total_tickets" value={formData.total_tickets} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" />
                            </div>
                            <div>
                                <label htmlFor="precio_ticket" className="block text-sm font-medium text-gray-300 mb-2">Precio por Ticket ($)</label>
                                <input type="number" step="0.01" name="precio_ticket" id="precio_ticket" value={formData.precio_ticket} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="valor_premio" className="block text-sm font-medium text-gray-300 mb-2">Valor del Premio ($)</label>
                            <input type="number" step="0.01" name="valor_premio" id="valor_premio" value={formData.valor_premio} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-300 mb-2">Fecha de Inicio</label>
                                <input type="date" name="fecha_inicio" id="fecha_inicio" value={formData.fecha_inicio} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" />
                            </div>
                            <div>
                                <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-300 mb-2">Fecha de Fin</label>
                                <input type="date" name="fecha_fin" id="fecha_fin" value={formData.fecha_fin} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="fecha_sorteo" className="block text-sm font-medium text-gray-300 mb-2">Fecha y Hora del Sorteo</label>
                            <input type="datetime-local" name="fecha_sorteo" id="fecha_sorteo" value={formData.fecha_sorteo} onChange={handleChange} className="w-full bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input type="checkbox" name="destacada" id="destacada" checked={formData.destacada} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]" />
                                <label htmlFor="destacada" className="ml-2 block text-sm text-gray-300">Marcar como destacada</label>
                            </div>
                            <div>
                                <label htmlFor="estado" className="block text-sm font-medium text-gray-300 mb-2">Estado</label>
                                <select name="estado" id="estado" value={formData.estado} onChange={handleChange} className="bg-[#23283a] text-white rounded-lg px-4 py-2 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none">
                                    <option value="activa">Activa</option>
                                    <option value="finalizada">Finalizada</option>
                                    <option value="cancelada">Cancelada</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-[#23283a] flex justify-end">
                    <button type="submit" disabled={loading} className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] hover:from-[#6b2bd1] hover:to-[#b03be2] text-white font-semibold py-3 px-8 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}