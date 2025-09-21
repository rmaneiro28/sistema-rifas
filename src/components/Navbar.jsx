import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { Bars3BottomLeftIcon } from "@heroicons/react/16/solid";
import { NavLink } from "react-router-dom";
import { useAuth } from '../context/AuthContext';

const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  }
  const { empresaId } = useAuth();
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [direccionEmpresa, setDireccionEmpresa] = useState('');
  const [LogoUrl, setLogoUrl] = useState(null);


  useEffect(() => {
    const fetchEmpresa = async () => {
      if (empresaId) {
        const { data: empresa, error } = await supabase
          .from('t_empresas')
          .select('nombre_empresa, direccion_empresa, logo_url')
          .eq('id_empresa', empresaId)
          .single();

        if (error) {
          console.error('Error fetching empresa:', error);
        } else if (empresa) {
          setNombreEmpresa(empresa.nombre_empresa);
          setDireccionEmpresa(empresa.direccion_empresa);
          setLogoUrl(empresa.logo_url);
        }
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  return (
    <nav className="flex items-center justify-between p-4 border-b border-b-[#1f2937]">
      <div className="flex items-center space-x-4">
        <Bars3BottomLeftIcon className="w-6 h-6 cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#1f2937] text-[#7c3bed] lg:hidden" onClick={() => handleSidebarToggle()} />
        <NavLink to="/" className="flex items-center space-x-2">
          <img src={LogoUrl} className="bg-[#7c3bed] text-white px-2 py-1 rounded-md font-bold  h-10" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">{nombreEmpresa}</span>
            <span className="text-xs text-gray-400">{direccionEmpresa}</span>
          </div>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;