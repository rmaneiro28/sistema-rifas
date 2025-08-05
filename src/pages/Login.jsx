import { useState } from "react";
import { BoltIcon, StarIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("admin@admin.com");
    const [password, setPassword] = useState("admin");
    const navigate = useNavigate();
  
    const handleSubmit = (e) => {
      e.preventDefault();
      // Aquí puedes poner la lógica real de autenticación
      if (email === "admin@admin.com" && password === "admin") {
        localStorage.setItem("token", "demo-token");
        navigate("/");
      } else {
        alert("Invalid credentials");
      }
    };
  
    // Si ya está autenticado, redirige al dashboard
    if (localStorage.getItem("token")) {
      navigate("/");
      return null;
    }
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181c24]">
      <div className="bg-[#20232e] rounded-2xl shadow-2xl p-10 w-full max-w-md border border-[#23283a]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#7c3bed] rounded-xl p-3 mb-2">
            <BoltIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">RaffleHub</h1>
        </div>
        <h2 className="text-white text-xl font-semibold mb-2 text-center">Welcome back!</h2>
        <p className="text-gray-400 text-center mb-4 text-sm">Sign in to your account to continue</p>
        <div className="flex justify-center gap-4 mb-6 text-xs">
          <span className="flex items-center gap-1 text-[#7c3bed]"><BoltIcon className="w-4 h-4" /> Instant</span>
          <span className="flex items-center gap-1 text-yellow-400"><StarIcon className="w-4 h-4" /> Secure</span>
          <span className="flex items-center gap-1 text-green-400"><UserGroupIcon className="w-4 h-4" /> Fun</span>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-white text-sm mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-white text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg bg-[#181c24] border border-[#23283a] px-4 py-3 text-white focus:outline-none focus:border-[#7c3bed] transition"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2 accent-[#7c3bed]" />
              Remember me
            </label>
            <a href="#" className="text-[#7c3bed] hover:underline">Forgot password?</a>
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-[#7c3bed] to-[#d54ff9] hover:from-[#6b2bd1] hover:to-[#b03be2] text-white font-semibold py-3 rounded-lg transition"
          >
            Sign In
          </button>
        </form>
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[#23283a]" />
          <span className="mx-4 text-gray-500 text-xs">OR CONTINUE WITH</span>
          <div className="flex-grow border-t border-[#23283a]" />
        </div>
        <div className="flex gap-4">
          <button className="flex-1 flex items-center justify-center gap-2 bg-[#181c24] border border-[#23283a] rounded-lg py-2 text-white hover:bg-[#23283a] transition">
            <span className="text-[#7c3bed] font-bold">G</span> Google
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-[#181c24] border border-[#23283a] rounded-lg py-2 text-white hover:bg-[#23283a] transition">
            <span className="text-[#7c3bed] font-bold">f</span> Facebook
          </button>
        </div>
        <div className="mt-6 text-center text-gray-400 text-sm">
          Don't have an account? <a href="#" className="text-[#7c3bed] hover:underline">Sign up</a>
        </div>
      </div>
    </div>
  );
}