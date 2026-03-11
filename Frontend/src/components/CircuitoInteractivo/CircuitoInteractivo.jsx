import { useState, useEffect, useMemo } from 'react';
import Circuito from './Circuito';
import SelectorSesion from './SeleccionSesion';
import TablaCarrera from './TablaCarrera';
import { URL_API_BACKEND } from "../../config";

export default function CircuitoInteractivo() {
  const [simulationActive, setSimulationActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [driversData, setDriversData] = useState([]);
  const [raceData, setRaceData] = useState({});
  const [totalLaps, setTotalLaps] = useState(0);
  const [eventInfo, setEventInfo] = useState({ name: "", code: "" });

  const f1CountryMapper = {
    "ESP": "es", "BRN": "bh", "KSA": "sa", "AUS": "au", "AZE": "az", 
    "MON": "mc", "CAN": "ca", "AUT": "at", "GBR": "gb", "HUN": "hu", 
    "BEL": "be", "NED": "nl", "ITA": "it", "SGP": "sg", "JPN": "jp", 
    "QAT": "qa", "USA": "us", "MEX": "mx", "BRA": "br", "UAE": "ae", "CHN": "cn"
  };


  useEffect(() => {
    const fetchTotalLaps = async () => {
      const sKey = raceData?.session_key; 
      if (!sKey) return;
      try {
        const response = await fetch(`${URL_API_BACKEND}/sessions_results/total_laps/${sKey}`);
        const data = await response.json();
        // Actualizamos siempre que haya una nueva sKey
        if (data.total_laps) {
          setTotalLaps(data.total_laps);
        } else {
          setTotalLaps(0);
        }
      } catch (error) {
        console.error("Error al obtener total_laps:", error);
        setTotalLaps(0);
      }
    };

    if (raceData?.session_key) {
      fetchTotalLaps();
    }
  }, [raceData?.session_key]); // Se dispara cada vez que cambia la session_key

  // Cálculo de la vuelta actual para el header global
  const currentLap = useMemo(() => {
    const pilotos = Object.values(raceData?.snapshot || raceData?.race_table || {});
    const lider = pilotos.find(p => parseInt(p.position) === 1);
    return lider?.lap_number || 0;
  }, [raceData]);

  const handleStartCircuit = (driverId, eventData) => {
    setSelectedDriver(driverId);
    if (eventData) {
      setEventInfo({ name: eventData.countryName, code: eventData.countryCode });
    }
    setSimulationActive(true);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      <div className="sticky-top bg-black py-2 shadow-lg w-100 border-bottom border-danger" style={{ top: 0, zIndex: 1050, borderBottomWidth: '2px !important' }}>
        <div className="px-4"> 
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-baseline gap-2">
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em]">Lap</span>
              <div className="d-flex align-items-baseline">
                <span className="text-white text-3xl font-black italic">{currentLap}</span>
                <span className="text-zinc-600 text-xl font-bold mx-1">/</span>
                <span className="text-zinc-500 text-xl font-bold">{totalLaps || "-"}</span>
              </div>
            </div>

            {eventInfo.name && (
              <div className="d-flex align-items-center gap-3">
                <div className="text-end">
                  <div className="text-white fw-black text-uppercase italic" style={{ fontSize: '1.2rem', lineHeight: '1' }}>
                    {eventInfo.name}
                  </div>
                </div>
                <span 
                  className={`fi fi-${f1CountryMapper[eventInfo.code?.toUpperCase()] || 'un'}`} 
                  style={{ 
                    width: '38px', 
                    height: '28px', 
                    borderRadius: '3px',
                    display: 'inline-block'
                  }}
                ></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="p-4 w-100" style={{ minHeight: '100vh', display: 'block' }}>
        <div className="w-100" style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div className="container-fluid py-3">
            <div className="row">
              <div className="col-lg-9 mb-3 mb-lg-0">
                {/* Contenedor del circuito */}
                <div style={{ minHeight: '550px', width: '100%' }}>
                  <Circuito 
                    active={simulationActive} 
                    trigger={refreshTrigger} 
                    followedDriver={selectedDriver}
                    drivers={driversData} 
                    setRaceData={setRaceData}
                  />
                </div>
              </div>

              <div className="col-lg-3">
                <div className="card h-100 bg-black border-danger shadow" style={{ borderWidth: '2px', borderRadius: '15px' }}>
                  <div className="card-body p-4 d-flex flex-column">
                    <h5 className="text-white mb-4 fw-bold text-uppercase border-bottom border-secondary pb-2">
                      Configuración de carrera
                    </h5>

                    <div className="mb-4">
                      {/* Pasamos la función actualizada al selector */}
                      <SelectorSesion 
                        onStartSimulation={handleStartCircuit}
                        setExternalDrivers={setDriversData}
                      />
                    </div>

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

            {/* SECCIÓN DE TABLA */}
            <div className="row mt-4 mb-5 pt-4 border-top border-secondary border-opacity-25">
              <div className="col-12">
                 <h4 className="text-white mb-4 text-uppercase fw-bold" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
                   Clasificación y Tiempos
                 </h4>
                 <TablaCarrera raceData={raceData} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}