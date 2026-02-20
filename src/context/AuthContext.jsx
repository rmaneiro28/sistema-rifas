
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
      let email = "";

      // 1. Try to get email via Secure RPC Function (Recommended for Zero Trust)
      const { data: emailFromRpc, error: rpcError } = await supabase
        .rpc('get_user_email_by_username', { p_username: username });

      if (!rpcError && emailFromRpc) {
        email = emailFromRpc;
        console.log("Email retrieved via Secure RPC");
      } else {
        // 2. Fallback: Try direct query (Will fail if RLS is strict and no policy allows public read)
        console.warn("RPC failed or not found, attempting direct query (may fail with 406 if RLS is strict)", rpcError);
        const { data: user, error: userError } = await supabase
          .from('t_usuarios')
          .select('email')
          .eq('username', username)
          .single();

        if (userError || !user) {
          throw new Error('Usuario no encontrado o acceso denegado por políticas de seguridad.');
        }
        email = user.email;
      }

      // 3. Authenticate directly with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (!data.session) {
        throw new Error('No se pudo establecer la sesión.');
      }

      // 4. Once authenticated, fetch the user profile securely (RLS allows reading own row)
      const { data: userProfile, error: profileError } = await supabase
        .from('t_usuarios')
        .select('empresa_id')
        .eq('auth_id', data.user.id) // Use the auth_id from the session
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new Error('No se pudo cargar el perfil del usuario.');
      }

      if (!userProfile?.empresa_id) {
        throw new Error('El usuario no tiene una empresa asignada.');
      }

      localStorage.setItem('empresa_id', userProfile.empresa_id);
      setEmpresaId(userProfile.empresa_id);
      toast.success('¡Inicio de sesión exitoso!');
      return { data };
    } catch (error) {
      console.error("Login error:", error);
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
