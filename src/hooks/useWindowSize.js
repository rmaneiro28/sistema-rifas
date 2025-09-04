import { useState, useEffect } from 'react';

/**
 * Un hook personalizado que devuelve las dimensiones actuales de la ventana.
 * @returns {{width: number, height: number}} Objeto con el ancho y alto de la ventana.
 */
export const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        }
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return windowSize;
};