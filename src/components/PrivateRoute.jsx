import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingScreen } from "./LoadingScreen";

export function PrivateRoute({ children }) {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  return session ? children : <Navigate to="/login" replace />;
}