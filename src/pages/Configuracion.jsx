import { useState, useEffect } from "react";
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
  BuildingOffice2Icon
} from "@heroicons/react/24/outline";
import { supabase } from "../api/supabaseClient";
import { InboxIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";

// Helper function to calculate file hash
const getFileHash = async (file) => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

function Configuracion() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const { empresaId } = useAuth();

  // State for company data
  const [empresa, setEmpresa] = useState({ nombre_empresa: '', direccion_empresa: '', logo_url: '', logo_hash: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (empresaId) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('t_empresas')
            .select('*')
            .eq('id_empresa', empresaId)
            .single();
          
          if (error) throw error;
          
          if (data) {
            setEmpresa(data);
            if (data.logo_url) {
              setLogoPreview(data.logo_url);
            }
          }
        } catch (error) {
          console.error('Error cargando datos de la empresa:', error);
          setMessage({ type: 'error', text: 'Error al cargar los datos de la empresa' });
        }
        setLoading(false);
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  const handleEmpresaInputChange = (campo, valor) => {
    setEmpresa(prev => ({ ...prev, [campo]: valor }));
  };

  const handleFileSelect = (file) => {
    if (file) {
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const guardarEmpresa = async () => {
    if (!empresaId) return;

    setSaving(true);
    let logoUrlToSave = empresa.logo_url;
    let logoHashToSave = empresa.logo_hash;

    try {
      if (logoFile) {
        const newHash = await getFileHash(logoFile);

        // Check if image with same hash already exists
        const { data: existingImages, error: hashError } = await supabase
          .from('t_empresas')
          .select('logo_url, logo_hash')
          .eq('logo_hash', newHash)
          .limit(1);

        if (hashError) {
            // If the column logo_hash does not exist, this query will fail.
            // We can ignore the error and proceed to upload.
            console.warn("Could not check for existing logo hash. This might be because the 'logo_hash' column does not exist yet.", hashError);
        }


        if (existingImages && existingImages.length > 0) {
          logoUrlToSave = existingImages[0].logo_url;
          logoHashToSave = existingImages[0].logo_hash;
        } else {
          // If not, upload the new file
          const fileExt = logoFile.name.split('.').pop();
          const fileName = `${newHash}.${fileExt}`;
          const filePath = `usuario/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('raffle-images')
            .upload(filePath, logoFile, {
              cacheControl: '3600',
              upsert: true, // Set to true to avoid "resource already exists" error
            });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage
            .from('raffle-images')
            .getPublicUrl(filePath);
          
          logoUrlToSave = urlData.publicUrl;
          logoHashToSave = newHash;
        }
      }

      const { error: updateError } = await supabase
        .from('t_empresas')
        .update({
          nombre_empresa: empresa.nombre_empresa,
          direccion_empresa: empresa.direccion_empresa,
          logo_url: logoUrlToSave,
          logo_hash: logoHashToSave,
        })
        .eq('id_empresa', empresaId);

      if (updateError) throw updateError;

      setEmpresa(prev => ({ ...prev, logo_url: logoUrlToSave, logo_hash: logoHashToSave }));
      setMessage({ type: 'success', text: 'Datos de la empresa guardados correctamente' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (error) {
      console.error('Error guardando datos de la empresa:', error);
      setMessage({ type: 'error', text: 'Error al guardar los datos de la empresa: ' + error.message });
    }
    setSaving(false);
  };

  const SeccionEmpresa = () => {
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
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    };

    const handleChange = (e) => {
      e.preventDefault();
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    };

    return (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Datos de la Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={empresa.nombre_empresa || ''}
                  onChange={(e) => handleEmpresaInputChange('nombre_empresa', e.target.value)}
                  className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dirección
                </label>
                <textarea
                  value={empresa.direccion_empresa || ''}
                  onChange={(e) => handleEmpresaInputChange('direccion_empresa', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 bg-[#23283a] border border-[#343a4a] rounded-lg text-white focus:outline-none focus:border-[#7c3bed]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Logo de la Empresa
                </label>
                <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors relative ${dragActive ? 'border-[#7c3bed] bg-[#23283a]' : 'border-[#343a4a]'}`}>
                    <input type="file" id="logo-upload" accept="image/*" className="hidden" onChange={handleChange} />
                    <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center justify-center">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Preview" className="mx-auto h-24 object-contain rounded-lg" />
                        ) : (
                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                        )}
                        <p className="mt-2 text-sm text-gray-400">
                            Arrastra y suelta una imagen, o haz clic para seleccionar.
                        </p>
                        {logoFile && <p className="text-xs text-gray-400 mt-2">Archivo: {logoFile.name}</p>}
                    </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
        <span className="ml-2 text-gray-400">Cargando...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">
            Configuración de la Empresa
          </h1>
          <p className="text-gray-400">
            Gestiona los datos de tu empresa
          </p>
        </div>
      </div>

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

      <div className="bg-[#181c24] border border-[#23283a] rounded-xl p-6">
        <SeccionEmpresa />
        
        <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-[#23283a]">
          <button
            onClick={guardarEmpresa}
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
  );
}

export default Configuracion;