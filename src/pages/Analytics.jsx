import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
  } from 'recharts';
  import { ChartBarIcon, UserGroupIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { FiDollarSign } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
  
  export default function Analytics() {
    const [stats, setStats] = useState([
        {
            label: "Total Revenue",
            value: "$0",
            icon: <FiDollarSign className="w-6 h-6 text-[#16a249]" />,
            change: "-0%",
            changeColor: "bg-[#d54ff9]",
        },
        {
            label: "Active Players",
            value: "0",
            icon: <UserGroupIcon className="w-6 h-6 text-[#7c3bed]" />,
            change: "+0%",
            changeColor: "bg-[#7c3bed]",
        },
        {
            label: "Tickets Sold",
            value: "0",
            icon: <TicketIcon className="w-6 h-6 text-[#16a249]" />,
            change: "-0%",
            changeColor: "bg-[#d54ff9]",
        },
        {
            label: "Raffles Completed",
            value: "0",
            icon: <TrophyIcon className="w-6 h-6 text-[#16a249]" />,
            change: "+0",
            changeColor: "bg-[#7c3bed]",
        },
    ]);
    const [topRaffles, setTopRaffles] = useState([]);
    const [barData, setBarData] = useState([]);
    const [pieData, setPieData] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch raffles
            const { data: rifas, error: rifasError } = await supabase.from('vw_rifas').select('*');
            if (rifasError) {
                console.error('Error fetching raffles:', rifasError);
                return;
            }

            // Fetch players
            const { data: jugadores, error: jugadoresError } = await supabase.from('t_jugadores').select('id', { count: 'exact' });
            if (jugadoresError) {
                console.error('Error fetching players:', jugadoresError);
                return;
            }

            // Fetch tickets
            const { data: tickets, error: ticketsError } = await supabase.from('t_tickets').select('id, rifa_id');
            if (ticketsError) {
                console.error('Error fetching tickets:', ticketsError);
                return;
            }

            // Calculate stats
            const totalRevenue = rifas.reduce((acc, rifa) => acc + rifa.precio_ticket * (tickets.filter(t => t.rifa_id === rifa.id).length), 0);
            const rafflesCompleted = rifas.filter(r => r.estado === 'Finalizada').length;

            setStats([
                { ...stats[0], value: `$${totalRevenue.toLocaleString()}` },
                { ...stats[1], value: jugadores.length },
                { ...stats[2], value: tickets.length },
                { ...stats[3], value: rafflesCompleted },
            ]);

            // Calculate top raffles
            const topRafflesData = rifas
                .map(rifa => ({
                    name: rifa.nombre,
                    tickets: tickets.filter(t => t.rifa_id === rifa.id).length,
                    revenue: rifa.precio_ticket * (tickets.filter(t => t.rifa_id === rifa.id).length),
                }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 3);
            setTopRaffles(topRafflesData);

            // Calculate bar chart data (revenue and tickets per month)
            const monthlyData = {};
            rifas.forEach(rifa => {
                const month = new Date(rifa.fecha_inicio).toLocaleString('default', { month: 'short' });
                if (!monthlyData[month]) {
                    monthlyData[month] = { name: month, revenue: 0, tickets: 0 };
                }
                monthlyData[month].revenue += rifa.precio_ticket * (tickets.filter(t => t.rifa_id === rifa.id).length);
                monthlyData[month].tickets += tickets.filter(t => t.rifa_id === rifa.id).length;
            });
            setBarData(Object.values(monthlyData));

            // Calculate pie chart data (raffle status distribution)
            const statusCounts = rifas.reduce((acc, rifa) => {
                acc[rifa.estado] = (acc[rifa.estado] || 0) + 1;
                return acc;
            }, {});

            const pieChartData = Object.keys(statusCounts).map(status => ({
                name: status,
                value: statusCounts[status],
                color: status === 'Activa' ? '#22d3ee' : status === 'Finalizada' ? '#fbbf24' : '#a3a3a3',
            }));
            setPieData(pieChartData);
        };

        fetchData();
    }, []);

    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-3xl font-bold mb-1">
            Estadísticas
          </h1>
          <button className="bg-[#181c24] px-4 py-2 rounded-lg text-xs text-white border border-[#23283a] hover:bg-[#23283a]">
            Last 30 days ▼
          </button>
        </div>
        <p className="text-gray-400 mb-6">Track performance and insights for your raffle campaigns.</p>
  
        {/* Stats Cards */}
        <div className="grid max-md:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.map((stat, idx) => (
            <div className="flex items-center gap-4 px-4 py-6 bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
                <div className="flex items-center gap-2 bg-[#7c3bed]/20 p-2 rounded-lg">
                    {stat.icon}
                </div>
                <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">{stat.label}</span>
                    <span className="text-white flex items-center gap-2 text-2xl font-bold">
                        {stat.value}
                        <span className="text-xs px-2 py-1 rounded-full bg-[#7c3bed] text-white">
                            {stat.change}
                        </span>
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
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
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
                <span key={i} className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color }} />
                  <span className="text-white">{d.name} ({d.value})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
  
        {/* Top Performing Raffles */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-2">Top Performing Raffles</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#23283a]">
              <thead className="bg-[#0f131b]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raffle Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets Sold</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                </tr>
              </thead>
              <tbody className="bg-[#0f131b] divide-y divide-[#23283a]">
                {topRaffles.map((raffle, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white">{raffle.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white">{raffle.tickets}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-white">${new Intl.NumberFormat().format(raffle.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }