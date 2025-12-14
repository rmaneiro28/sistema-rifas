import { TrophyIcon, TicketIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export const StatsCards = () => {
  const { empresaId } = useAuth();
  const [stats, setStats] = useState([
    { title: 'Total de rifas', value: 0, icon: TrophyIcon, iconColor: 'text-purple-400', link: '/rifas' },
    { title: 'Tickets vendidos', value: 0, icon: TicketIcon, iconColor: 'text-blue-400', link: '/tickets' },
    { title: 'Total de jugadores', value: 0, icon: UsersIcon, iconColor: 'text-green-400', link: '/jugadores' },
    { title: 'Total de ingresos', value: '$ 0,00', icon: CurrencyDollarIcon, iconColor: 'text-yellow-400', link: '/analytics' },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!empresaId) return;
      const { data: raffles, error } = await supabase
        .from('vw_rifas')
        .select('tickets_vendidos, precio_ticket')
        .eq('empresa_id', empresaId);

      const { count: playerCount } = await supabase.from('vw_jugadores').select('*', { count: 'exact' }).eq('empresa_id', empresaId);

      if (error) {
        console.error("Error fetching raffles for stats", error);
        return;
      }

      const raffleCount = raffles.length;
      const ticketCount = raffles.reduce((total, raffle) => total + raffle.tickets_vendidos, 0);
      const totalRevenue = raffles.reduce((total, raffle) => total + (raffle.tickets_vendidos * raffle.precio_ticket), 0);

      setStats([
        { title: 'Total Rifas', value: raffleCount, icon: TrophyIcon, iconColor: 'text-purple-400', link: '/rifas' },
        { title: 'Tickets vendidos', value: ticketCount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), icon: TicketIcon, iconColor: 'text-blue-400', link: '/tickets' },
        { title: 'Total Jugadores', value: playerCount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), icon: UsersIcon, iconColor: 'text-green-400', link: '/jugadores' },
        { title: 'Total Ingresos', value: `$ ${totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: CurrencyDollarIcon, iconColor: 'text-yellow-400', link: '/analytics' },
      ]);
    };

    fetchStats();
  }, [empresaId]);


  return (
    <div className="grid  md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <Link to={stat.link} key={index} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all cursor-pointer block">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-medium">{stat.title}</h3>
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
          </div>
          <div className="space-y-2">
            <p className="text-white text-2xl font-bold">{stat.value}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

