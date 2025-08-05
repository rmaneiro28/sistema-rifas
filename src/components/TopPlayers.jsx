import { StarIcon } from '@heroicons/react/24/outline'

export const TopPlayers = () => {
  const players = [
    {
      rank: 1,
      name: "Alex Johnson",
      tickets: "47 tickets",
      earnings: "$235",
      avatar: "bg-yellow-500"
    },
    {
      rank: 2,
      name: "Sarah Chen",
      tickets: "32 tickets",
      earnings: "$160",
      avatar: "bg-blue-500"
    },
    {
      rank: 3,
      name: "Mike Rodriguez",
      tickets: "28 tickets",
      earnings: "$140",
      avatar: "bg-green-500"
    },
    {
      rank: 4,
      name: "Emma Watson",
      tickets: "25 tickets",
      earnings: "$125",
      avatar: "bg-purple-500"
    }
  ]

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <StarIcon className="w-5 h-5 text-yellow-400" />
        <h2 className="text-white text-lg font-semibold">Top Players</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">Most active participants this month</p>
      
      <div className="space-y-4">
        {players.map((player, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-600 text-white font-semibold text-sm">
                {player.rank}
              </div>
              <div className={`w-10 h-10 rounded-full ${player.avatar} flex items-center justify-center text-white font-semibold`}>
                {player.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-white font-medium">{player.name}</h3>
                <p className="text-gray-400 text-sm">{player.tickets}</p>
              </div>
            </div>
            <div className="text-green-400 font-semibold">
              {player.earnings}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}