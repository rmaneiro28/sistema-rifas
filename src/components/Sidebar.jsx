import {
  StarIcon,
  BoltIcon,
  Squares2X2Icon,
  TicketIcon,
  CreditCardIcon,
  UsersIcon,
  ChartBarIcon,
  CogIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { NavLink } from 'react-router-dom'
import { useLocation } from 'react-router-dom'

const Sidebar = () => {
  useLocation();
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
  return (
    <div className="w-64 h-screen bg-[#131620] text-white flex flex-col p-4 border-r border-r-[#1f2937] justify-between" id="sidebar">
      {/* Premium Section */}
      <div>
        <div className="">
          <div className="bg-gradient-to-r from-[#f49f0a] px-2 py-2 to-[#ebad09] rounded-lg flex items-center justify-between text-black  ">
            <div className="flex items-center space-x-2 ">
              <StarIcon className="w-5 h-5" />
              <div >
                <div className="font-semibold text-sm">Premium</div>
                <div className="text-xs opacity-80">Unlimited raffles</div>
              </div>
            </div>
            <BoltIcon className="w-5 h-5" />
          </div>
        </div>

        {/* Main Section */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-[#7c3bed]  tracking-wider mb-3">
            Main
          </div>
          <nav className="space-y-1">
            <NavLink to="/" className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
              <Squares2X2Icon className="w-5 h-5" />
              <span className="text-sm font-medium">Dashboard</span>
            </NavLink>
            <NavLink to="/rifas" className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
              <TicketIcon className="w-5 h-5" />
              <span className="text-sm">Raffles</span>
            </NavLink>
            <NavLink to="/tickets" className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
              <CreditCardIcon className="w-5 h-5" />
              <span className="text-sm">Tickets</span>
            </NavLink>
            <NavLink to="/players" className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
              <UsersIcon className="w-5 h-5" />
              <span className="text-sm">Players</span>
            </NavLink>
          </nav>
        </div>

        {/* Admin Section */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-[#159946]  tracking-wider mb-3">
            Admin
          </div>
          <nav className="space-y-1">
            <NavLink to="/analytics" className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
              <ChartBarIcon className="w-5 h-5" />
              <span className="text-sm">Analytics</span>
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "flex items-center space-x-3 px-3 py-2.5 rounded-lg bg-[#7c3bed] text-white" : "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-gray-700/30 transition-colors"}>
              <CogIcon className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* LogOut */}
      <div className="w-full">
        <div className="font-semibold text-[#7c3bed]  tracking-wider mb-3 flex justify-between flex-col">
          <span className="text-sm tracking-wider">Rifas JoCar</span>
          <span className="text-xs text-gray-400 tracking-wider">Socopó</span>          
        </div>
        <button className="flex items-center space-x-3 cursor-pointer px-3 py-2.5 rounded-lg w-full duration-300 ease-in-out hover:bg-[#7c3bed]/30 text-gray-400 hover:text-white transition-colors">
          <UserIcon  onClick={() => handleLogout()}  className="w-5 h-5" />
          <span className="text-sm">Log Out</span>
        </button>
      </div>
    </div>
  )
}

export default Sidebar