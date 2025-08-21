import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../api/supabaseClient";

export function PrivateRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  return session ? children : <Navigate to="/login" replace />;
}