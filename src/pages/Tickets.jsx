const Tickets = () => {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-4">Tickets</h2>
        <p className="text-gray-200 mb-2">
          Consulta y gestiona los tickets de cada rifa y usuario.
        </p>
        {/* Aquí irá el listado de tickets y acciones */}
        <div className="rounded bg-primary/80 p-6 border border-white/10 text-center">
          <span className="text-gray-400">No hay tickets registrados aún.</span>
        </div>
      </section>
    );
  };
  
  export default Tickets;