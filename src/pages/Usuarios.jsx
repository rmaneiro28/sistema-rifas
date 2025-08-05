const Usuarios = () => {
    return (
      <section>
        <h2 className="text-2xl font-bold mb-4">Usuarios / Jugadores</h2>
        <p className="text-gray-200 mb-2">
          Administra los jugadores que participan en las rifas.
        </p>
        {/* Aquí irá el listado de usuarios y acciones */}
        <div className="rounded bg-primary/80 p-6 border border-white/10 text-center">
          <span className="text-gray-400">No hay usuarios registrados aún.</span>
        </div>
      </section>
    );
  };
  
  export default Usuarios;