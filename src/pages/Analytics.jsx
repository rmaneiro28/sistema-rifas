import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
  } from 'recharts';
import { ChartBarIcon, UserGroupIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { FiDollarSign } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { toast } from 'sonner';
  
  export default function Analytics() {
    const [stats, setStats] = useState([
        {
            label: "Total Revenue",
            value: "$0",
            icon: <FiDollarSign className="w-6 h-6 text-[#16a249]" />,
        },
        {
            label: "Active Players",
            value: "0",
            icon: <UserGroupIcon className="w-6 h-6 text-[#7c3bed]" />,
        },
        {
            label: "Tickets Sold",
            value: "0",
            icon: <TicketIcon className="w-6 h-6 text-[#16a249]" />,
        },
        {
            label: "Raffles Completed",
            value: "0",
            icon: <TrophyIcon className="w-6 h-6 text-[#16a249]" />,
        },
    ]);
    const [topRaffles, setTopRaffles] = useState([]);
    const [barData, setBarData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [filter, setFilter] = useState('last30days');

    useEffect(() => {
        const fetchData = async () => {
            const getFilterDate = () => {
                if (filter === 'allTime') return null;
                const date = new Date();
                const daysToSubtract = filter === 'last7days' ? 7 : 30;
                date.setDate(date.getDate() - daysToSubtract);
                return date.toISOString();
            };
            const filterDate = getFilterDate();

            // 1. Fetch ALL rifas for lookups
            const { data: allRifas, error: allRifasError } = await supabase.from('vw_rifas').select('*');
            if (allRifasError) {
                toast.error("Error al cargar las rifas.");
                console.error('Error fetching all raffles:', allRifasError);
                return;
            }

            // 2. Fetch tickets from the period
            let ticketsQuery = supabase.from('vw_tickets').select('*');
            if (filterDate) {
                ticketsQuery = ticketsQuery.gte('fecha_creacion_ticket', filterDate);
            }
            const { data: periodTickets, error: ticketsError } = await ticketsQuery;
            if (ticketsError) {
                toast.error("Error al cargar los tickets.");
                console.error('Error fetching period tickets:', ticketsError);
                return;
            }

            // 3. Filter rifas created in the period
            const periodRifas = filterDate ? allRifas.filter(r => new Date(r.created_at) >= new Date(filterDate)) : allRifas;

            // 4. Fetch total players
            const { data: jugadores, error: jugadoresError } = await supabase.from('t_jugadores').select('id', { count: 'exact' });
            if (jugadoresError) {
                toast.error("Error al cargar los jugadores.");
                console.error('Error fetching players:', jugadoresError);
                return;
            }

            // --- Calculations ---

            // Stats Cards
            const totalRevenue = periodTickets.reduce((acc, ticket) => acc + (ticket.precio_ticket || 0), 0);
            const ticketsSold = periodTickets.length;
            const rafflesCompleted = periodRifas.filter(r => r.estado === 'finalizada').length;
            const totalPlayers = jugadores.length;

            setStats([
                { ...stats[0], value: `$${totalRevenue.toLocaleString()}` },
                { ...stats[1], value: totalPlayers },
                { ...stats[2], value: ticketsSold },
                { ...stats[3], value: rafflesCompleted },
            ]);

            // Top Performing Raffles (based on revenue in the period)
            const topRafflesData = allRifas
                .map(rifa => ({
                    name: rifa.nombre,
                    tickets: periodTickets.filter(t => t.rifa_id === rifa.id_rifa).length,
                    revenue: periodTickets.filter(t => t.rifa_id === rifa.id_rifa).reduce((sum, ticket) => sum + (ticket.precio_ticket || 0), 0),
                }))
                .filter(r => r.revenue > 0)
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            setTopRaffles(topRafflesData);

            // Bar Chart Data (revenue and tickets per month/day)
            const barChartData = {};
            if (filter === 'allTime') {
                periodTickets.forEach(ticket => {
                    const date = new Date(ticket.fecha_creacion_ticket);
                    if (!isNaN(date)) {
                        const month = date.toLocaleString('es-ES', { month: 'short', year: 'numeric' });
                        if (!barChartData[month]) {
                            barChartData[month] = { name: month, revenue: 0, tickets: 0, dateObj: new Date(date.getFullYear(), date.getMonth()) };
                        }
                        barChartData[month].revenue += ticket.precio_ticket || 0;
                        barChartData[month].tickets += 1;
                    }
                });
            } else {
                periodTickets.forEach(ticket => {
                    const date = new Date(ticket.fecha_creacion_ticket);
                    if (!isNaN(date)) {
                        const day = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                        if (!barChartData[day]) {
                            barChartData[day] = { name: day, revenue: 0, tickets: 0, dateObj: date };
                        }
                        barChartData[day].revenue += ticket.precio_ticket || 0;
                        barChartData[day].tickets += 1;
                    }
                });
            }
            const sortedBarData = Object.values(barChartData).sort((a, b) => a.dateObj - b.dateObj);
            setBarData(sortedBarData);

            // Pie Chart Data (raffle status distribution in the period)
            const statusCounts = periodRifas.reduce((acc, rifa) => {
                const status = rifa.estado || 'desconocido';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            const pieChartData = Object.keys(statusCounts).map(status => ({
                name: status.charAt(0).toUpperCase() + status.slice(1),
                value: statusCounts[status],
                color: status === 'activa' ? '#22d3ee' : status === 'finalizada' ? '#fbbf24' : '#a3a3a3',
            }));
            setPieData(pieChartData);
        };

        fetchData();
    }, [filter]);

    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-3xl font-bold mb-1">
            Estadísticas
          </h1>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-[#181c24] px-4 py-2 rounded-lg text-xs text-white border border-[#23283a] hover:bg-[#23283a] focus:outline-none focus:border-[#7c3bed]"
          >
            <option value="last7days">Últimos 7 días</option>
            <option value="last30days">Últimos 30 días</option>
            <option value="allTime">Desde siempre</option>
          </select>
        </div>
        <p className="text-gray-400 mb-6">Track performance and insights for your raffle campaigns.</p>
  
        {/* Stats Cards */}
        <div className="grid max-md:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, idx) => (
            <div key={stat.label || idx} className="flex items-center gap-4 px-4 py-6 bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
                <div className="flex items-center gap-2 bg-[#7c3bed]/20 p-2 rounded-lg">
                    {stat.icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">{stat.label}</span>
                    <span className="text-white flex items-center gap-2 text-2xl font-bold">
                        {stat.value}
                    </span>
                </div>
            </div>  
          ))}
        </div>
  
        {/* Main Charts */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Revenue & Tickets Bar Chart */}
          <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
            <h2 className="text-white text-lg font-bold mb-2 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-[#7c3bed]" /> Revenue & Tickets
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} >
                <XAxis  dataKey="name" tickCount={5} tickLine={false} tickMargin={10} />
                <YAxis tickCount={5} tickLine={false} tickMargin={10} /> 
                <Tooltip contentStyle={{ background: "#23283a", border: "none", color: "#fff" }} />
                <Bar dataKey="revenue" name="Revenue" stroke="#7c3bed" fill="#7c3bed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tickets" name="Tickets" stroke="#d54ff9" fill="#d54ff9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Pie Chart */}
          <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
            <h2 className="text-white text-lg font-bold mb-2">Raffle Status Distribution</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value, entry, index) => (
                    <span className="text-xs text-white">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-2 justify-center text-xs">
              {pieData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-white">{d.name} ({d.value})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
  
        {/* Top Performing Raffles */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-4">Rifas con mejor rendimiento</h2>
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre de la Rifa</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Tickets Vendidos</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Ingresos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#23283a]">
                {topRaffles.map((raffle, idx) => (
                  <tr key={raffle.name || idx}>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-white">{raffle.name}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300 text-right">{raffle.tickets}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-green-400 text-right">${new Intl.NumberFormat().format(raffle.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {topRaffles.map((raffle, idx) => (
              <div key={raffle.name || idx} className="bg-[#181c24] p-4 rounded-lg">
                <h3 className="text-white font-semibold truncate mb-2">{raffle.name}</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tickets Vendidos:</span>
                  <span className="text-white">{raffle.tickets}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Ingresos:</span>
                  <span className="text-green-400 font-bold">${new Intl.NumberFormat().format(raffle.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }