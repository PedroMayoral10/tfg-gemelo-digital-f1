import { useEffect, useState, useMemo, useRef } from 'react';
import { URL_API_BACKEND } from "../../config";

const mapCoordinates = (val, min, max, size) => {
  return ((val - min) / (max - min)) * size;
};

export default function Circuito({ active, trigger, followedDriver, drivers, setRaceData, driverStatus = [] }) {
  const [trackPoints, setTrackPoints] = useState([]);
  const [allPositions, setAllPositions] = useState({}); 
  const [bounds, setBounds] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
  const [loadingMap, setLoadingMap] = useState(false);
  const svgSize = 800;
  const padding = 50;
  const lastKnownPositions = useRef({}); // Memoria para evitar que los coches desaparezcan si la API deja de enviarlos
  const activeDriversRef = useRef([]); // Mantener los pilotos de la carrera actual "congelados"

  const driverColours = useMemo(() => {
    const map = {};
    activeDriversRef.current.forEach(d => {
      map[d.driver_number] = d.team_colour ? `#${d.team_colour}` : "#ffffff";
    });
    return map;
  }, [activeDriversRef.current, drivers]);

  // Efecto para limpiar datos al pulsar START y congelar pilotos evitando que al cambiar de año sin dar a START desaparezcan
  useEffect(() => {
    lastKnownPositions.current = {};
    setAllPositions({});
    
    if (active && drivers && drivers.length > 0) {
        activeDriversRef.current = drivers;
    }
  }, [trigger]); 

  // Actualizar pilotos activos si la lista llega después del trigger 
  useEffect(() => {
    if (active && drivers && drivers.length > 0 && activeDriversRef.current.length === 0) {
        activeDriversRef.current = drivers;
    }
  }, [drivers, active]);

  // Carga del trazado estático
  useEffect(() => {
    if (!active) {
      setTrackPoints([]);
      return;
    }

    const cargarTrazado = async () => {
      try {
        setLoadingMap(true);
        const res = await fetch(`${URL_API_BACKEND}/location/track-data`);
        if (!res.ok) {
          setTimeout(cargarTrazado, 2000);
          return;
        }

        const data = await res.json();
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
          setLoadingMap(false);
        }
      } catch (err) {
        console.error("Error cargando trazado:", err);
        setTimeout(cargarTrazado, 3000);
      }
    };

    cargarTrazado();
  }, [active, trigger]);

  // Intervalo para obtener posiciones actuales y race_table
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      fetch(`${URL_API_BACKEND}/location/current`)
        .then(res => res.json())
        .then(data => {
          // Actualizar memoria de posiciones para que no desaparezcan
          Object.entries(data).forEach(([key, value]) => {
            if (!isNaN(key)) {
              lastKnownPositions.current[key] = value;
            }
          });

          setAllPositions(data);
          if (setRaceData) {
            setRaceData(data); // Envía sim_time y race_table al componente padre
          }
        })
        .catch(err => console.error(err));
    }, 200); 
    return () => clearInterval(interval);
  }, [active, setRaceData]);

  // Generación de los segmentos de pista (evita líneas cruzadas por saltos de GPS)
  const trackSegments = useMemo(() => {
    if (trackPoints.length === 0 || bounds.maxX === bounds.minX) return [];

    const segments = [];
    let currentSegment = [];

    trackPoints.forEach((p, i) => {
      const x = mapCoordinates(p.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding;
      const y = svgSize - (mapCoordinates(p.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
      const pointStr = `${x},${y}`;

      if (i > 0) {
        const prev = trackPoints[i - 1];
        const dist = Math.sqrt(Math.pow(p.x - prev.x, 2) + Math.pow(p.y - prev.y, 2));

        if (dist > 1000) {
          if (currentSegment.length > 0) segments.push(currentSegment.join(" "));
          currentSegment = [];
        }
      }
      currentSegment.push(pointStr);
    });

    if (currentSegment.length > 0) segments.push(currentSegment.join(" "));
    return segments;
  }, [trackPoints, bounds]);

  const getScaledCoords = (pos) => {
    if (!pos || bounds.maxX === bounds.minX) return { x: 0, y: 0 };
    const x = mapCoordinates(pos.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding;
    const y = svgSize - (mapCoordinates(pos.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
    return { x, y };
  };

  // Vuelta actual del líder de la carrera
  const leaderLap = useMemo(() => {
    const raceTable = allPositions.race_table || {};
    const laps = Object.values(raceTable)
      .map(d => parseInt(d.lap_number) || 0);
    return laps.length > 0 ? Math.max(...laps) : 0;
  }, [allPositions]);

  return (
    <div className="card h-100 w-100 position-relative d-flex justify-content-center align-items-center bg-black border-danger shadow" 
          style={{ borderWidth: '2px', borderRadius: '15px', minHeight: '600px' }}>
      
      {!active && <div className="text-secondary z-1">Selecciona una sesión para comenzar</div>}
      {active && loadingMap && trackPoints.length === 0 && <div className="spinner-border text-danger z-1" role="status"></div>}

      {active && trackPoints.length > 0 && (
        <div style={{ position: 'relative', width: '100%', paddingTop: '75%' }}> 
          <svg viewBox={`0 0 ${svgSize} ${svgSize}`} preserveAspectRatio="xMidYMid meet" 
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}>
            
            {/* Dibujo de la pista */}
            {trackSegments.map((segPoints, idx) => (
              <g key={idx}>
                <polyline points={segPoints} fill="none" stroke="#333" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={segPoints} fill="none" stroke="#222" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            ))}
            
            {/* Dibujo de los pilotos */}
            {Object.keys(lastKnownPositions.current).map(driverNum => {
              if (followedDriver && followedDriver !== driverNum) return null;
              if (isNaN(driverNum)) return null; // Ignora race_table y sim_time

              const isKnownDriver = activeDriversRef.current.some(d => String(d.driver_number) === String(driverNum));
              if (!isKnownDriver) return null;

              const status = driverStatus.find(s => String(s.driver_number) === String(driverNum));
              const lapsCompletedInDB = status ? parseInt(status.number_of_laps) : 999;

              // LOGICA: DNS desaparecen ya. DNF y DSQ espera a que el líder pase a la vuelta siguiente.
              let shouldHide = false;
              if (status) {
                if (status.dns) shouldHide = true;
                if (status.dsq && lapsCompletedInDB >= 0 && leaderLap > lapsCompletedInDB) shouldHide = true;
                if (status.dnf && lapsCompletedInDB >= 0 && leaderLap > lapsCompletedInDB) shouldHide = true;
              }

              if (shouldHide) return null;

              const coords = getScaledCoords(lastKnownPositions.current[driverNum]);
              const isFollowed = followedDriver === driverNum;
              const teamColor = driverColours[driverNum] || "#ffffff";

              return (
                <g key={driverNum} style={{ transform: `translate(${coords.x}px, ${coords.y}px)`, transition: "transform 200ms linear" }}>
                  {/* Efecto de pulso para el coche seguido */}
                  <circle r="15" fill="none" stroke={isFollowed ? "#e10600" : teamColor} strokeWidth="1" opacity="0.6">
                    <animate attributeName="r" from="5" to="25" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                  
                  {/* Punto del coche */}
                  <circle r="6" fill={teamColor} stroke="white" strokeWidth="2" />
                  
                  {/* Número del piloto */}
                  <text y="-12" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" 
                        style={{ pointerEvents: 'none', textShadow: '1px 1px 2px black' }}>
                    {driverNum}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}