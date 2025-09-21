import { TrophyIcon, TicketIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../context/AuthContext';

export const StatsCards = () => {
  const { empresaId } = useAuth();
  const [stats, setStats] = useState([
    { title: 'Total de rifas', value: 0, icon: TrophyIcon, iconColor: 'text-purple-400' },
    { title: 'Tickets vendidos', value: 0, icon: TicketIcon, iconColor: 'text-blue-400' },
    { title: 'Total de jugadores', value: 0, icon: UsersIcon, iconColor: 'text-green-400' },
    { title: 'Total de ingresos', value: '$ 0,00', icon: CurrencyDollarIcon, iconColor: 'text-yellow-400' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!empresaId) return;
      const { count: raffleCount } = await supabase.from('vw_rifas').select('*', { count: 'exact' }).eq('empresa_id', empresaId);
      const { count: playerCount } = await supabase.from('vw_jugadores').select('*', { count: 'exact' }).eq('empresa_id', empresaId);
      const { data: tickets, error } = await supabase.from('vw_tickets').select('*').eq('empresa_id', empresaId);

      if (error) {
        console.error("Error fetching tickets for stats", error);
        return;
      }
      console.log(tickets);
      console.log(raffleCount);

      const ticketCount = tickets.length;
      const totalRevenue = tickets.reduce((total, ticket) => total + ticket.precio_ticket, 0);


      setStats([
        { title: 'Total Rifas', value: raffleCount, icon: TrophyIcon, iconColor: 'text-purple-400' },
        { title: 'Tickets vendidos', value: ticketCount, icon: TicketIcon, iconColor: 'text-blue-400' },
        { title: 'Total Jugadores', value: playerCount, icon: UsersIcon, iconColor: 'text-green-400' },
        { title: 'Total Ingresos', value: `${totalRevenue.toFixed(2)}`, icon: CurrencyDollarIcon, iconColor: 'text-yellow-400' },
      ]);
    };

    fetchStats();
  }, [empresaId]);


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
          </div>
        </div>
      ))}
    </div>
  )
}

