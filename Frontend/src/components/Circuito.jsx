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
      // Usamos h-100 para que ocupe toda la altura que le da App.js
      <div className="container-fluid h-100 py-3">
        <div className="row h-100">

          {/* --- COLUMNA IZQUIERDA: EL MAPA --- */}
          <div className="col-lg-9 h-100 mb-3 mb-lg-0">
            <div
              className="card h-100 w-100 position-relative d-flex justify-content-center align-items-center bg-black border-danger shadow overflow-hidden"
              style={{ borderWidth: '2px', borderRadius: '15px' }} // <-- Estilos añadidos para igualar al derecho
            >

              {!simulationActive && (
                <div className="text-secondary">Selecciona una sesión para comenzar</div>
              )}

              {simulationActive && loadingMap && (
                <div className="spinner-border text-danger" role="status"></div>
              )}

              {simulationActive && !loadingMap && trackPoints.length > 0 && (
                // El SVG se adapta al contenedor
                <svg
                  width="95%"
                  height="95%"
                  viewBox={`0 0 ${svgSize} ${svgSize}`}
                  preserveAspectRatio="xMidYMid meet"
                  style={{ maxHeight: '80vh' }} // Límite de seguridad
                >
                  <polyline points={polylinePoints} fill="none" stroke="#333" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={polylinePoints} fill="none" stroke="#222" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                  {carPosition && (
                    <g transform={`translate(${carCoords.x}, ${carCoords.y})`}>
                      <circle r="20" fill="none" stroke="#e10600" strokeWidth="1" opacity="0.6">
                        <animate attributeName="r" from="5" to="30" dur="1.5s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle r="6" fill="#e10600" stroke="white" strokeWidth="2" />
                    </g>
                  )}
                </svg>
              )}

              <div className="position-absolute bottom-0 w-100 text-center pb-3 text-white-50 small">
                {/* Aquí puedes poner variables si las tienes disponibles */}
                CIRCUITO DE cambiar nombre
              </div>
            </div>
          </div>


          {/* --- COLUMNA DERECHA: CONFIGURACIÓN --- */}
          <div className="col-lg-3 h-100">
            <div className="card h-100 bg-black border-danger shadow" style={{ borderWidth: '2px', borderRadius: '15px' }}>
              <div className="card-body p-4 d-flex flex-column">

                {/* Título */}
                <h5 className="text-white mb-4 fw-bold text-uppercase border-bottom border-secondary pb-2">
                  Configuración
                </h5>

                {/* Aquí va tu SessionSelector (que ahora es vertical gracias al Paso 1) */}
                <div className="mb-4">
                  <SessionSelector
                    onStartSimulation={() => {
                      setTrackPoints([]);
                      setSimulationActive(true);
                      setRefreshTrigger(prev => prev + 1);
                    }}
                  />
                </div>

                {/* Datos Extra (Relleno para que no quede vacío abajo) */}
                <div className="mt-auto text-white-50">
                  <small>Estado del sistema</small>
                  <div className="d-flex align-items-center gap-2 mt-1 text-success">
                    <div className="spinner-grow spinner-grow-sm" role="status"></div>
                    <span>Sistema Online</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
  );
}