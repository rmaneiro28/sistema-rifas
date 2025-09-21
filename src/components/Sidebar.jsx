import { useState, useEffect } from 'react';
import {
  StarIcon,
  BoltIcon,
  Squares2X2Icon,
  TicketIcon,
  CreditCardIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import LogoSistema from '../assets/Logo RifasPlus.png'
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../api/supabaseClient';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  useLocation();
  const { session, logout } = useAuth();
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState('Rol');
  const [userLastName, setLastUserName] = useState('Apellido');

  useEffect(() => {
    const fetchUserData = async () => {
      if (session && session.user) {
        const { data: usuario, error } = await supabase
          .from('t_usuarios')
          .select('nombre, apellido, rol')
          .eq('email', session.user.email)
          .single();

        if (error) {
          console.error('Error fetching user data:', error);
        } else if (usuario) {
          setUserName(usuario.nombre);
          setLastUserName(usuario.apellido);
          setUserRole(usuario.rol);
        }
      }
    };

    fetchUserData();
  }, [session]);

  const handleLogout = () => {
    logout();
  }

  const handleLinkClick = () => {
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  }

  return ( 
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 h-full bg-[#131620] text-white flex flex-col  p-4 border-r border-r-[#1f2937] transform ${sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'} transition-transform duration-300 ease-in-out overflow-hidden`} id="sidebar">

      {/* Premium Section */}
      <div>

        <div className="flex items-center justify-between">
          <div className="bg-gradient-to-r from-[#f49f0a] px-2 py-2 to-[#ebad09] rounded-lg flex items-center justify-between text-black flex-grow">
            <div className="flex items-center space-x-2">
              <StarIcon className="w-5 h-5" />
              <div>
                <div className="font-semibold text-sm">Premium</div>
                <div className="text-xs opacity-80">Unlimited raffles</div>
              </div>
            </div>
            <BoltIcon className="w-5 h-5" />
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden ml-2 text-gray-400 hover:text-white">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center  justify-center pt-6 w-full ">
          <img src={LogoSistema} className="w-40 h-20 rounded-lg object-cover object-center mb-0" alt="Logo RifasPlus" />
        </div>
      </div>
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto pr-2 -mr-4">
          {/* Main Section */}
          <div className="mt-5">
            <div className="text-xs font-semibold text-[#7c3bed] tracking-wider mb-3">
              Main
            </div>
            <nav className="space-y-1">
              <NavLink to="/" onClick={handleLinkClick} className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
                <Squares2X2Icon className="w-5 h-5" />
                <span className="text-sm font-medium">Panel de control</span>
              </NavLink>
              <NavLink to="/rifas" onClick={handleLinkClick} className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
                <TicketIcon className="w-5 h-5" />
                <span className="text-sm">Rifas</span>
              </NavLink>
              <NavLink to="/tickets" onClick={handleLinkClick} className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
                <CreditCardIcon className="w-5 h-5" />
                <span className="text-sm">Tickets</span>
              </NavLink>
              <NavLink to="/jugadores" onClick={handleLinkClick} className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
                <UsersIcon className="w-5 h-5" />
                <span className="text-sm">Jugadores</span>
              </NavLink>
            </nav>
          </div>

          {/* Admin Section */}
          <div className="mt-5">
            <div className="text-xs font-semibold text-[#159946] tracking-wider mb-3">
              Admin
            </div>
            <nav className="space-y-1">
              <NavLink to="/analytics" onClick={handleLinkClick} className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
                <ChartBarIcon className="w-5 h-5" />
                <span className="text-sm">Estadísticas</span>
              </NavLink>
              <NavLink to="/configuracion" onClick={handleLinkClick} className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
                <CogIcon className="w-5 h-5" />
                <span className="text-sm">Configuración</span>
              </NavLink>
            </nav>
          </div>
      </div>
      {/* LogOut */}
      <div className="w-full">
        <div className="font-semibold text-[#7c3bed] tracking-wider mb-3 flex justify-between flex-col">
          <span className="text-sm tracking-wider">{userName} {userLastName}</span>
          <span className="text-xs text-gray-400 tracking-wider">{userRole}</span>
        </div>
        <button onClick={() => handleLogout()} className="flex items-center space-x-3 cursor-pointer px-3 py-2.5 rounded-lg w-full duration-300 ease-in-out hover:bg-[#7c3bed]/30 text-gray-400 hover:text-white transition-colors">
          <UserIcon className="w-5 h-5" />
          <span className="text-sm">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar;