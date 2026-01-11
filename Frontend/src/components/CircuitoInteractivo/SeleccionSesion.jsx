import { useState, useEffect, useMemo, useRef } from 'react'; // <--- AÑADIDO useRef
import { toast } from 'react-toastify';
import { URL_API_BACKEND } from "../../config";

export default function SessionSelector({ onStartSimulation }) {
  
  //ESTADOS
  
  const [years] = useState([2023, 2024, 2025]);
  const [sessions, setSessions] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [listaFavoritos, setListaFavoritos] = useState([]);

  const [selectedYear, setSelectedYear] = useState(2023); 
  const [selectedSession, setSelectedSession] = useState(""); 
  const [selectedDriver, setSelectedDriver] = useState("");   

  const [loading, setLoading] = useState(false);


  // Guardamos aquí lo que queremos cargar mientras esperamos al fetch
  const pendingLoad = useRef(null); 


  // Comprobamos si la configuración actual es un favorito

  const esFavoritoActual = useMemo(() => {
      if (!selectedSession || !selectedDriver) return false;
      return listaFavoritos.some(fav => 
          String(fav.year) === String(selectedYear) &&
          String(fav.round) === String(selectedSession) &&
          String(fav.driverId) === String(selectedDriver)
      );
  }, [listaFavoritos, selectedYear, selectedSession, selectedDriver]);

  // Funcionalidades

  // Obtenemos la lista de favoritos

  const fetchFavoritos = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
          const res = await fetch(`${URL_API_BACKEND}/interactive_favs/list`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) setListaFavoritos(data.favorites);
      } catch (error) { console.error(error); }
  };

  // Añadir o eliminar favorito

  const handleToggleFavorito = async () => {
        const token = localStorage.getItem('token');
        if (!token) return toast.error("Inicia sesión para gestionar favoritos.");
        if (!selectedSession || !selectedDriver) return toast.warning("Selecciona circuito y piloto primero.");

        try {
            if (esFavoritoActual) {
                await fetch(`${URL_API_BACKEND}/interactive_favs/remove`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ 
                        year: selectedYear, 
                        round: selectedSession, 
                        driverId: selectedDriver 
                    })
                });
                toast.info("💔 Eliminado de favoritos");
            } else {
                const currentSessionData = sessions.find(s => s.session_key == selectedSession);
                const circuitNameStr = currentSessionData ? `${currentSessionData.location} - ${currentSessionData.country_name}` : `Sesión ${selectedSession}`;

                await fetch(`${URL_API_BACKEND}/interactive_favs/add`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ 
                        year: selectedYear, 
                        round: selectedSession, 
                        driverId: selectedDriver, 
                        circuitName: circuitNameStr 
                    })
                });
                toast.success("❤️ Añadido a favoritos");
            }
            fetchFavoritos(); 
        } catch (error) { 
            console.error(error); 
            toast.error("Error al actualizar favoritos"); 
        }
  };

  // Cargar configuración desde la lista de favoritos
  const cargarConfiguracion = (fav) => {
        toast.info(`Cargando configuración...`);
        
        // Guardamos en la "memoria temporal" lo que queremos conseguir
        pendingLoad.current = { 
            session: fav.round, 
            driver: fav.driverId 
        };

        // Solo cambiamos el año. Esto disparará el primer useEffect.
        // Si el año ya es el mismo, forzamos la actualización de la sesión manualmente
        if (String(selectedYear) === String(fav.year)) {
            // Si el año no cambia, el useEffect del año no saltará, así que pasamos al paso 2 manual
            setSelectedSession(fav.round);
        } else {
            setSelectedYear(fav.year);
        }
  };

  // Iniciar simulación

  const handleStart = () => {
    if (!selectedSession || !selectedDriver) { toast.warning("Faltan datos"); return; }
    fetch(`${URL_API_BACKEND}/location/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_key: selectedSession, driver_number: selectedDriver })
    }).then(res => res.json()).then(d => {
        if (!d.error) { toast.success(`Simulación iniciada`); if (onStartSimulation) onStartSimulation(); }
        else toast.error(d.error);
    }).catch(e => toast.error("Error conexión"));
  };

  // Efecto que carga los favoritos al montar el componente

  useEffect(() => {
      fetchFavoritos();
  }, []);

  // Carga de sesiones 
  useEffect(() => {
    setLoading(true);
    fetch(`${URL_API_BACKEND}/races/openf1/year/${selectedYear}`)
      .then(res => res.json())
      .then(data => { 
          setSessions(data.error ? [] : data); 
          setLoading(false); 

          // --- LOGICA INTELIGENTE ---
          // ¿Tenemos algo pendiente de cargar en la memoria?
          if (pendingLoad.current && pendingLoad.current.session) {
              // Si hay algo pendiente, lo aplicamos AHORA que ya tenemos las carreras
              setSelectedSession(pendingLoad.current.session);
              // (No borramos pendingLoad todavía, nos falta el piloto)
          } else {
              // Comportamiento normal: Si cambio de año a mano, reseteo todo
              setSelectedSession(""); 
              setDrivers([]);
          }
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, [selectedYear]);

  // Carga de pilotos 
  useEffect(() => {
    if (!selectedSession) { 
        setDrivers([]); 
        return; 
    }

    setLoading(true);
    fetch(`${URL_API_BACKEND}/drivers/openf1/${selectedSession}`)
      .then(res => res.json())
      .then(data => {
        const unique = [...new Map(data.map(item => [item.driver_number, item])).values()];
        setDrivers(unique.sort((a, b) => a.driver_number - b.driver_number));
        setLoading(false);

        // Si hay algo pendiente de cargar en la memoria, lo aplicamos
        if (pendingLoad.current && pendingLoad.current.driver) {
             setSelectedDriver(pendingLoad.current.driver);
             pendingLoad.current = null;
        } else {
            // Comportamiento normal: reseteo piloto al cambiar circuito
            setSelectedDriver("");
        }
      })
      .catch(err => { console.error(err); setLoading(false); });

  }, [selectedSession]);


  // Renderizado 

  return (
    <div className="d-flex flex-column gap-2 w-100">
        
        {/* LISTA FAVORITOS */}
        <div className="mb-2 p-2 border border-warning rounded bg-dark">
            <h6 className="text-warning mb-2">⭐ Favoritos</h6>
            <div className="list-group" style={{ height: '210px', overflowY: 'auto' }}>
                {listaFavoritos.length === 0 ? (
                    <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted small fst-italic bg-black bg-opacity-25">
                        <span style={{ fontSize: '1.5rem' }}>📭</span> Lista vacía
                    </div>
                ) : (
                    listaFavoritos.map((fav, i) => (
                        <div key={i} className="list-group-item list-group-item-action bg-black text-white p-1 px-2 border-bottom border-secondary d-flex justify-content-between align-items-center">
                            <div className="small flex-grow-1 text-truncate pe-2" style={{fontSize: '0.85rem'}}>
                                <span className="text-warning fw-bold">{fav.year}</span> | {fav.circuitName} <br/>
                                <span className="text-white">🏁 {fav.driverId}</span>
                            </div>
                            <div className="flex-shrink-0">
                                <button 
                                    className="btn btn-sm btn-outline-success p-0" 
                                    style={{width:'24px', height:'24px'}} 
                                    onClick={() => cargarConfiguracion(fav)}
                                    title="Cargar configuración"
                                >
                                    ⚡
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* SELECTORES */}
        <div className="text-start">
          <label className="text-secondary small fw-bold mb-0">AÑO</label>
          <select 
            className="form-select form-select-sm bg-dark text-white border-secondary" 
            value={selectedYear} 
            onChange={e => {
                // Si el usuario cambia manualmente, borramos cualquier carga pendiente para evitar conflictos
                pendingLoad.current = null;
                setSelectedYear(e.target.value);
            }}
          >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
  
        <div className="text-start">
          <label className="text-secondary small fw-bold mb-0">GRAN PREMIO</label>
          <select 
            className="form-select form-select-sm bg-dark text-white border-secondary" 
            value={selectedSession} 
            onChange={e => { 
                pendingLoad.current = null; // Usuario toca manual -> anulamos automático
                setSelectedSession(e.target.value); 
                setSelectedDriver(""); 
            }} 
            disabled={loading}
          >
              <option value="">Selecciona circuito...</option>
              {sessions.map(s => <option key={s.session_key} value={s.session_key}>{s.location} - {s.country_name}</option>)}
          </select>
        </div>
  
        <div className="text-start">
          <label className="text-secondary small fw-bold mb-0">PILOTO</label>
          <select 
            className="form-select form-select-sm bg-dark text-white border-secondary" 
            value={selectedDriver} 
            onChange={e => setSelectedDriver(e.target.value)} 
            disabled={!selectedSession}
          >
              <option value="">Selecciona piloto...</option>
              {drivers.map(d => <option key={d.driver_number} value={d.driver_number}>{d.full_name} (#{d.driver_number})</option>)}
          </select>
        </div>
  
        <div className="d-flex gap-2 mt-2">
            <button className="btn btn-danger flex-grow-1 fw-bold btn-sm py-2" onClick={handleStart} disabled={!selectedDriver || loading}>
              {loading ? '...' : 'START'}
            </button>
            <button 
                onClick={handleToggleFavorito} 
                className="btn btn-sm btn-outline-danger"
                style={{ minWidth: '40px' }} 
                disabled={!selectedDriver}
            >
              {esFavoritoActual ? "❤️" : "🤍"} 
            </button>
        </div>
    </div>
  );
}