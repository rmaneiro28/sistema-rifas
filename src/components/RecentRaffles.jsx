import { TrophyIcon, CalendarIcon } from '@heroicons/react/24/outline'

export const RecentRaffles = () => {
  const raffles = [
    {
      title: "Premium Gaming Setup",
      icon: "👑",
      price: "$2,500",
      ticketsSold: "145 tickets sold",
      date: "2024-01-15",
      status: "Active",
      statusColor: "bg-purple-600"
    },
    {
      title: "iPhone 15 Pro Max",
      price: "$1,200",
      ticketsSold: "89 tickets sold",
      date: "2024-01-12",
      status: "Active",
      statusColor: "bg-purple-600"
    },
    {
      title: "Cash Prize",
      price: "$500",
      ticketsSold: "234 tickets sold",
      date: "2024-01-10",
      status: "Ending Soon",
      statusColor: "bg-red-600"
    }
  ]

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <TrophyIcon className="w-5 h-5 text-purple-400" />
        <h2 className="text-white text-lg font-semibold">Recent Raffles</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">Your latest raffle activities</p>
      
      <div className="space-y-4">
        {raffles.map((raffle, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div className="flex items-center space-x-4">
              <div className="text-2xl">{raffle.icon}</div>
              <div>
                <h3 className="text-white font-medium">{raffle.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>{raffle.ticketsSold}</span>
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{raffle.date}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-semibold text-lg">{raffle.price}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium text-white ${raffle.statusColor}`}>
                {raffle.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}