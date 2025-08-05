import { Bars3BottomLeftIcon } from "@heroicons/react/16/solid";

const Navbar = () => {
  const handleSidebarToggle = () => {
    // Transicion
    document.body.classList.toggle("transition-all");
    document.body.classList.toggle("duration-600");
    document.body.classList.toggle("ease-in-out");
    document.body.classList.toggle("overflow-hidden");
    document.body.classList.toggle("overflow-y-auto");
    document.body.classList.toggle("sidebar-open");
    document.body.classList.toggle("sidebar-closed");
    document.getElementById("sidebar").classList.toggle("hidden");
  }
  return (
    <nav className="flex items-center justify-between p-4 border-b border-b-[#1f2937]">
      <div className="flex items-center space-x-4">
        <Bars3BottomLeftIcon className="w-6 h-6 cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#1f2937] text-[#7c3bed]" onClick={() => handleSidebarToggle()} />
        <div className="flex items-center space-x-2">
          <span className="bg-[#7c3bed] text-white px-2 py-1 rounded-md font-bold ">JC</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">Rifas Jocar</span>
            <span className="text-xs text-gray-400">Socopó</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;