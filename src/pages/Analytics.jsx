import {
  ComposedChart, Bar, BarChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { ChartBarIcon, UserGroupIcon, TicketIcon, UserIcon, TrophyIcon, StarIcon, ArrowUpIcon, ArrowDownIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { FiDollarSign } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { toast } from 'sonner';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAuth } from '../context/AuthContext';


export default function Analytics() {
  const { empresaId } = useAuth()
  const [stats, setStats] = useState([
    {
      label: "Ingresos Totales",
      value: "$0",
      icon: <FiDollarSign className="w-6 h-6 text-[#16a249]" />,
      trend: null,
    },
    {
      label: "Jugadores Activos",
      value: "0",
      icon: <UserGroupIcon className="w-6 h-6 text-[#7c3bed]" />,
      trend: null,
    },
    {
      label: "Tickets Vendidos",
      value: "0",
      icon: <TicketIcon className="w-6 h-6 text-[#16a249]" />,
      trend: null,
    },
    {
      label: "Tasa de Conversión",
      value: "0%",
      icon: <ChartBarIcon className="w-6 h-6 text-[#f59e0b]" />,
      trend: null,
    },
    {
      label: "Ticket Promedio",
      value: "$0",
      icon: <TicketIcon className="w-6 h-6 text-[#06b6d4]" />,
      trend: null,
    },
    {
      label: "Rifas Activas",
      value: "0",
      icon: <TrophyIcon className="w-6 h-6 text-[#8b5cf6]" />,
      trend: null,
    },
  ]);
  const [topRaffles, setTopRaffles] = useState([]);
  const [barData, setBarData] = useState([]);
  const [topPlayersChartData, setTopPlayersChartData] = useState([]);
  const [ticketStatusData, setTicketStatusData] = useState([]);
  const [filter, setFilter] = useState('allTime');
  const [rifaFilter, setRifaFilter] = useState('all'); // Filtro por rifa específica
  const [availableRifas, setAvailableRifas] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [isPlayerModalAnimating, setIsPlayerModalAnimating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // --- PERIOD CALCULATION ---
        let filterDate = null;
        let previousFilterStartDate = null;
        let previousFilterEndDate = null;

        if (filter !== 'allTime') {
          const now = new Date();
          const currentPeriodStart = new Date();
          const daysToSubtract = filter === 'last7days' ? 7 : 30;
          currentPeriodStart.setDate(now.getDate() - daysToSubtract);
          filterDate = currentPeriodStart.toISOString();

          // Calculate previous period dates
          const previousEnd = new Date(currentPeriodStart);
          const previousStart = new Date(previousEnd);
          previousStart.setDate(previousEnd.getDate() - daysToSubtract);

          previousFilterStartDate = previousStart.toISOString();
          previousFilterEndDate = previousEnd.toISOString();
        }

        const { data: previousPeriodTicketsData, error: previousTicketsError } = previousFilterStartDate ? (() => {
          let query = supabase.from('vw_tickets').select('precio_ticket').eq('empresa_id', empresaId)
            .gte('fecha_creacion_ticket', previousFilterStartDate)
            .lt('fecha_creacion_ticket', previousFilterEndDate);
          if (rifaFilter !== 'all') {
            query = query.eq('rifa_id', rifaFilter);
          }
          return query;
        })() : { data: [], error: null };

        if (previousTicketsError) {
          console.error('Error fetching previous period tickets:', previousTicketsError);
        };

        // 1. Fetch ALL rifas for lookups and filter options
        const { data: allRifas, error: allRifasError } = await supabase.from('vw_rifas').select('*').eq('empresa_id', empresaId);
        if (allRifasError) {
          toast.error("Error al cargar las rifas.");
          console.error('Error fetching all raffles:', allRifasError);
          return;
        }

        // Set available rifas for filter
        setAvailableRifas(allRifas.map(r => ({ id: r.id_rifa, name: r.nombre })));

        // 2. Fetch tickets from the period and rifa filter
        let ticketsQuery = supabase.from('vw_tickets').select('*').eq('empresa_id', empresaId);
        if (filterDate) {
          ticketsQuery = ticketsQuery.gte('fecha_creacion_ticket', filterDate);
        }
        if (rifaFilter !== 'all') {
          ticketsQuery = ticketsQuery.eq('rifa_id', rifaFilter);
        }
        const { data: periodTickets, error: ticketsError } = await ticketsQuery;
        if (ticketsError) {
          toast.error("Error al cargar los tickets.");
          console.error('Error fetching period tickets:', ticketsError);
          return;
        }

        // 3. Filter rifas created in the period
        let periodRifas = allRifas;
        if (filterDate) {
          periodRifas = allRifas.filter(r => new Date(r.created_at) >= new Date(filterDate));
        }
        if (rifaFilter !== 'all') {
          periodRifas = periodRifas.filter(r => r.id_rifa === rifaFilter);
        }

        // 4. Fetch total players
        const { data: jugadores, error: jugadoresError } = await supabase.from('t_jugadores').select('id', { count: 'exact' }).eq('empresa_id', empresaId);
        if (jugadoresError) {
          toast.error("Error al cargar los jugadores.");
          console.error('Error fetching players:', jugadoresError);
          return;
        }

        // --- Enhanced Calculations ---

        // Basic Stats
        const totalRevenue = periodTickets.reduce((acc, ticket) => acc + (ticket.precio_ticket || 0), 0);
        const ticketsSold = periodTickets.length;
        const rafflesCompleted = periodRifas.filter(r => r.estado === 'finalizada').length;
        const rafflesActive = allRifas.filter(r => r.estado === 'activa').length;
        
        // Enhanced Stats
        const activePlayersInPeriod = new Set(periodTickets.filter(t => t.jugador_id).map(t => t.jugador_id)).size;
        const paidTickets = periodTickets.filter(t => t.estado === 'pagado').length;
        const totalPlayers = jugadores?.length || 0;
        const conversionRate = totalPlayers > 0 ? ((activePlayersInPeriod / totalPlayers) * 100).toFixed(1) : 0;
        const averageTicketValue = ticketsSold > 0 ? (totalRevenue / ticketsSold).toFixed(0) : 0;
        
        // Previous period stats
        const previousTotalRevenue = (previousPeriodTicketsData || []).reduce((acc, ticket) => acc + (ticket.precio_ticket || 0), 0);
        const previousTicketsSold = (previousPeriodTicketsData || []).length;
        const previousActivePlayers = new Set((previousPeriodTicketsData || []).filter(t => t.jugador_id).map(t => t.jugador_id)).size;
        const previousConversionRate = totalPlayers > 0 ? ((previousActivePlayers / totalPlayers) * 100).toFixed(1) : 0;
        const previousAverageTicketValue = previousTicketsSold > 0 ? (previousTotalRevenue / previousTicketsSold).toFixed(0) : 0;

        // Calculate percentage change
        const calculateChange = (current, previous) => {
          if (previous === 0) return { percentage: current > 0 ? 100 : 0, type: current > 0 ? 'increase' : 'neutral' };
          if (current === previous) return { percentage: 0, type: 'neutral' };
          const percentage = ((current - previous) / previous) * 100;
          return {
            percentage: Math.abs(percentage).toFixed(0),
            type: percentage > 0 ? 'increase' : 'decrease'
          };
        };

        const revenueChange = calculateChange(totalRevenue, previousTotalRevenue);
        const ticketsSoldChange = calculateChange(ticketsSold, previousTicketsSold);
        const conversionChange = calculateChange(parseFloat(conversionRate), parseFloat(previousConversionRate));
        const avgTicketChange = calculateChange(parseFloat(averageTicketValue), parseFloat(previousAverageTicketValue));

        setStats(prevStats => [
          { ...prevStats[0], value: `$${totalRevenue.toLocaleString()}`, trend: filter !== 'allTime' ? revenueChange : null },
          { ...prevStats[1], value: activePlayersInPeriod },
          { ...prevStats[2], value: ticketsSold, trend: filter !== 'allTime' ? ticketsSoldChange : null },
          { ...prevStats[3], value: `${conversionRate}%`, trend: filter !== 'allTime' ? conversionChange : null },
          { ...prevStats[4], value: `$${parseInt(averageTicketValue).toLocaleString()}`, trend: filter !== 'allTime' ? avgTicketChange : null },
          { ...prevStats[5], value: rafflesActive },
        ]);

        // Top Performing Raffles (based on revenue in the period)
        const ticketsByRaffle = periodTickets.reduce((acc, ticket) => {
          const rifaId = ticket.rifa_id;
          if (!acc[rifaId]) {
            acc[rifaId] = { tickets_sold: 0, revenue: 0 };
          }
          acc[rifaId].tickets_sold += 1;
          acc[rifaId].revenue += ticket.precio_ticket || 0;
          return acc;
        }, {});

        const topRafflesData = allRifas
          .map(rifa => {
            const performance = ticketsByRaffle[rifa.id_rifa];
            if (!performance || performance.revenue <= 0) return null;

            return {
              name: rifa.nombre,
              tickets: performance.tickets_sold,
              revenue: performance.revenue,
              total_tickets: rifa.total_tickets,
              sales_percentage: rifa.total_tickets > 0 ? (performance.tickets_sold / rifa.total_tickets) * 100 : 0,
            };
          })
          .filter(Boolean)
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

        // Ticket Status Distribution Chart Data
        const statusCounts = periodTickets.reduce((acc, ticket) => {
          const status = ticket.estado_ticket || 'desconocido';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});

        const statusUI = {
          pagado: { label: 'Pagado', color: '#22c55e' },
          apartado: { label: 'Apartado', color: '#f59e0b' },
          familiares: { label: 'Familiar', color: '#a855f7' },
          disponible: { label: 'Disponible', color: '#6b7280' },
          desconocido: { label: 'Desconocido', color: '#a3a3a3' }
        };

        const pieChartData = Object.keys(statusCounts)
          .map(status => ({
            name: statusUI[status]?.label || status,
            value: statusCounts[status],
            color: statusUI[status]?.color || '#a3a3a3',
          })).sort((a, b) => b.value - a.value);
        setTicketStatusData(pieChartData);

        // Top Players Chart Data (based on revenue in the period)
        const playersData = periodTickets.reduce((acc, ticket) => {
          if (ticket.jugador_id && ticket.nombre_jugador) {
            if (!acc[ticket.jugador_id]) {
              acc[ticket.jugador_id] = {
                id: ticket.jugador_id,
                name: ticket.nombre_jugador,
                revenue: 0,
                ticketsCount: 0,
              };
            }
            acc[ticket.jugador_id].revenue += ticket.precio_ticket || 0;
            acc[ticket.jugador_id].ticketsCount += 1;
          }
          return acc;
        }, {});

        const sortedTopPlayers = Object.values(playersData)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
        setTopPlayersChartData(sortedTopPlayers);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filter, rifaFilter]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const revenuePayload = payload.find(p => p.dataKey === 'revenue');
      const ticketsPayload = payload.find(p => p.dataKey === 'tickets');
      return (
        <div className="bg-[#23283a] p-3 rounded-lg border border-[#2d3748] shadow-lg text-sm">
          <p className="text-white font-semibold mb-2">{label}</p>
          {revenuePayload && <p style={{ color: revenuePayload.stroke }}>{`Ingresos: $${revenuePayload.value.toLocaleString()}`}</p>}
          {ticketsPayload && <p style={{ color: ticketsPayload.fill }}>{`Tickets: ${ticketsPayload.value}`}</p>}
        </div>
      );
    }
    return null;
  };

  const CustomTopPlayerTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#23283a] p-3 rounded-lg border border-[#2d3748] shadow-lg text-sm">
          <p className="text-white font-semibold mb-2">{label}</p>
          <p className="text-green-400">{`Gastado: $${data.revenue.toLocaleString()}`}</p>
          <p className="text-purple-400">{`Tickets: ${data.ticketsCount}`}</p>
        </div>
      );
    }
    return null;
  };

  const handlePlayerBarClick = async (data) => {
    if (!data || !data.id) return;

    const { data: playerData, error } = await supabase
      .from('vw_jugadores')
      .select('*')
      .eq('id', data.id)
      .single();

    if (error) {
      toast.error('Error al cargar los detalles del jugador.');
      console.error('Error fetching player details:', error);
      return;
    }

    // Ensure numeros_favoritos is an array
    const finalPlayerData = {
      ...playerData,
      numeros_favoritos: Array.isArray(playerData.numeros_favoritos)
        ? playerData.numeros_favoritos
        : typeof playerData.numeros_favoritos === "string"
          ? playerData.numeros_favoritos.split(",").map(n => n.trim()).filter(Boolean)
          : []
    };

    setSelectedPlayer(finalPlayerData);
    setShowPlayerModal(true);
    setTimeout(() => setIsPlayerModalAnimating(true), 10);
  };

  const closePlayerModal = () => {
    setIsPlayerModalAnimating(false);
    setTimeout(() => {
      setShowPlayerModal(false);
      setSelectedPlayer(null);
    }, 300);
  };

  const STATUS_BADGES = {
    vip: { label: "VIP", color: "bg-[#a21caf] text-white" },
    active: { label: "Activo", color: "bg-[#23283a] text-white" },
    winner: { label: "Ganador", color: "bg-[#0ea5e9] text-white" },
  };

  if (loading) {
    return <LoadingScreen message="Cargando estadísticas..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-3xl font-bold mb-1">
          Estadísticas
        </h1>
        <div className="flex gap-3">
          <select
            value={rifaFilter}
            onChange={(e) => setRifaFilter(e.target.value)}
            className="bg-[#181c24] px-4 py-2 rounded-lg text-xs text-white border border-[#23283a] hover:bg-[#23283a] focus:outline-none focus:border-[#7c3bed]"
          >
            <option value="all">Todas las rifas</option>
            {availableRifas.map(rifa => (
              <option key={rifa.id} value={rifa.id}>{rifa.name}</option>
            ))}
          </select>
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
      </div>
      <p className="text-gray-400 mb-6">Monitorea el rendimiento y las estadísticas de tus campañas de rifas.</p>

      {/* Enhanced Stats Cards */}
      <div className="grid max-md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {stats.map((stat, idx) => (
          <div key={stat.label || idx} className="group relative overflow-hidden bg-[#0f131b] border border-[#23283a] rounded-lg p-4 hover:border-[#7c3bed]/50 transition-all duration-200 hover:shadow-lg hover:shadow-[#7c3bed]/10">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#7c3bed]/10 to-transparent rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2" />
            
            <div className="relative z-10">
              {/* Icon */}
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#7c3bed]/20 to-[#d54ff9]/20 rounded-lg mb-3 group-hover:scale-105 transition-transform duration-200">
                {stat.icon}
              </div>
              
              {/* Content */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs font-medium">{stat.label}</span>
                  {stat.trend && stat.trend.type !== 'neutral' && (
                    <span className={`flex items-center text-xs font-semibold ${stat.trend.type === 'increase' ? 'text-green-400' : 'text-red-400'}`}>
                      {stat.trend.type === 'increase' ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                      {stat.trend.percentage}%
                    </span>
                  )}
                </div>
                
                <span className="text-white text-xl font-bold tracking-tight">{stat.value}</span>
                
                {stat.subtitle && (
                  <span className="text-gray-500 text-xs">{stat.subtitle}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Revenue & Tickets Composed Chart */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-2 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-[#7c3bed]" /> Ingresos y Tickets
          </h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={barData} margin={{ top: 20, right: 20, bottom: 5, left: -10 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3bed" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#7c3bed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: '#a3a3a3', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" orientation="left" stroke="#a3a3a3" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#d54ff9" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Ingresos" stroke="#7c3bed" fillOpacity={1} fill="url(#colorRevenue)" />
                <Bar dataKey="tickets" yAxisId="right" name="Tickets" fill="#d54ff9" radius={[4, 4, 0, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-500">
              No hay datos de ingresos para este período.
            </div>
          )}
        </div>
        {/* Top Players Bar Chart */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-2 flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-[#d54ff9]" /> Top 5 Jugadores
          </h2>
          {topPlayersChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topPlayersChartData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#a3a3a3', fontSize: 12 }}
                  width={100}
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={<CustomTopPlayerTooltip />}
                />
                <Bar dataKey="revenue" name="Gastado" fill="#d54ff9" radius={[0, 4, 4, 0]} barSize={20} onClick={handlePlayerBarClick} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-500">
              No hay datos de jugadores para este período.
            </div>
          )}
        </div>
      </div>

      {/* Additional Insights Section */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {/* Ticket Status Distribution */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-[#7c3bed]" /> Distribución de Tickets
          </h2>
          {ticketStatusData.length > 0 ? (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ticketStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {ticketStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="outside"
                      fill="#ffffff"
                      fontSize={12}
                      fontWeight="bold"
                    />
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const total = ticketStatusData.reduce((acc, curr) => acc + curr.value, 0);
                        const percentage = ((data.value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-[#23283a] p-3 rounded-lg border border-[#2d3748] shadow-lg text-sm">
                            <p className="text-white font-semibold mb-1">{data.name}</p>
                            <p className="text-gray-300">{data.value} tickets</p>
                            <p className="text-gray-400">{percentage}% del total</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value, entry, index) => (
                      <span className="text-gray-300 text-xs">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[240px] text-gray-500">
              No hay datos de estado de tickets.
            </div>
          )}
        </div>

        {/* Top Performing Raffles */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-[#d54ff9]" /> Mejores Rifas
          </h2>
          {topRaffles.length > 0 ? (
            <div className="space-y-3">
              {topRaffles.slice(0, 3).map((rifa, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-[#23283a] rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium truncate max-w-[120px]">{rifa.name}</p>
                      <p className="text-gray-400 text-xs">{rifa.tickets} tickets</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 text-sm font-bold">${rifa.revenue.toLocaleString()}</p>
                    <p className="text-gray-500 text-xs">{rifa.sales_percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-gray-500">
              No hay datos de rifas.
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        <div className="bg-[#0f131b] border border-[#23283a] p-4 rounded-lg">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <StarIcon className="w-5 h-5 text-[#16a249]" /> Métricas Clave
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-[#23283a] rounded-lg">
              <div>
                <p className="text-gray-400 text-xs">Eficiencia de Ventas</p>
                <p className="text-white text-sm font-medium">
                  {topRaffles.length > 0 ? 
                    (topRaffles.reduce((acc, r) => acc + r.sales_percentage, 0) / topRaffles.length).toFixed(1) : 0}%
                </p>
              </div>
              <div className="text-green-400">
                <ArrowUpIcon className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-[#23283a] rounded-lg">
              <div>
                <p className="text-gray-400 text-xs">Ingresos por Rifa</p>
                <p className="text-white text-sm font-medium">
                  {topRaffles.length > 0 ? 
                    `$${(topRaffles.reduce((acc, r) => acc + r.revenue, 0) / topRaffles.length).toFixed(0)}` : '$0'
                  }
                </p>
              </div>
              <div className="text-blue-400">
                <FiDollarSign className="w-4 h-4" />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-[#23283a] rounded-lg">
              <div>
                <p className="text-gray-400 text-xs">Participación Promedio</p>
                <p className="text-white text-sm font-medium">
                  {topPlayersChartData.length > 0 ? 
                    (topPlayersChartData.reduce((acc, p) => acc + p.ticketsCount, 0) / topPlayersChartData.length).toFixed(1) : 0
                  } tickets
                </p>
              </div>
              <div className="text-purple-400">
                <TicketIcon className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      {showPlayerModal && selectedPlayer && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40 bg-[#181c24d8] transition-opacity duration-300"
            onClick={closePlayerModal}
          />

          {/* Panel lateral */}
          <div className={`fixed top-0 right-0 h-full w-full max-w-2xl bg-[#181c24] border-l border-[#23283a] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isPlayerModalAnimating ? 'translate-x-0' : 'translate-x-full'
            }`}>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#23283a] bg-[#181c24]">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-tr from-[#7c3bed] to-[#d54ff9] rounded-full flex items-center justify-center text-lg font-bold text-white">
                    {selectedPlayer.nombre?.charAt(0)}{selectedPlayer.apellido?.charAt(0)}
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {selectedPlayer.nombre} {selectedPlayer.apellido}
                  </h2>
                </div>
                <button
                  onClick={closePlayerModal}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-[#23283a]"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                  {/* Información Personal */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <UserIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Información Personal
                    </h3>

                    <div className="bg-[#23283a] rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Nombre completo:</span>
                        <span className="text-white font-medium">{selectedPlayer.nombre} {selectedPlayer.apellido}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Email:</span>
                        <span className="text-white">{selectedPlayer.email}</span>
                      </div>

                      {selectedPlayer.telefono && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Teléfono:</span>
                          <span className="text-white">{selectedPlayer.telefono}</span>
                        </div>
                      )}

                      {selectedPlayer.cedula && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400">Cédula:</span>
                          <span className="text-white">{selectedPlayer.cedula}</span>
                        </div>
                      )}

                      {selectedPlayer.direccion && (
                        <div className="flex justify-between items-start">
                          <span className="text-gray-400">Dirección:</span>
                          <span className="text-white text-right max-w-xs">{selectedPlayer.direccion}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Estado:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[selectedPlayer.status]?.color || "bg-gray-700 text-white"}`}>
                          {STATUS_BADGES[selectedPlayer.status]?.label || 'Activo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Estadísticas */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                      <TrophyIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                      Estadísticas
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#23283a] p-4 rounded-lg text-center">
                        <TicketIcon className="w-8 h-8 text-[#7c3bed] mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Tickets Comprados</p>
                        <p className="text-2xl font-bold text-white">{selectedPlayer.total_tickets_comprados || 0}</p>
                      </div>
                      <div className="bg-[#23283a] p-4 rounded-lg text-center">
                        <TrophyIcon className="w-8 h-8 text-[#16a249] mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Total Gastado</p>
                        <p className="text-2xl font-bold text-white">${selectedPlayer.monto_total_gastado || 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Números Favoritos */}
                  {selectedPlayer.numeros_favoritos && selectedPlayer.numeros_favoritos.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <StarIcon className="w-5 h-5 mr-2 text-[#7c3bed]" />
                        Números Favoritos
                      </h3>

                      <div className="bg-[#23283a] rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedPlayer.numeros_favoritos.map((num, index) => (
                            <span key={index} className="bg-[#7c3bed] text-white px-3 py-1.5 rounded-lg text-sm font-mono font-bold">
                              {num}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}