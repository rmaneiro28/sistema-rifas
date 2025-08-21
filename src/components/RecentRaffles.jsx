import { TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline'
export const RecentRaffles = ({ raffles = [] }) => {

  console.log(raffles)

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <TrophyIcon className="w-5 h-5 text-purple-400" />
        <h2 className="text-white text-lg font-semibold">Rifas recientes</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">Tus últimas actividades de rifa</p>

      <div className="space-y-4">
        {raffles.length > 0 ? (
          raffles.map((raffle, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{raffle.icon}</div>
                <div>
                  <h3 className="text-white font-medium">{raffle.title}</h3>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span>Tickets vendidos {raffle.ticketsSold}</span>
                    <div className="flex items-center space-x-1">
                      <CalendarIcon className="w-4 h-4" />
                      <span>{raffle.date}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-semibold text-lg">${raffle.price}</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${raffle.statusColor}`}>
                  {raffle.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No hay rifas recientes</p>
        )}
      </div>
    </div>
  )
}