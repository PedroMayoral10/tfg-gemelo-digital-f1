import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { URL_API_BACKEND } from "../config"; // Asegúrate de que esta ruta es correcta

export default function SessionSelector({ onStartSimulation }) {
  
  // --- ESTADOS ---
  const [years] = useState([2023, 2024, 2025]);
  const [selectedYear, setSelectedYear] = useState(2023); // Año por defecto
  
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(""); // <--- Esta era la que fallaba
  
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");

  const [loading, setLoading] = useState(false);

  // --- 1. CARGAR SESIONES AL CAMBIAR DE AÑO ---
  useEffect(() => {
    setLoading(true);
    // Filtramos directamente en la URL por "Race" para evitar duplicados
    fetch(`https://api.openf1.org/v1/sessions?year=${selectedYear}&session_name=Race`)
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        // Reseteamos selecciones al cambiar de año
        setSelectedSession("");
        setDrivers([]);
        setSelectedDriver("");
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        toast.error("Error cargando sesiones");
        setLoading(false);
      });
  }, [selectedYear]);

  // --- 2. CARGAR PILOTOS AL ELEGIR CIRCUITO ---
  const handleSessionChange = (e) => {
    const sessionKey = e.target.value;
    setSelectedSession(sessionKey);
    setSelectedDriver(""); // Resetear piloto

    if (!sessionKey) return;

    setLoading(true);
    fetch(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`)
      .then(res => res.json())
      .then(data => {
        // A veces la API devuelve duplicados de pilotos, usamos un Map para filtrar por número
        const uniqueDrivers = [...new Map(data.map(item => [item.driver_number, item])).values()];
        // Ordenamos por número
        uniqueDrivers.sort((a, b) => a.driver_number - b.driver_number);
        
        setDrivers(uniqueDrivers);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  // --- 3. BOTÓN START ---
  const handleStart = () => {
    if (!selectedSession || !selectedDriver) {
      toast.warning("Selecciona circuito y piloto");
      return;
    }

    const payload = {
        session_key: selectedSession,
        driver_number: selectedDriver
    };

    // Llamada a TU backend para iniciar la simulación
    fetch(`${URL_API_BACKEND}/location/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            toast.error(data.error);
        } else {
            toast.success(`Simulación Iniciada: ${data.startTime}`);
            // Avisamos al padre (CircuitMap) que empiece a pintar
            if (onStartSimulation) onStartSimulation();
        }
    })
    .catch(err => {
        console.error(err);
        toast.error("Error conectando con el servidor");
    });
  };

  // --- RENDERIZADO (DISEÑO VERTICAL) ---
  return (
    <div className="d-flex flex-column gap-3 w-100">
        
        {/* 1. SELECCIONAR AÑO */}
        <div className="text-start">
          <label className="text-secondary small fw-bold mb-1">AÑO</label>
          <select 
              className="form-select bg-dark text-white border-secondary" 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
          >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
  
        {/* 2. SELECCIONAR CIRCUITO */}
        <div className="text-start">
          <label className="text-secondary small fw-bold mb-1">GRAN PREMIO</label>
          <select 
              className="form-select bg-dark text-white border-secondary"
              value={selectedSession} 
              onChange={handleSessionChange}
              disabled={loading}
          >
              <option value="">Selecciona circuito...</option>
              {sessions.map(s => (
                  <option key={s.session_key} value={s.session_key}>
                      {s.location} - {s.country_name}
                  </option>
              ))}
          </select>
        </div>
  
        {/* 3. SELECCIONAR PILOTO */}
        <div className="text-start">
          <label className="text-secondary small fw-bold mb-1">PILOTO</label>
          <select 
              className="form-select bg-dark text-white border-secondary"
              value={selectedDriver} 
              onChange={e => setSelectedDriver(e.target.value)}
              disabled={!selectedSession}
          >
              <option value="">Selecciona piloto...</option>
              {drivers.map(d => (
                  <option key={d.driver_number} value={d.driver_number}>
                      {d.full_name} (#{d.driver_number})
                  </option>
              ))}
          </select>
        </div>
  
        {/* 4. BOTÓN START */}
        <button 
          className="btn btn-danger w-100 fw-bold mt-2 py-2"
          onClick={handleStart}
          disabled={!selectedDriver || loading}
        >
          {loading ? 'Cargando...' : 'START'}
        </button>
  
    </div>
  );
}