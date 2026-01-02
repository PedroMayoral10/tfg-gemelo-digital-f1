import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import SessionSelector from './SeleccionSesion'; 
import { URL_API_BACKEND } from "../config";

// Función para escalar coordenadas
const mapCoordinates = (val, min, max, size) => {
  return ((val - min) / (max - min)) * size;
};

export default function CircuitMap() {

  // --- ESTADOS ---
  // AÑADIDO: Semáforo para saber si hemos dado al botón START
  const [simulationActive, setSimulationActive] = useState(false);

  const [trackPoints, setTrackPoints] = useState([]); 
  const [carPosition, setCarPosition] = useState(null); 
  const [bounds, setBounds] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 }); 
  const [loadingMap, setLoadingMap] = useState(false); // Renombrado a loadingMap para ser más específico
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Estado para forzar re-renderizado si es necesario

  // --- EFECTO 1: CARGAR TRAZADO ---
  // MODIFICADO: Ahora depende de [simulationActive]
  useEffect(() => {
    // Si la simulación NO está activa, no hacemos nada (protección)
    if (!simulationActive) return;

    setLoadingMap(true);
    fetch(`${URL_API_BACKEND}/location/track-data`)
      .then(res => {
        if (!res.ok) throw new Error("Esperando datos del circuito...");
        return res.json();
      })
      .then(data => {
        if (data.length > 0) {
            const xValues = data.map(p => p.x);
            const yValues = data.map(p => p.y);
            setBounds({
                minX: Math.min(...xValues),
                maxX: Math.max(...xValues),
                minY: Math.min(...yValues),
                maxY: Math.max(...yValues)
            });
            setTrackPoints(data);
            // Quitamos el toast de éxito aquí para no saturar, el usuario ya ve el mapa
        }
        setLoadingMap(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingMap(false);
      });
  }, [simulationActive, refreshTrigger]); // <--- Se ejecuta cuando cambia simulationActive

  // --- EFECTO 2: POLLING (MOVER COCHE) ---
  // MODIFICADO: Ahora depende de [simulationActive]
  useEffect(() => {
    if (!simulationActive) return;

    const interval = setInterval(() => {
        fetch(`${URL_API_BACKEND}/location/current`)
            .then(res => res.json())
            .then(data => {
                if(data && data.x) setCarPosition(data);
            })
            .catch(err => console.error(err));
    }, 270); 
    
    return () => clearInterval(interval);
  }, [simulationActive]);


  // --- DIBUJO SVG ---
  const svgSize = 800; 
  const padding = 50;

  const polylinePoints = useMemo(() => {
      return trackPoints.map(p => {
        const x = mapCoordinates(p.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding;
        const y = svgSize - (mapCoordinates(p.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
        return `${x},${y}`;
      }).join(" ");
  }, [trackPoints, bounds]);

  const getCarCoords = () => {
      if (!carPosition) return { x: 0, y: 0 };
      const x = mapCoordinates(carPosition.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding;
      const y = svgSize - (mapCoordinates(carPosition.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
      return { x, y };
  };

  const carCoords = getCarCoords();

  return (
    // AÑADIDO: Contenedor Flex vertical para poner el panel arriba y el mapa abajo
    <div className="d-flex flex-column h-100 w-100">
      
      {/* 1. SECCIÓN SUPERIOR: SELECTOR DE SESIÓN */}
      <div className="container-fluid pt-3 px-4">
        <SessionSelector
          onStartSimulation={() => {
            setTrackPoints([]); // <--- 1. Limpiamos el mapa viejo visualmente
            setSimulationActive(true);
            setRefreshTrigger(prev => prev + 1); // <--- 2. FORZAMOS que el useEffect se dispare
          }}
        />
      </div>

      {/* 2. SECCIÓN INFERIOR: MAPA */}
      <div className="flex-grow-1 position-relative d-flex justify-content-center align-items-center bg-black m-4 rounded border border-secondary overflow-hidden">
        
        {/* Caso A: No ha empezado */}
        {!simulationActive && (
             <div className="text-zinc-500">Selecciona una sesión arriba para comenzar</div>
        )}

        {/* Caso B: Cargando mapa */}
        {simulationActive && loadingMap && (
             <div className="text-white spinner-border" role="status"></div>
        )}

        {/* Caso C: Mapa listo */}
        {simulationActive && !loadingMap && trackPoints.length > 0 && (
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${svgSize} ${svgSize}`} 
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Trazado Base */}
            <polyline 
                points={polylinePoints} 
                fill="none" 
                stroke="#333" 
                strokeWidth="14" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            {/* Línea interior para efecto asfalto */}
            <polyline 
                points={polylinePoints} 
                fill="none" 
                stroke="#222" 
                strokeWidth="8" 
                strokeLinecap="round" 
                strokeLinejoin="round"
            />

            {/* Coche */}
            {carPosition && (
                <g transform={`translate(${carCoords.x}, ${carCoords.y})`}>
                    {/* Efecto Radar (Onda expansiva) */}
                    <circle r="20" fill="none" stroke="#e10600" strokeWidth="1" opacity="0.6">
                        <animate attributeName="r" from="5" to="30" dur="1.5s" repeatCount="indefinite"/>
                        <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite"/>
                    </circle>
                    {/* Punto del coche (Rojo F1) */}
                    <circle r="6" fill="#e10600" stroke="white" strokeWidth="2" />
                </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}