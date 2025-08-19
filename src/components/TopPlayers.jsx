import { StarIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { supabase } from '../api/supabaseClient'

export const TopPlayers = () => {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTopPlayers = async () => {
      try {
        const { data, error } = await supabase
          .from('vw_jugadores')
          .select('nombre, apellido, tickets_comprados, total_gastado')
          .order('total_gastado', { ascending: false })
          .limit(4)

        if (error) {
          throw error
        }

        const avatarColors = ['bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500']

        const formattedPlayers = data.map((player, index) => ({
          rank: index + 1,
          name: player.nombre + ' ' + player.apellido,
          tickets: `${player.tickets_comprados} tickets`,
          earnings: `$ ${player.total_gastado}`,
          avatar: avatarColors[index] || 'bg-gray-500'
        }))

        setPlayers(formattedPlayers)
      } catch (error) {
        console.error('Error fetching top players:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTopPlayers()
  }, [])

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <StarIcon className="w-5 h-5 text-yellow-400" />
        <h2 className="text-white text-lg font-semibold">Top Players</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">Most active participants this month</p>

      {loading ? (
        <div className="text-center text-gray-400">Loading...</div>
      ) : (
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
      )}
    </div>
  )
}