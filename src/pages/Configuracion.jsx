import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';

export default function Configuracion() {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [nombreEmpresa, setNombreEmpresa] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefono, setTelefono] = useState('');

    useEffect(() => {
        const fetchConfig = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: usuario, error: userError } = await supabase
                    .from('t_usuarios')
                    .select('configuracion_id')
                    .eq('id', user.id)
                    .single();

                if (userError) {
                    console.error('Error fetching user config id:', userError);
                    setLoading(false);
                    return;
                }

                if (usuario) {
                    const { data: configData, error: configError } = await supabase
                        .from('t_configuraciones')
                        .select('*')
                        .eq('id', usuario.configuracion_id)
                        .single();

                    if (configError) {
                        console.error('Error fetching configuration:', configError);
                    } else {
                        setConfig(configData);
                        setNombreEmpresa(configData.nombre_empresa || '');
                        setLogoUrl(configData.logo_url || '');
                        setDireccion(configData.direccion || '');
                        setTelefono(configData.telefono || '');
                    }
                }
            }
            setLoading(false);
        };

        fetchConfig();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        const { error } = await supabase
            .from('t_configuraciones')
            .update({
                nombre_empresa: nombreEmpresa,
                logo_url: logoUrl,
                direccion: direccion,
                telefono: telefono,
            })
            .eq('id', config.id);

        if (error) {
            alert('Error updating configuration: ' + error.message);
        } else {
            alert('Configuration updated successfully!');
        }
        setLoading(false);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent mb-6">
                Configuración de la Empresa
            </h1>
            <form onSubmit={handleSave} className="bg-[#181c24] p-6 rounded-xl border border-[#23283a]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-white text-sm mb-1">Nombre de la Empresa</label>
                        <input
                            type="text"
                            className="w-full rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
                            value={nombreEmpresa}
                            onChange={(e) => setNombreEmpresa(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-white text-sm mb-1">URL del Logo</label>
                        <input
                            type="text"
                            className="w-full rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
                            value={logoUrl}
                            onChange={(e) => setLogoUrl(e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-white text-sm mb-1">Dirección</label>
                        <textarea
                            className="w-full rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
                            rows="3"
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-white text-sm mb-1">Teléfono</label>
                        <input
                            type="text"
                            className="w-full rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
                            value={telefono}
                            onChange={(e) => setTelefono(e.target.value)}
                        />
                    </div>
                </div>
                <div className="mt-6">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}
