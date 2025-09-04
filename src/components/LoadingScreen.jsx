import Logo from './.././assets/Logo RifasPlus.png';
export function LoadingScreen({ message = "Cargando..." }) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0f131b]">
            <div className="text-center flex flex-col items-center">
                {/* Logo Animation */}
                <div className="relative w-32 h-32 mb-6">
                    {/* Outer static ring */}
                    <div className="absolute inset-0 border-2 border-purple-500/20 rounded-full"></div>
                    {/* Inner spinning ring */}
                    <div
                        className="absolute inset-2 border-t-2 border-pink-500 rounded-full"
                        style={{ animation: 'spin 1.5s linear infinite' }}
                    ></div>
                    {/* Text Logo */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <img src={Logo} alt="" />
                        </div>
                    </div>
                </div>
                <p className="text-white/80 text-lg tracking-widest animate-pulse">{message}</p>
            </div>
        </div>
    );
}

