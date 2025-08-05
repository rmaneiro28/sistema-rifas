const kpis = [
    { label: "Rifas activas", value: 2 },
    { label: "Total de usuarios", value: 15 },
    { label: "Tickets vendidos", value: 45 },
    { label: "Tickets disponibles", value: 55 },
  ];
  
  const rifasActivas = [
    {
      nombre: "Rifa de Televisor",
      fecha_cierre: "2025-08-15",
      total_tickets: 50,
      estado: "Activa",
    },
    {
      nombre: "Rifa de Bicicleta",
      fecha_cierre: "2025-09-01",
      total_tickets: 50,
      estado: "Activa",
    },
  ];
  
  const Home = () => {
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
            <span className="text-3xl font-extrabold text-primary">{kpi.value}</span>
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
                key={rifa.nombre}
                className="bg-white rounded-lg p-4 border border-primary/10 shadow hover:shadow-lg transition-all duration-200"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-primary">{rifa.nombre}</span>
                  <span className="text-xs px-2 py-1 rounded bg-primary text-white">
                    {rifa.estado}
                  </span>
                </div>
                <div className="text-gray-500 text-sm">
                  Cierra: {rifa.fecha_cierre}
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Tickets: {rifa.total_tickets}
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