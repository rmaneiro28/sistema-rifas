import { Bars3BottomLeftIcon } from "@heroicons/react/16/solid";
import LogoCliente from "/src/assets/logo-jocar.png"
import { NavLink } from "react-router-dom";
const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  }
  return (
    <nav className="flex items-center justify-between p-4 border-b border-b-[#1f2937]">
      <div className="flex items-center space-x-4">
        <Bars3BottomLeftIcon className="w-6 h-6 cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#1f2937] text-[#7c3bed] lg:hidden" onClick={() => handleSidebarToggle()} />
        <NavLink to="/" className="flex items-center space-x-2">
          <img src={LogoCliente} className="bg-[#7c3bed] text-white px-2 py-1 rounded-md font-bold  h-10" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Rifas Jocar</span>
            <span className="text-xs text-gray-400">Socopó</span>
          </div>
        </NavLink>
      </div>
    </nav>
  );
};

export default Navbar;