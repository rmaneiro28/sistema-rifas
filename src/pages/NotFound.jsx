import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl text-[#d54ff9] font-bold mb-4">404</h1>
        <p className="text-xl text-white mb-4">Oops! Page not found</p>
        <a href="/" className="text-[#fff] hover:text-[#d54ff9] underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
