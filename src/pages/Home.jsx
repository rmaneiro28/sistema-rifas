import { useEffect, useState } from "react";
import { supabase } from "../api/supabaseClient";

const Home = () => {
  const [kpis, setKpis] = useState([
    { label: "Rifas activas", value: 0 },
    { label: "Total de usuarios", value: 0 },
    { label: "Tickets vendidos", value: 0 },
    { label: "Tickets disponibles", value: 0 },
  ]);
  const [rifasActivas, setRifasActivas] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch active raffles
      const { data: rifas, error: rifasError } = await supabase
        .from("rifas")
        .select("*")
        .eq("estado", "Activa");

      if (rifasError) {
        console.error("Error fetching rifas:", rifasError);
        return;
      }

      setRifasActivas(rifas);

      // Fetch total players
      const { data: jugadores, error: jugadoresError } = await supabase
        .from("t_jugadores")
        .select("id", { count: "exact" });

      if (jugadoresError) {
        console.error("Error fetching jugadores:", jugadoresError);
        return;
      }

      // Fetch sold tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("id", { count: "exact" });

      if (ticketsError) {
        console.error("Error fetching tickets:", ticketsError);
        return;
      }

      const totalTickets = rifas.reduce(
        (acc, rifa) => acc + rifa.numero_tickets,
        0
      );
      const ticketsVendidos = tickets.length;
      const ticketsDisponibles = totalTickets - ticketsVendidos;

      setKpis([
        { label: "Rifas activas", value: rifas.length },
        { label: "Total de usuarios", value: jugadores.length },
        { label: "Tickets vendidos", value: ticketsVendidos },
        { label: "Tickets disponibles", value: ticketsDisponibles },
      ]);
    };

    fetchData();
  }, []);

  return (
    <section>
      <h2 className="text-3xl font-bold mb-6 text-center">Dashboard</h2>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center border border-primary/10 hover:shadow-xl transition-all duration-200"
          >
            <span className="text-3xl font-extrabold text-primary">
              {kpi.value}
            </span>
            <span className="text-gray-500 text-sm mt-1">{kpi.label}</span>
          </div>
        ))}
      </div>
      {/* Rifas activas */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Rifas activas</h3>
        {rifasActivas.length === 0 ? (
          <div className="rounded bg-primary/80 p-6 border border-white/10 text-center text-gray-400">
            No hay rifas activas.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rifasActivas.map((rifa) => (
              <div
                key={rifa.id}
                className="bg-white rounded-lg p-4 border border-primary/10 shadow hover:shadow-lg transition-all duration-200"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-primary">
                    {rifa.nombre}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-primary text-white">
                    {rifa.estado}
                  </span>
                </div>
                <div className="text-gray-500 text-sm">
                  Cierra: {new Date(rifa.fecha_fin).toLocaleDateString()}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Tickets: {rifa.numero_tickets}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Home;