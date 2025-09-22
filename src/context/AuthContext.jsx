
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../api/supabaseClient';
import { toast } from 'sonner';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const storedEmpresaId = localStorage.getItem('empresa_id');
        if (storedEmpresaId) {
          setEmpresaId(storedEmpresaId);
        }
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const storedEmpresaId = localStorage.getItem('empresa_id');
        if (storedEmpresaId) {
          setEmpresaId(storedEmpresaId);
        }
      } else {
        localStorage.removeItem('empresa_id');
        setEmpresaId(null);
        setEmpresa(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchEmpresa = async () => {
      if (empresaId) {
        try {
          const { data, error } = await supabase
            .from('t_empresas')
            .select('nombre_empresa, logo_url')
            .eq('id_empresa', empresaId)
            .single();

          if (error) {
            throw error;
          }
          setEmpresa(data);
        } catch (error) {
          console.error('Error fetching empresa data:', error);
          toast.error('Error al cargar los datos de la empresa');
        }
      }
    };

    fetchEmpresa();
  }, [empresaId]);

  const login = async (username, password) => {
    try {
      const { data: user, error: userError } = await supabase
        .from('t_usuarios')
        .select('email, empresa_id')
        .eq('username', username)
        .single();

      if (userError || !user) {
        throw new Error('Usuario no encontrado');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        throw error;
      }

      localStorage.setItem('empresa_id', user.empresa_id);
      setEmpresaId(user.empresa_id);
      toast.success('¡Inicio de sesión exitoso!');
      return { data };
    } catch (error) {
      toast.error(error.message || 'Error al iniciar sesión');
      return { error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('empresa_id');
    setEmpresaId(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider value={{ session, empresaId, empresa, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
