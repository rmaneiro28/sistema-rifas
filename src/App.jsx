import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import { Rifas} from './pages/Rifas';
import {Usuarios} from './pages/Usuarios';
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

// Dashboard page layout
function Dashboard() {
  return (
    <>
      <div className="flex items-center justify-between mb-8 tracking-wider">
        <div>
          <h1 className="text-[#7c3bed] text-3xl font-bold mb-2">Dashboard</h1>
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
function MainLayout({ children }) {
  return (
    <div className="flex h-screen bg-[#0f1419]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function App() {
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
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <MainLayout>
                <Home />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rifas"
          element={
            <PrivateRoute>
              <MainLayout>
                <Rifas />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/players"
          element={
            <PrivateRoute>
              <MainLayout>
                <Usuarios />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <PrivateRoute>
              <MainLayout>
                <Tickets />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route
          path="/rifas/nueva-rifa"
          element={
            <PrivateRoute>
              <MainLayout>
                <NuevaRifa />
              </MainLayout>
            </PrivateRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;