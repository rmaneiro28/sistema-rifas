import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import { Rifas} from './pages/Rifas';
import Tickets from './pages/Tickets';
import Login from './pages/Login';
import { RecentRaffles } from "./components/RecentRaffles";
import { TopPlayers } from "./components/TopPlayers";
import { StatsCards } from "./components/StatsCards";
import { PlusIcon } from '@heroicons/react/24/outline';
import './App.css';
import { PrivateRoute } from "./components/PrivateRoute";
import NotFound from './pages/NotFound';
import { NuevaRifa } from "./pages/NuevaRifa";
import { Jugadores } from "./pages/Jugadores";
import { useState } from "react";

// Dashboard page layout
function Dashboard() {
  return (
    <>
      <div className="flex items-center justify-between mb-8 tracking-wider">
        <div>
          <h1 className="bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] bg-clip-text text-transparent text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome back! Here's what's happening with your raffles.</p>
        </div>
        <button className="bg-[#7c3bed] hover:bg-[#6b2bd1] text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors">
          <PlusIcon className="w-5 h-5" />
          <span className="font-medium">Create Raffle</span>
        </button>
      </div>
      <StatsCards />
      <div className="grid max-md:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        <RecentRaffles />
        <TopPlayers />
      </div>
    </>
  );
}

// Layout for authenticated pages
function MainLayout({ children, sidebarOpen, setSidebarOpen }) {
  return (
    <div className="flex h-screen bg-[#0f1419]">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <Router>
      <Routes>
        {/* Login route - no sidebar/navbar */}
        <Route path="/login" element={<Login />} />

        {/* Main app routes - with sidebar/navbar */}
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                <Dashboard />
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
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={
          <PrivateRoute>
            <MainLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
              <NotFound />
            </MainLayout>
          </PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;