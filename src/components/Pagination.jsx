export function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange, loading }) {
  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[#0f131b] border-t border-[#23283a]">
      <span className="text-sm text-gray-400">
        Mostrando {Math.min((currentPage - 1) * pageSize + 1, totalItems)} - {Math.min(currentPage * pageSize, totalItems)} de {totalItems} jugadores
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
          disabled={currentPage === 1 || loading}
          className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-[#23283a] text-white border-[#7c3bed] hover:bg-[#7c3bed]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Anterior
        </button>
        <span className="text-sm text-white">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || loading}
          className="px-3 py-1.5 rounded-lg border text-xs font-semibold bg-[#23283a] text-white border-[#7c3bed] hover:bg-[#7c3bed]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}