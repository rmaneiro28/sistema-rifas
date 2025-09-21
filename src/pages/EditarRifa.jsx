import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeftIcon, PhotoIcon, ExclamationTriangleIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
export function EditarRifa() {
    const { empresaId } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [dragActive, setDragActive] = useState(false);
    
    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        total_tickets: 100,
        precio_ticket: 1,
        fecha_inicio: "",
        fecha_fin: "",
        estado: "activa",
        destacada: false,
        imagen_url: "",
        valor_premio: 0,
        categoria: "",
        premio_principal: "",
        segundo_premio: "",
        tercer_premio: "",
    });

    useEffect(() => {
        const fetchRaffleData = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('t_rifas')
                .select('*')
                .eq("empresa_id", empresaId)
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
                    categoria: data.categoria || '',
                    premio_principal: data.premio_principal || '',
                    segundo_premio: data.segundo_premio || '',
                    tercer_premio: data.tercer_premio || '',
                };
                setFormData(formattedData);
            }
            setLoading(false);
        };

        fetchRaffleData();
    }, [id, navigate]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.nombre.trim()) {
            newErrors.nombre = "El nombre de la rifa es obligatorio";
        } else if (formData.nombre.length < 3) {
            newErrors.nombre = "El nombre debe tener al menos 3 caracteres";
        } else if (formData.nombre.length > 100) {
            newErrors.nombre = "El nombre no puede exceder 100 caracteres";
        }
        
        if (formData.descripcion && formData.descripcion.length > 500) {
            newErrors.descripcion = "La descripción no puede exceder 500 caracteres";
        }
        
        if (!formData.total_tickets || formData.total_tickets < 1) {
            newErrors.total_tickets = "El total de tickets debe ser al menos 1";
        } else if (formData.total_tickets > 10000) {
            newErrors.total_tickets = "El total de tickets no puede exceder 10,000";
        }
        
        if (!formData.precio_ticket || formData.precio_ticket <= 0) {
            newErrors.precio_ticket = "El precio por ticket debe ser mayor a 0";
        } else if (formData.precio_ticket > 10000) {
            newErrors.precio_ticket = "El precio por ticket no puede exceder $10,000";
        }
        
        if (formData.valor_premio < 0) {
            newErrors.valor_premio = "El valor del premio no puede ser negativo";
        }
        
        if (formData.categoria && formData.categoria.length > 50) {
            newErrors.categoria = "La categoría no puede exceder 50 caracteres";
        }
        
        if (formData.premio_principal && formData.premio_principal.length > 100) {
            newErrors.premio_principal = "El premio principal no puede exceder 100 caracteres";
        }
        
        if (formData.segundo_premio && formData.segundo_premio.length > 100) {
            newErrors.segundo_premio = "El segundo premio no puede exceder 100 caracteres";
        }
        
        if (formData.tercer_premio && formData.tercer_premio.length > 100) {
            newErrors.tercer_premio = "El tercer premio no puede exceder 100 caracteres";
        }
        
        if (!formData.fecha_inicio) {
            newErrors.fecha_inicio = "La fecha de inicio es obligatoria";
        }
        
        if (!formData.fecha_fin) {
            newErrors.fecha_fin = "La fecha de fin es obligatoria";
        } else if (formData.fecha_inicio && new Date(formData.fecha_fin) <= new Date(formData.fecha_inicio)) {
            newErrors.fecha_fin = "La fecha de fin debe ser posterior a la fecha de inicio";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
        
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ""
            }));
        }
    };

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
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            handleImageUpload(files[0]);
        }
    };

    const handleImageUpload = (file) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona un archivo de imagen válido');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error('La imagen no puede exceder 5MB');
            return;
        }
        
        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
            setFormData(prev => ({
                ...prev,
                imagen_url: e.target.result
            }));
            toast.success('Imagen cargada correctamente');
        };
        reader.readAsDataURL(file);
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            toast.error('Por favor corrige los errores en el formulario');
            return;
        }
        
        setSubmitting(true);

        try {
            // Exclude id_rifa from the update payload as it's the primary key
            const { id_rifa, ...updateData } = formData;
            
            const { error } = await supabase
                .from("t_rifas")
                .update(updateData)
                .eq("empresa_id", empresaId)
                .eq("id_rifa", id);

            if (error) {
                toast.error("Error al actualizar la rifa: " + error.message);
                console.error(error);
            } else {
                toast.success("Rifa actualizada con éxito");
                navigate(`/detalle-rifa/${id}`);
            }
        } catch (error) {
            toast.error("Error inesperado al guardar los cambios");
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center text-white">Cargando datos de la rifa...</div>;
    }

    // Calculate total revenue
    const totalRevenue = formData.total_tickets && formData.precio_ticket 
        ? (formData.total_tickets * formData.precio_ticket).toFixed(2)
        : '0.00';

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="flex items-center justify-between mb-6">
                <NavLink to={`/detalle-rifa/${id}`} className="flex items-center gap-2 text-[#d54ff9] hover:underline text-sm">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Volver a los detalles
                </NavLink>
            </div>
            
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent mb-2">
                    Editar Rifa
                </h1>
                <p className="text-gray-400">Modifica los detalles de tu rifa. Los campos marcados con * son obligatorios.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Información Básica */}
                <div className="bg-[#181c24] p-6 rounded-xl border border-[#23283a]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#7c3bed]/20 rounded-lg flex items-center justify-center">
                            <span className="text-[#7c3bed] font-semibold text-sm">1</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Información Básica</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-2">
                                Nombre de la Rifa *
                            </label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    name="nombre" 
                                    id="nombre" 
                                    value={formData.nombre} 
                                    onChange={handleChange} 
                                    className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.nombre ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                    placeholder="Ej: Rifa de Navidad 2024"
                                    maxLength={100}
                                    required 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    {formData.nombre.length}/100
                                </div>
                            </div>
                            {errors.nombre && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.nombre}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-300 mb-2">
                                Descripción
                            </label>
                            <div className="relative">
                                <textarea 
                                    name="descripcion" 
                                    id="descripcion" 
                                    value={formData.descripcion} 
                                    onChange={handleChange} 
                                    rows={4}
                                    className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.descripcion ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors resize-none`}
                                    placeholder="Describe los detalles de tu rifa..."
                                    maxLength={500}
                                />
                                <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                                    {formData.descripcion.length}/500
                                </div>
                            </div>
                            {errors.descripcion && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.descripcion}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Configuración de Tickets */}
                <div className="bg-[#181c24] p-6 rounded-xl border border-[#23283a]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#7c3bed]/20 rounded-lg flex items-center justify-center">
                            <span className="text-[#7c3bed] font-semibold text-sm">2</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Configuración de Tickets</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label htmlFor="total_tickets" className="block text-sm font-medium text-gray-300 mb-2">
                                Total de Tickets *
                            </label>
                            <input 
                                type="number" 
                                name="total_tickets" 
                                id="total_tickets" 
                                value={formData.total_tickets} 
                                onChange={handleChange} 
                                className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.total_tickets ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                min="1"
                                max="10000"
                                required 
                            />
                            {errors.total_tickets && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.total_tickets}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="precio_ticket" className="block text-sm font-medium text-gray-300 mb-2">
                                Precio por Ticket ($) *
                            </label>
                            <input 
                                type="number" 
                                step="0.01" 
                                name="precio_ticket" 
                                id="precio_ticket" 
                                value={formData.precio_ticket} 
                                onChange={handleChange} 
                                className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.precio_ticket ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                min="0.01"
                                max="10000"
                                required 
                            />
                            {errors.precio_ticket && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.precio_ticket}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="valor_premio" className="block text-sm font-medium text-gray-300 mb-2">
                                Valor del Premio ($)
                            </label>
                            <input 
                                type="number" 
                                step="0.01" 
                                name="valor_premio" 
                                id="valor_premio" 
                                value={formData.valor_premio} 
                                onChange={handleChange} 
                                className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.valor_premio ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                min="0"
                            />
                            {errors.valor_premio && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.valor_premio}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Revenue Calculator */}
                    <div className="mt-6 p-4 bg-[#0f131b] rounded-lg border border-[#23283a]">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Ingresos Potenciales Totales:</span>
                            <span className="text-2xl font-bold text-green-400">${totalRevenue}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Basado en {formData.total_tickets} tickets × ${formData.precio_ticket}
                        </div>
                    </div>
                </div>

                {/* Fechas y Estado */}
                <div className="bg-[#181c24] p-6 rounded-xl border border-[#23283a]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#7c3bed]/20 rounded-lg flex items-center justify-center">
                            <span className="text-[#7c3bed] font-semibold text-sm">4</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Fechas y Estado</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-300 mb-2">
                                Fecha de Inicio *
                            </label>
                            <input 
                                type="date" 
                                name="fecha_inicio" 
                                id="fecha_inicio" 
                                value={formData.fecha_inicio} 
                                onChange={handleChange} 
                                className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.fecha_inicio ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                required 
                            />
                            {errors.fecha_inicio && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.fecha_inicio}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-300 mb-2">
                                Fecha de Fin (y Sorteo) *
                            </label>
                            <input 
                                type="date" 
                                name="fecha_fin" 
                                id="fecha_fin" 
                                value={formData.fecha_fin} 
                                onChange={handleChange} 
                                className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.fecha_fin ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                required 
                            />
                            {errors.fecha_fin && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.fecha_fin}
                                </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                                El sorteo se realizará automáticamente en esta fecha
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                name="destacada" 
                                id="destacada" 
                                checked={formData.destacada} 
                                onChange={handleChange} 
                                className="h-4 w-4 rounded border-gray-300 text-[#7c3bed] focus:ring-[#7c3bed]" 
                            />
                            <label htmlFor="destacada" className="ml-2 block text-sm text-gray-300">
                                Marcar como destacada
                            </label>
                        </div>
                        
                        <div>
                            <label htmlFor="estado" className="block text-sm font-medium text-gray-300 mb-2">
                                Estado
                            </label>
                            <select 
                                name="estado" 
                                id="estado" 
                                value={formData.estado} 
                                onChange={handleChange} 
                                className="bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors"
                            >
                                <option value="activa">Activa</option>
                                <option value="finalizada">Finalizada</option>
                                <option value="cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Imagen */}
                <div className="bg-[#181c24] p-6 rounded-xl border border-[#23283a]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#7c3bed]/20 rounded-lg flex items-center justify-center">
                            <span className="text-[#7c3bed] font-semibold text-sm">5</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white">Imagen de la Rifa</h2>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <PhotoIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input 
                                type="text" 
                                name="imagen_url" 
                                id="imagen_url" 
                                value={formData.imagen_url} 
                                onChange={handleChange} 
                                className="w-full pl-10 bg-[#23283a] text-white rounded-lg px-4 py-3 border border-[#2d3748] focus:border-[#7c3bed] focus:outline-none transition-colors" 
                                placeholder="https://ejemplo.com/imagen.png" 
                            />
                        </div>
                        
                        <div className="text-center">
                            <span className="text-gray-400 text-sm">o</span>
                        </div>
                        
                        {/* Drag and Drop Area */}
                        <div 
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-[#7c3bed] bg-[#7c3bed]/10' : 'border-[#2d3748] hover:border-[#7c3bed]'}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-300 mb-2">
                                Arrastra y suelta una imagen aquí
                            </p>
                            <p className="text-gray-500 text-sm mb-4">
                                PNG, JPG, GIF hasta 5MB
                            </p>
                            <label className="inline-block bg-[#7c3bed] text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-[#6b2bd1] transition-colors">
                                Seleccionar Archivo
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleFileInput}
                                />
                            </label>
                        </div>
                        
                        {formData.imagen_url && (
                            <div className="mt-6">
                                <p className="text-sm text-gray-400 mb-3">Vista previa:</p>
                                <div className="border border-[#2d3748] rounded-lg overflow-hidden bg-[#1a1d24] max-w-md mx-auto">
                                    <img 
                                        src={formData.imagen_url} 
                                        alt="Vista previa de la imagen" 
                                        className="w-full h-64 object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDEyQzE0LjIwOTEgMTIgMTYgMTAuMjA5MSAxNiA4QzE2IDUuNzkwODYgMTQuMjA5MSA0IDEyIDRDOS43OTA4NiA0IDggNS43OTA4NiA4IDhDOCAxMC4yMDkxIDkuNzkwODYgMTIgMTIgMTJaIiBmaWxsPSIjNjY2NjY2Ii8+CjxwYXRoIGQ9Ik0xMiAxNEM5LjMzIDE0IDcgMTYuMzMgNyAxOVYyMEgxN1YxOUMxNyAxNi4zMyAxNC42NyAxNCAxMiAxNFoiIGZpbGw9IiM2NjY2NjYiLz4KPHN2Zz4K';
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Premios */}
                <div className="bg-[#181c24] p-6 rounded-xl border border-[#23283a]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 bg-[#7c3bed]/20 rounded-lg flex items-center justify-center">
                            <span className="text-[#7c3bed] font-semibold text-sm">3</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white">🏆 Premios</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="categoria" className="block text-sm font-medium text-gray-300 mb-2">
                                Categoría <span className="text-gray-400 text-xs">(opcional)</span>
                            </label>
                            <select
                                name="categoria"
                                id="categoria"
                                value={formData.categoria}
                                onChange={handleChange}
                                className={`w-full bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.categoria ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                            >
                                <option value="">Selecciona una categoría</option>
                                <option value="electronica">Electrónica</option>
                                <option value="hogar">Hogar</option>
                                <option value="vehiculos">Vehículos</option>
                                <option value="viajes">Viajes</option>
                                <option value="dinero">Dinero</option>
                                <option value="otros">Otros</option>
                            </select>
                            {errors.categoria && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.categoria}
                                </div>
                            )}
                        </div>
                        
                        <div>
                            <label htmlFor="valor_premio" className="block text-sm font-medium text-gray-300 mb-2">
                                Valor Total de Premios
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400 sm:text-sm">$</span>
                                </div>
                                <input
                                    type="number"
                                    name="valor_premio"
                                    id="valor_premio"
                                    value={formData.valor_premio}
                                    onChange={handleChange}
                                    min="0"
                                    step="0.01"
                                    className={`w-full pl-8 bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.valor_premio ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                    placeholder="0.00"
                                />
                            </div>
                            {errors.valor_premio && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.valor_premio}
                                </div>
                            )}
                        </div>
                        
                        <div className="md:col-span-2">
                            <label htmlFor="premio_principal" className="block text-sm font-medium text-gray-300 mb-2">
                                Premio Principal <span className="text-yellow-500 text-xs">★</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-yellow-500">🥇</span>
                                </div>
                                <input
                                    type="text"
                                    name="premio_principal"
                                    id="premio_principal"
                                    value={formData.premio_principal}
                                    onChange={handleChange}
                                    maxLength={100}
                                    className={`w-full pl-10 bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.premio_principal ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                    placeholder="Ej: iPhone 15 Pro Max 256GB"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-xs text-gray-400">{formData.premio_principal.length}/100</span>
                                </div>
                            </div>
                            {errors.premio_principal && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.premio_principal}
                                </div>
                            )}
                        </div>
                        
                        <div className="md:col-span-2">
                            <label htmlFor="segundo_premio" className="block text-sm font-medium text-gray-300 mb-2">
                                Segundo Premio <span className="text-gray-400 text-xs">(opcional)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-400">🥈</span>
                                </div>
                                <input
                                    type="text"
                                    name="segundo_premio"
                                    id="segundo_premio"
                                    value={formData.segundo_premio}
                                    onChange={handleChange}
                                    maxLength={100}
                                    className={`w-full pl-10 bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.segundo_premio ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                    placeholder="Ej: Tablet iPad Air"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-xs text-gray-400">{formData.segundo_premio.length}/100</span>
                                </div>
                            </div>
                            {errors.segundo_premio && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.segundo_premio}
                                </div>
                            )}
                        </div>
                        
                        <div className="md:col-span-2">
                            <label htmlFor="tercer_premio" className="block text-sm font-medium text-gray-300 mb-2">
                                Tercer Premio <span className="text-gray-400 text-xs">(opcional)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-orange-400">🥉</span>
                                </div>
                                <input
                                    type="text"
                                    name="tercer_premio"
                                    id="tercer_premio"
                                    value={formData.tercer_premio}
                                    onChange={handleChange}
                                    maxLength={100}
                                    className={`w-full pl-10 bg-[#23283a] text-white rounded-lg px-4 py-3 border ${errors.tercer_premio ? 'border-red-500' : 'border-[#2d3748]'} focus:border-[#7c3bed] focus:outline-none transition-colors`}
                                    placeholder="Ej: Smartwatch Apple Watch"
                                />
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span className="text-xs text-gray-400">{formData.tercer_premio.length}/100</span>
                                </div>
                            </div>
                            {errors.tercer_premio && (
                                <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                                    <ExclamationTriangleIcon className="w-4 h-4" />
                                    {errors.tercer_premio}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                    <button 
                        type="submit" 
                        disabled={submitting} 
                        className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] hover:from-[#6b2bd1] hover:to-[#b03be2] text-white font-semibold py-3 px-8 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Guardando...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="w-5 h-5" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}