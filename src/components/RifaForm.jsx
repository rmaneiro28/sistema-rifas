import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

const RifaForm = ({ onSubmit, loading, initialData = null, isEditing = false }) => {
    const { empresaId } = useAuth();
    const [form, setForm] = useState({
        nombre: "",
        descripcion: "",
        precio_ticket: "",
        total_tickets: "",
        fecha_inicio: "",
        fecha_fin: "",
        estado: "activa",
        imagen_url: "",
        premio_principal: "",
        segundo_premio: "",
        tercer_premio: "",
        cuarto_premio: "",
        categoria: "",
        reglas: ""
    });

    const [errors, setErrors] = useState({});
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const baseInputClass = "w-full px-4 py-3 rounded-lg bg-[#23283a] border text-white focus:outline-none focus:border-[#7c3bed] transition";
    const normalBorderClass = "border-[#3a3f4a]";
    const errorBorderClass = "border-red-500";

    useEffect(() => {
        if (initialData) {
            setForm(initialData);
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!form.nombre.trim()) {
            newErrors.nombre = "El nombre es obligatorio";
        }

        if (!form.precio_ticket || form.precio_ticket <= 0) {
            newErrors.precio_ticket = "El precio debe ser mayor a 0";
        }

        if (!form.total_tickets || form.total_tickets <= 0) {
            newErrors.total_tickets = "El total de tickets debe ser mayor a 0";
        }

        if (!form.fecha_inicio) {
            newErrors.fecha_inicio = "La fecha de inicio es obligatoria";
        }

        if (!form.fecha_fin) {
            newErrors.fecha_fin = "La fecha de fin es obligatoria";
        }

        if (form.fecha_inicio && form.fecha_fin && new Date(form.fecha_inicio) >= new Date(form.fecha_fin)) {
            newErrors.fecha_fin = "La fecha de fin debe ser posterior a la fecha de inicio";
        }

        if (!form.premio_principal.trim()) {
            newErrors.premio_principal = "El premio principal es obligatorio";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error("Por favor, corrige los errores en el formulario");
            return;
        }

        const formData = {
            ...form,
            precio_ticket: parseFloat(form.precio_ticket),
            total_tickets: parseInt(form.total_tickets),
            empresa_id: empresaId
        };

        try {
            await onSubmit(formData, () => {
                if (!isEditing) {
                    setForm({
                        nombre: "",
                        descripcion: "",
                        precio_ticket: "",
                        total_tickets: "",
                        fecha_inicio: "",
                        fecha_fin: "",
                        estado: "activa",
                        imagen_url: "",
                        premio_principal: "",
                        segundo_premio: "",
                        tercer_premio: "",
                        cuarto_premio: "",
                        categoria: "",
                        reglas: ""
                    });
                }
            });
        } catch (error) {
            console.error("Error submitting form:", error);
        }
    };

    const handleImageUpload = async (file) => {
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("La imagen debe ser menor a 5MB");
            return;
        }

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `rifas/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('raffle-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('raffle-images')
                .getPublicUrl(filePath);

            setForm(prev => ({ ...prev, imagen_url: publicUrl }));
            toast.success("Imagen subida exitosamente");
        } catch (error) {
            console.error("Error uploading image:", error);
            toast.error("Error al subir la imagen");
        } finally {
            setUploading(false);
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragIn = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setDragActive(true);
        }
    };

    const handleDragOut = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                handleImageUpload(file);
            } else {
                toast.error("Por favor, selecciona solo archivos de imagen");
            }
        }
    };

    const resetForm = () => {
        setForm({
            nombre: "",
            descripcion: "",
            precio_ticket: "",
            total_tickets: "",
            fecha_inicio: "",
            fecha_fin: "",
            estado: "activa",
            imagen_url: "",
            premio_principal: "",
            segundo_premio: "",
            tercer_premio: "",
            cuarto_premio: "",
            categoria: "",
            reglas: ""
        });
        setErrors({});
    };

    return (
        <div className="bg-[#181c24] border border-[#23283a] rounded-xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Información básica */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nombre de la Rifa *
                        </label>
                        <input
                            type="text"
                            name="nombre"
                            value={form.nombre}
                            onChange={handleChange} className={`${baseInputClass} ${errors.nombre ? errorBorderClass : normalBorderClass}`}
                            placeholder="Ej: Toyota Machito 2024"
                        />
                        {errors.nombre && (
                            <p className="text-red-400 text-sm mt-1">{errors.nombre}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Categoría
                        </label>
                        <select
                            name="categoria"
                            value={form.categoria}
                            onChange={handleChange}
                            className={`${baseInputClass} ${normalBorderClass}`}
                        >
                            <option value="">Seleccionar categoría</option>
                            <option value="vehiculos">Vehículos</option>
                            <option value="electronica">Electrónica</option>
                            <option value="hogar">Hogar</option>
                            <option value="deportes">Deportes</option>
                            <option value="otros">Otros</option>
                        </select>
                    </div>
                </div>

                {/* Descripción */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Descripción
                    </label>
                    <textarea
                        name="descripcion"
                        value={form.descripcion}
                        onChange={handleChange}
                        rows="3" className={`${baseInputClass} ${normalBorderClass}`}
                        placeholder="Describe los detalles de la rifa..."
                    />
                </div>

                {/* Precio y tickets */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Precio por Ticket *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                                type="number"
                                name="precio_ticket"
                                value={form.precio_ticket}
                                onChange={handleChange}
                                min="0"
                                step="0.01" className={`pl-8 pr-4 ${baseInputClass} ${errors.precio_ticket ? errorBorderClass : normalBorderClass}`}
                                placeholder="0.00"
                            />
                        </div>
                        {errors.precio_ticket && (
                            <p className="text-red-400 text-sm mt-1">{errors.precio_ticket}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Total de Tickets *
                        </label>
                        <input
                            type="number"
                            name="total_tickets"
                            value={form.total_tickets}
                            onChange={handleChange}
                            min="1"
                            className={`${baseInputClass} ${errors.total_tickets ? errorBorderClass : normalBorderClass}`}
                            placeholder="100"
                        />
                        {errors.total_tickets && (
                            <p className="text-red-400 text-sm mt-1">{errors.total_tickets}</p>
                        )}
                    </div>
                </div>

                {/* Fechas */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Fecha de Inicio *
                        </label>
                        <input
                            type="datetime-local"
                            name="fecha_inicio"
                            value={form.fecha_inicio}
                            onChange={handleChange}
                            className={`${baseInputClass} ${errors.fecha_inicio ? errorBorderClass : normalBorderClass}`}
                        />
                        {errors.fecha_inicio && (
                            <p className="text-red-400 text-sm mt-1">{errors.fecha_inicio}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Fecha de Fin *
                        </label>
                        <input
                            type="datetime-local"
                            name="fecha_fin"
                            value={form.fecha_fin}
                            onChange={handleChange}
                            className={`${baseInputClass} ${errors.fecha_fin ? errorBorderClass : normalBorderClass}`}
                        />
                        {errors.fecha_fin && (
                            <p className="text-red-400 text-sm mt-1">{errors.fecha_fin}</p>
                        )}
                    </div>
                </div>

                {/* Premios */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Premio Principal *
                        </label>
                        <input
                            type="text"
                            name="premio_principal"
                            value={form.premio_principal}
                            onChange={handleChange}
                            className={`${baseInputClass} ${errors.premio_principal ? errorBorderClass : normalBorderClass}`}
                            placeholder="Ej: Toyota Machito 2024"
                        />
                        {errors.premio_principal && (
                            <p className="text-red-400 text-sm mt-1">{errors.premio_principal}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            2do Premio (Opcional)
                        </label>
                        <input
                            type="text"
                            name="segundo_premio"
                            value={form.segundo_premio}
                            onChange={handleChange}
                            className={`${baseInputClass} ${normalBorderClass}`}
                            placeholder="Ej: $5,000 en efectivo"
                        />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            3er Premio (Opcional)
                        </label>
                        <input
                            type="text"
                            name="tercer_premio"
                            value={form.tercer_premio}
                            onChange={handleChange}
                            className={`${baseInputClass} ${normalBorderClass}`}
                            placeholder="Ej: $2,000 en efectivo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            4to Premio (Opcional)
                        </label>
                        <input
                            type="text"
                            name="cuarto_premio"
                            value={form.cuarto_premio}
                            onChange={handleChange}
                            className={`${baseInputClass} ${normalBorderClass}`}
                            placeholder="Ej: $1,000 en efectivo"
                        />
                    </div>
                </div>

                {/* Estado fijo */}
                <div className="bg-[#23283a] border border-[#3a3f4a] rounded-lg px-4 py-3">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Estado de la Rifa
                    </label>
                    <p className="text-[#7c3bed] font-medium">Activa</p>
                </div>

                {/* Imagen */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Imagen de la Rifa
                    </label>

                    {/* Área de Drag & Drop */}
                    <div
                        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                            ? 'border-[#7c3bed] bg-[#7c3bed]/10'
                            : 'border-[#3a3f4a] hover:border-[#7c3bed] hover:bg-[#7c3bed]/5'
                            }`}
                        onDragEnter={handleDragIn}
                        onDragLeave={handleDragOut}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <div className="flex flex-col items-center space-y-4">
                            {/* Icono de imagen */}
                            <div className="w-16 h-16 rounded-full bg-[#23283a] flex items-center justify-center">
                                <svg className="w-8 h-8 text-[#7c3bed]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>

                            {/* Texto informativo */}
                            <div>
                                <p className="text-lg font-medium text-white mb-2">
                                    {dragActive ? 'Suelta la imagen aquí' : 'Arrastra y suelta tu imagen'}
                                </p>
                                <p className="text-gray-400 text-sm mb-4">
                                    O haz clic para seleccionar un archivo
                                </p>

                                {/* Botón de selección manual */}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileInput}
                                    className="hidden"
                                    id="image-upload"
                                />
                                <label
                                    htmlFor="image-upload"
                                    className="inline-flex items-center px-4 py-2 rounded-lg bg-[#7c3bed] hover:bg-[#d54ff9] text-white cursor-pointer transition-colors"
                                >
                                    {uploading ? "Subiendo..." : "Seleccionar Imagen"}
                                </label>
                            </div>

                            {/* Información de formato */}
                            <p className="text-xs text-gray-500">
                                PNG, JPG, GIF hasta 5MB
                            </p>
                        </div>
                    </div>

                    {/* Preview de imagen */}
                    {form.imagen_url && (
                        <div className="mt-4 p-4 bg-[#23283a] rounded-lg border border-[#3a3f4a]">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-300">Imagen seleccionada:</span>
                                <button
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, imagen_url: "" }))}
                                    className="text-red-400 hover:text-red-300 text-sm hover:underline"
                                >
                                    Eliminar
                                </button>
                            </div>
                            <div className="flex items-center space-x-4">
                                <img
                                    src={form.imagen_url}
                                    alt="Preview"
                                    className="w-20 h-20 object-cover rounded-lg border border-[#3a3f4a]"
                                />
                                <div className="flex-1">
                                    <p className="text-sm text-gray-400">
                                        Imagen cargada exitosamente
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reglas */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Reglas y Condiciones
                    </label>
                    <textarea
                        name="reglas"
                        value={form.reglas}
                        onChange={handleChange}
                        rows="4"
                        className={`${baseInputClass} ${normalBorderClass}`}
                        placeholder="Establece las reglas y condiciones de la rifa..."
                    />
                </div>

                {/* Botones */}
                <div className="flex justify-end space-x-4 pt-6">
                    <button
                        type="button"
                        onClick={resetForm}
                        className="px-6 py-3 rounded-lg bg-[#23283a] border border-[#3a3f4a] text-white hover:bg-[#2d3748] transition"
                    >
                        Limpiar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-3 rounded-lg bg-[#7c3bed] hover:bg-[#d54ff9] text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? "Guardando..." : isEditing ? "Actualizar Rifa" : "Crear Rifa"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RifaForm;
