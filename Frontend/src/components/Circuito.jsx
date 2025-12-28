import { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';

// Función para escalar coordenadas
const mapCoordinates = (val, min, max, size) => {
  return ((val - min) / (max - min)) * size;
};


// Componente Principal que contiene el mapa del circuito y la posición del coche

export default function CircuitMap() {

  // Definimos los estados iniciales del componente
  const [trackPoints, setTrackPoints] = useState([]); // Puntos del trazado del circuito
  const [carPosition, setCarPosition] = useState(null); // Posición actual del coche
  const [bounds, setBounds] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 }); // Límites del circuito
  const [loading, setLoading] = useState(true); // Estado de carga

  // Hook de efecto para cargar el trazado (circuito)
  useEffect(() => {
    fetch('/location/track-data')
      // Promesa para manejar la respuesta
      .then(res => {
        if (!res.ok) throw new Error("Error al cargar el circuito");
        return res.json();
      })
      //Si la respuesta es correcta, procesamos los datos
      .then(data => {
        //Comprobamos que hay datos
        if (data.length > 0) {
            // Extraemos los valores x e y para calcular los límites
            const xValues = data.map(p => p.x);
            const yValues = data.map(p => p.y);
            // Asignamos los límites y los puntos del trazado
            setBounds({
                minX: Math.min(...xValues),
                maxX: Math.max(...xValues),
                minY: Math.min(...yValues),
                maxY: Math.max(...yValues)
            });
            // Pintamos los puntos del trazado (insertamos los datos en el array de puntos definido en el estado de manera vacía al inicio)
            setTrackPoints(data);
            toast.success("Circuito cargado correctamente 🏁", {
                toastId: 'existoCircuito'
            });
        }
        setLoading(false); // Terminamos de cargar porque ya tenemos el trazado y si no hay datos, no tiene sentido seguir esperando
      })
      .catch(err => {
        console.error(err);
        toast.error("Fallo al cargar datos del circuito");
        setLoading(false);
      });
  }, []);

  // Hook de efecto para actualizar la posición del coche cada 270ms (recomendado por la API)
  useEffect(() => {
    const interval = setInterval(() => { //setInterval es una funcion de JS predefinida que ejecuta una funcion cada X ms
        fetch('/location/current')
            .then(res => res.json()) // Si se resuelve la promesa, parseamos a JSON
            .then(data => { // Accedemos a los datos y actualizamos la posición del coche
                if(data && data.x) setCarPosition(data);
            })
            .catch(err => console.error(err)); // Silenciamos errores de polling para no saturar
    }, 270); 
    return () => clearInterval(interval); // Limpiamos el intervalo al desmontar el componente, porque si no se ejecuta indefinidamente
  }, []);


  // Preparar SVG para pintar el circuito y la posición del coche
  const svgSize = 800; 
  const padding = 50;

  // UseMemo es solo para pintar el circuito una vez si sus valores no se modifican, porque si no se consume mucho rendimiento
  const polylinePoints = useMemo(() => {
      return trackPoints.map(p => {
        // Escalamos las coordenadas al tamaño del SVG con padding
        const x = mapCoordinates(p.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding;
        // Invertimos Y (svgSize - y) porque en pantallas la Y crece hacia abajo
        const y = svgSize - (mapCoordinates(p.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
        return `${x},${y}`;
      }).join(" ");
  }, [trackPoints, bounds]);

  // Coordenadas actuales del coche, aqui no se usa useMemo porque se actualiza constantemente la posición del coche
  const getCarCoords = () => {
      if (!carPosition) return { x: 0, y: 0 };
      const x = mapCoordinates(carPosition.x, bounds.minX, bounds.maxX, svgSize - padding * 2) + padding;
      const y = svgSize - (mapCoordinates(carPosition.y, bounds.minY, bounds.maxY, svgSize - padding * 2) + padding);
      return { x, y };
  };

  // Si estamos cargando, mostramos un mensaje de carga
  if (loading) return <div className="text-white">Cargando circuito...</div>;

  // Obtenemos las coordenadas del coche
  const carCoords = getCarCoords();

  return (
    // Quitamos los estilos de borde aquí porque ya los tiene el padre en App.jsx
    // Simplemente ocupamos el 100% del hueco que nos den.
    <div className="d-flex justify-content-center align-items-center" 
         style={{ width: '100%', height: '100%' }}>
      
      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${svgSize} ${svgSize}`} 
        preserveAspectRatio="xMidYMid meet" 
        /* preserveAspectRatio="xMidYMid meet" es la CLAVE.
           Significa: "Centra el dibujo (Mid) y redúcelo hasta que quepa entero (meet)"
        */
      >
        
        {/* Trazado Base */}
        <polyline 
            points={polylinePoints} 
            fill="none" 
            stroke="#333" 
            strokeWidth="12" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        />

        {/* Coche */}
        {carPosition && (
            <g transform={`translate(${carCoords.x}, ${carCoords.y})`}>
                <circle r="6" fill="#0f582186" stroke="#012414ff" strokeWidth="2" />
                <circle r="10" fill="none" stroke="#ffffffff" strokeWidth="1" opacity="0.5">
                    <animate attributeName="r" from="6" to="20" dur="1s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" from="0.8" to="0" dur="1s" repeatCount="indefinite"/>
                </circle>
            </g>
        )}
      </svg>
    </div>
  );
}