import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import { Rifas } from './pages/Rifas';
import { Tickets } from './pages/Tickets';
import Login from './pages/Login';
import { RecentRaffles } from "./components/RecentRaffles";
import { TopPlayers } from "./components/TopPlayers";
import { StatsCards } from "./components/StatsCards";
import { PlusIcon } from '@heroicons/react/24/outline';
import './App.css';
import { PrivateRoute } from "./components/PrivateRoute";
import NotFound from './pages/NotFound';
import { NuevaRifa } from "./pages/NuevaRifa";
import { EditarRifa } from "./pages/EditarRifa";
import { Jugadores } from "./pages/Jugadores";
import { useState, useEffect } from "react";
import { DetalleRifa } from "./pages/DetalleRifa";
import Analytics from "./pages/Analytics";
import { supabase } from "./api/supabaseClient";
import { Toaster } from 'sonner';
import Configuracion from "./pages/Configuracion";
import { PublicRifa } from "./pages/PublicRifa";
import { LoadingScreen } from "./components/LoadingScreen";
import Logo from "./assets/Logo RifasPlus.png"
// Dashboard page layout
function Dashboard() {
  const [raffles, setRaffles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaffles = async () => {
      const { data, error } = await supabase
        .from('vw_rifas')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching raffles:', error);
      } else {
        const formattedRaffles = data.map(raffle => ({
          icon: '🎟️', // Placeholder icon
          title: raffle.nombre,
          ticketsSold: raffle.tickets_vendidos,
          date: new Date(raffle.fecha_inicio).toLocaleDateString(),
          price: `${raffle.precio_ticket}`,
          status: raffle.estado,
          statusColor: raffle.estado === 'Activa' ? 'bg-green-500' : 'bg-red-500',
        }));
        setRaffles(formattedRaffles);
      }
      setLoading(false);
    };

    fetchRaffles();
  }, []);

  if (loading) {
    return <LoadingScreen message="Cargando panel de control..." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex mb-6 max-sm:flex-col min-md:flex-row min-md:items-center min-md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent">Panel de control</h1>
          <p className="text-gray-400">¡Bienvenido de nuevo! Aquí está lo que está sucediendo con tus rifas.</p>
        </div>
        <NavLink to="/rifas/nueva-rifa" className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white text-sm px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <PlusIcon className="w-5 h-5 inline-block mr-2" />
          Crear Rifa
        </NavLink>
      </div>
      <StatsCards />
      <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        <RecentRaffles raffles={raffles} />
        <TopPlayers />
      </div>
    </div>
  );
}

// Layout for authenticated pages
function MainLayout({ children, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="flex h-screen bg-[#0d1016] overflow-x-hidden">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col md:ml-64">
        <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

export const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="flex justify-center items-center  h-16 bg-[#0d1016] text-white  text-center p-4">
      <img className="w-16 object-contain" src={Logo} alt="" />
      <p className="text-xs">&copy; {year} Rifas Plus. Desarrollado por <a href="https://wa.me/584123397066">Rúbel Maneiro</a> y Sneider Araque</p>
    </footer>
  );
};


function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <Router>
      <Toaster richColors />
      <Routes>
        <Route path="/public-rifa/:id" element={<PublicRifa />} />
        {/* Login route - no sidebar/navbar */}
        <Route path="/login" element={<Login />} />

        {/* Main app routes - with sidebar/navbar */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Dashboard />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Home />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rifas"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Rifas />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/jugadores"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Jugadores />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Tickets />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rifas/nueva-rifa"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <NuevaRifa />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rifas/editar/:id"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <EditarRifa />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/detalle-rifa/:id"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <DetalleRifa />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Analytics />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/configuracion"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Configuracion />
                <Footer />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={
          <PrivateRoute>
            <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
              <NotFound />
                <Footer />
            </MainLayout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;