import { useState } from "react";
import { BoltIcon, StarIcon, UserGroupIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { supabase } from "../api/supabaseClient";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [formType, setFormType] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("¡Inicio de sesión exitoso!");
      navigate("/");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      toast.error(signUpError.message);
      return;
    }

    if (signUpData.user) {
      // Create a new configuration
      const { data: configData, error: configError } = await supabase
        .from('t_configuraciones')
        .insert([{}])
        .select();

      if (configError) {
        toast.error(configError.message);
        return;
      }

      if (configData) {
        const configuracion_id = configData[0].id;

        // Create a new user in t_usuarios
        const { error: userError } = await supabase
          .from('t_usuarios')
          .insert([{
            id: signUpData.user.id,
            nombre,
            apellido,
            email,
            configuracion_id,
          }]);

        if (userError) {
          toast.error(userError.message);
        } else {
          toast.success("¡Registro exitoso! Por favor, revisa tu correo para verificar tu cuenta.");
          setFormType("login");
        }
      }
    }
  };

  // The PrivateRoute component now handles redirection if already authenticated.
  // This component should only be rendered if the user is not authenticated.
  // Therefore, no local storage check is needed here.

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181c24]">
      <div className="bg-[#20232e] rounded-2xl shadow-2xl p-10 w-full max-w-md border border-[#23283a]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#7c3bed] rounded-xl p-3 mb-2">
            <BoltIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">RifaPlus</h1>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2 text-center">{formType === 'login' ? '¡Bienvenido de nuevo!' : 'Crear una cuenta'}</h2>
        <p className="text-gray-400 text-center mb-4 text-sm">{formType === 'login' ? 'Inicia sesión en tu cuenta para continuar' : 'Completa los detalles para registrarte'}</p>
        <div className="flex justify-center gap-4 mb-6 text-xs">
          <span className="flex items-center gap-1 text-[#7c3bed]"><BoltIcon className="w-4 h-4" /> Instantáneo</span>
          <span className="flex items-center gap-1 text-yellow-400"><StarIcon className="w-4 h-4" /> Seguro</span>
          <span className="flex items-center gap-1 text-green-400"><UserGroupIcon className="w-4 h-4" /> Divertido</span>
        </div>
        <form className="space-y-5" onSubmit={formType === 'login' ? handleLogin : handleSignUp}>
          {formType === 'signup' && (
            <>
              <div>
                <label className="block text-white text-sm mb-1">Nombre</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition"
                  placeholder="Ingresa tu nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-1">Apellido</label>
                <input
                  type="text"
                  className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition"
                  placeholder="Ingresa tu apellido"
                  value={apellido}
                  onChange={e => setApellido(e.target.value)}
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-white text-sm mb-1">Correo electrónico</label>
            <input
              type="email"
              className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition"
              placeholder="Ingresa tu correo electrónico"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-white text-sm mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition pr-10"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          {formType === 'login' && (
            <div className="flex items-center justify-between text-xs text-gray-400">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2 accent-[#7c3bed]" />
                Recuérdame
              </label>
              <a href="#" className="text-[#7c3bed] hover:underline">¿Olvidaste tu contraseña?</a>
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] hover:from-[#6b2bd1] hover:to-[#b03be2] text-white font-semibold py-3 rounded-lg transition"
          >
            {formType === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
}