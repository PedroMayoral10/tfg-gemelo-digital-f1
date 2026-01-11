import { useEffect, useState, useMemo } from 'react';
import { URL_API_BACKEND } from "../../config";

// Función para escalar coordenadas
const mapCoordinates = (val, min, max, size) => {
  return ((val - min) / (max - min)) * size;
};

export default function CircuitMap({ active, trigger }) {

  // --- ESTADOS ---
   const [trackPoints, setTrackPoints] = useState([]); 
  const [carPosition, setCarPosition] = useState(null); 
  const [bounds, setBounds] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 }); 
  const [loadingMap, setLoadingMap] = useState(false); 

  // --- EFECTO 1: CARGAR TRAZADO ---
  useEffect(() => {

    if (!active) {
        setTrackPoints([]); 
        return;
    }

    setLoadingMap(true);
    fetch(`${URL_API_BACKEND}/location/track-data`) // Obtenemos los puntos del circuito del backend
      .then(res => {
        if (!res.ok) throw new Error("Esperando datos del circuito...");
        return res.json();
      })
      .then(data => {
        if (data.length > 0) {
            const xValues = data.map(p => p.x);
            const yValues = data.map(p => p.y);
            setBounds({ // Calculamos los límites del circuito
                minX: Math.min(...xValues),
                maxX: Math.max(...xValues),
                minY: Math.min(...yValues),
                maxY: Math.max(...yValues)
            });
            setTrackPoints(data); // Guardamos los puntos del circuito
        }
        setLoadingMap(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingMap(false);
      });
  }, [active, trigger]); // Dependemos de active y trigger que vienen del padre (CircuitoInteractivo)

  // --- EFECTO 2: Mover el coche y limpiar el intervalo del componente ---
  useEffect(() => {
    if (!active) return;

    // Arrancamos el bucle del navegador cada 270ms para pedir la posición del coche (límite API)
    const interval = setInterval(() => {
      fetch(`${URL_API_BACKEND}/location/current`)
        .then(res => res.json())
        .then(data => {
          if (data && data.x) setCarPosition(data);
        })
        .catch(err => console.error(err));
    }, 270);

    // Limpieza del intervalo al desmontar el componente o cambiar active
    return () => {
      clearInterval(interval);
    };
  }, [active]);


  // --- DIBUJO SVG DEL CIRCUITO ---
  const svgSize = 800; 
  const padding = 50;

  // Trazado del circuito 
  const polylinePoints = useMemo(() => {
      return trackPoints.map(p => {
        const x = mapCoordinates(p.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding; // Añadimos padding para no pegarse a los bordes
        const y = svgSize - (mapCoordinates(p.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding); // Invertimos el eje Y para que coincida con el SVG
        return `${x},${y}`;
      }).join(" ");
  }, [trackPoints, bounds]); 

  // Coordenadas del coche
  const getCarCoords = () => {
      if (!carPosition) return { x: 0, y: 0 };
      const x = mapCoordinates(carPosition.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding; 
      const y = svgSize - (mapCoordinates(carPosition.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
      return { x, y };
  };

  const carCoords = getCarCoords(); 

  return (
    <div
      className="card h-100 w-100 position-relative d-flex justify-content-center align-items-center bg-black border-danger shadow overflow-hidden"
      style={{ borderWidth: '2px', borderRadius: '15px' }}
    >
      {!active && (
        <div className="text-secondary z-1">Selecciona una sesión para comenzar</div>
      )}

      {active && loadingMap && (
        <div className="spinner-border text-danger z-1" role="status"></div>
      )}

      {active && !loadingMap && trackPoints.length > 0 && (

        <svg
          viewBox={`0 0 ${svgSize} ${svgSize}`}
          preserveAspectRatio="xMidYMid meet" 
          style={{ 
            position: 'absolute', 
            top: 0,
            left: 0,
            width: '100%',        
            height: '100%',       
            display: 'block'
          }}
        >
          {/* Trazado grueso (Borde exterior) */}
          <polyline 
            points={polylinePoints} 
            fill="none" 
            stroke="#333" 
            strokeWidth="14" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* Trazado fino (Interior) */}
          <polyline 
            points={polylinePoints} 
            fill="none" 
            stroke="#222" 
            strokeWidth="8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          
          {/* El coche */}
          {carPosition && (
            <g
              style={{
                transform: `translate(${carCoords.x}px, ${carCoords.y}px)`,
                transition: "transform 300ms linear"
              }}
            >
              <circle r="20" fill="none" stroke="#e10600" strokeWidth="1" opacity="0.6">
                <animate attributeName="r" from="5" to="30" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle r="6" fill="#e10600" stroke="white" strokeWidth="2" />
            </g>
          )}
        </svg>
      )}

      {/* Etiqueta inferior (z-1 para estar por encima del mapa) */}
      <div className="position-absolute bottom-0 w-100 text-center pb-3 text-white-50 small z-1" style={{pointerEvents: 'none'}}>
        CIRCUITO ACTIVO
      </div>
    </div>
  );
}