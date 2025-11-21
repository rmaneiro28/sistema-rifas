import React, { forwardRef } from 'react';

export const TicketSummaryGrid = forwardRef(({ rifa, tickets, empresaLogo, systemLogo }, ref) => {
    if (!rifa || !tickets) return null;

    // Helper for styles to ensure html2canvas compatibility (avoiding oklch from tailwind v4)
    const styles = {
        container: { backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' },
        headerContainer: {
            backgroundColor: '#1a1f2e',
            padding: '30px',
            borderRadius: '20px 20px 0 0',
            marginBottom: '30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        headerLeft: { textAlign: 'left' },
        headerRight: { textAlign: 'right' },
        headerTitle: { color: '#ffffff', fontSize: '48px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '-1px', lineHeight: '1' },
        headerStats: { display: 'flex', gap: '20px', color: '#9ca3af', fontSize: '20px', fontWeight: '600' },
        headerSubtitle: { color: '#ffffff', fontSize: '24px', fontWeight: '700', marginBottom: '5px' },
        headerDate: { color: '#6b7280', fontSize: '16px' },

        textBlack: { color: '#1f2937' },

        grid: {
            disponible: { backgroundColor: '#f9fafb', color: '#9ca3af', border: '1px solid #e5e7eb' },
            occupied: { backgroundColor: '#3b82f6', color: '#ffffff', border: '1px solid #2563eb' }, // Blue for all occupied
        },
        footer: {
            borderTop: '1px solid #e5e7eb',
            marginTop: '40px',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#9ca3af',
            fontSize: '18px',
            fontWeight: '500'
        }
    };

    return (
        <div
            ref={ref}
            className="p-8 w-[1800px] mx-auto"
            style={styles.container}
        >
            {/* Header */}
            <div style={styles.headerContainer}>
                <div style={styles.headerLeft}>
                    <h1 style={styles.headerTitle}>
                        {rifa.nombre}
                    </h1>
                    <div style={styles.headerStats}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>🎟️</span> {tickets.length} Tickets
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '24px' }}>💰</span> ${rifa.precio_ticket} / Ticket
                        </span>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <h2 style={styles.headerSubtitle}>Resumen de Tickets</h2>
                    <div style={styles.headerDate}>
                        {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(25, 1fr)' }}>
                {tickets.map((ticket) => {
                    const isOccupied = ticket.estado_ticket !== 'disponible';
                    const ticketStyle = isOccupied ? styles.grid.occupied : styles.grid.disponible;

                    return (
                        <div
                            key={ticket.numero_ticket}
                            className="flex items-center justify-center rounded-sm"
                            style={{
                                ...ticketStyle,
                                height: '60px', // Increased height for better visibility
                                fontSize: '24px', // Larger font size
                                fontWeight: '900', // Extra bold
                            }}
                        >
                            {ticket.numero_ticket}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {empresaLogo && (
                        <img src={empresaLogo} alt="Logo Empresa" style={{ height: '50px', objectFit: 'contain' }} />
                    )}
                    <span>{rifa.nombre}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span>Generado por Sistema de Rifas</span>
                    {systemLogo && (
                        <img src={systemLogo} alt="Logo Sistema" style={{ height: '40px', objectFit: 'contain', opacity: 0.8 }} />
                    )}
                </div>
            </div>
        </div>
    );
});

TicketSummaryGrid.displayName = 'TicketSummaryGrid';
