import { TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline'
export const RecentRaffles = ({ raffles = [] }) => {

  console.log(raffles)

  return (
    <div className="bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] border border-[#23283a] rounded-xl p-4 sm:p-6 max-w-full overflow-hidden shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg animate-pulse"></div>
          <TrophyIcon className="w-6 h-6 text-purple-400 relative z-10" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent truncate">
            Rifas recientes
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 break-words">
            Tus últimas actividades de rifa
          </p>
        </div>
      </div>

      {/* Raffle List */}
      <div className="space-y-3 sm:space-y-4">
        {raffles.length > 0 ? (
          raffles.map((raffle, index) => (
            <div 
              key={index} 
              className="group relative overflow-hidden bg-[#0f131b]/80 border border-[#23283a] rounded-xl p-4 sm:p-5 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {/* Background gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left side - Icon and info */}
                <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="flex-shrink-0 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-md group-hover:scale-110 transition-transform duration-300"></div>
                    <div className="text-3xl sm:text-2xl relative z-10 transform group-hover:scale-110 transition-transform duration-300">
                      {raffle.icon}
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h3 className="text-white font-semibold text-base sm:text-lg truncate group-hover:text-purple-300 transition-colors duration-200">
                      {raffle.title}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">{raffle.ticketsSold} vendidos</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <CalendarIcon className="w-4 h-4 text-purple-400" />
                        <span className="truncate">{raffle.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Price and status */}
                <div className="flex-shrink-0 text-right sm:text-left">
                  <div className="flex items-center gap-2 sm:justify-start">
                    <span className="text-green-400 font-bold text-xl sm:text-lg group-hover:text-green-300 transition-colors duration-200">
                      ${raffle.price}
                    </span>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 group-hover:scale-105 ${raffle.statusColor}`}>
                      {raffle.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 sm:py-12">
            <div className="relative inline-block mb-4">
              <div className="absolute inset-0 bg-purple-500/20 rounded-full blur-lg animate-pulse"></div>
              <TrophyIcon className="w-12 h-12 text-gray-500 relative z-10" />
            </div>
            <p className="text-gray-400 text-base sm:text-lg font-medium">
              No hay rifas recientes
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Tus actividades aparecerán aquí
            </p>
          </div>
        )}
      </div>
    </div>
  )
}