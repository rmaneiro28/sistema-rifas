import { TrophyIcon, TicketIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

export const StatsCards = () => {
  const stats = [
    {
      title: "Active Raffles",
      value: "12",
      change: "+20% from last month",
      icon: TrophyIcon,
      iconColor: "text-purple-400"
    },
    {
      title: "Total Tickets Sold",
      value: "1,847",
      change: "+15% from last month",
      icon: TicketIcon,
      iconColor: "text-green-400"
    },
    {
      title: "Registered Players",
      value: "524",
      change: "+8% from last month",
      icon: UsersIcon,
      iconColor: "text-yellow-400"
    },
    {
      title: "Revenue",
      value: "$12,439",
      change: "+32% from last month",
      icon: CurrencyDollarIcon,
      iconColor: "text-green-400"
    }
  ]

  return (
    <div className="grid  md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <div className="space-y-2">
            <p className="text-white text-2xl font-bold">{stat.value}</p>
            <p className="text-green-400 text-sm">{stat.change}</p>
          </div>
        </div>
      ))}
    </div>
  )
}