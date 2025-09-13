import { useEffect, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  // useLayoutEffect se ejecuta antes de que el DOM se pinte
  useLayoutEffect(() => {
    // Pequeño retraso para asegurar que el DOM esté listo
    const timer = setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant' // 'instant' en lugar de 'smooth' para evitar animaciones
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  // useEffect adicional como respaldo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.scrollY > 0) {
        window.scrollTo({
          top: 0,
          left: 0,
          behavior: 'instant'
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [pathname]);

  return null;
}

export default ScrollToTop;
