import { useState } from "react";
import { BoltIcon, StarIcon, UserGroupIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LogoRifaPlus from "../assets/Logo RifasPlus.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await login(username, password);
    if (!error) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181c24]">
      <div className="bg-[#20232e] rounded-2xl shadow-2xl p-10 w-full max-w-md border border-[#23283a]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#7c3bed] rounded-xl mb-2 p-2">
            <img src={LogoRifaPlus} alt="Logo de RifaPlus" className="w-20 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">RifaPlus</h1>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2 text-center">¡Bienvenido de nuevo!</h2>
        <p className="text-gray-400 text-center mb-4 text-sm">Inicia sesión en tu cuenta para continuar</p>
        <div className="flex justify-center gap-4 mb-6 text-xs">
          <span className="flex items-center gap-1 text-[#7c3bed]"><BoltIcon className="w-4 h-4" /> Instantáneo</span>
          <span className="flex items-center gap-1 text-yellow-400"><StarIcon className="w-4 h-4" /> Seguro</span>
          <span className="flex items-center gap-1 text-green-400"><UserGroupIcon className="w-4 h-4" /> Divertido</span>
        </div>
        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-white text-sm mb-1">Usuario</label>
            <input
              type="text"
              className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
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
          <div className="flex items-center justify-between text-xs text-gray-400">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 accent-[#7c3bed]" />
              Recuérdame
            </label>
            <a href="#" className="text-[#7c3bed] hover:underline">¿Olvidaste tu contraseña?</a>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] hover:from-[#6b2bd1] hover:to-[#b03be2] text-white font-semibold py-3 rounded-lg transition"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}