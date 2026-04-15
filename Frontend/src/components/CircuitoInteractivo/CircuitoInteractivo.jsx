import { useState, useEffect, useMemo, useRef } from 'react';
import Circuito from './Circuito';
import SelectorSesion from './SeleccionSesion';
import TablaCarrera from './TablaCarrera';
import TablaRaceControl from './TablaRaceControl';
import { URL_API_BACKEND } from "../../config";

export default function CircuitoInteractivo() {
  const [simulationActive, setSimulationActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [driversData, setDriversData] = useState([]);
  const [raceData, setRaceData] = useState({});
  const [totalLaps, setTotalLaps] = useState(0);
  const [eventInfo, setEventInfo] = useState({ name: "", code: "" });
  const [driverStatus, setDriverStatus] = useState([]);

  const f1CountryMapper = {
    "ESP": "es", "BRN": "bh", "KSA": "sa", "AUS": "au", "AZE": "az", 
    "MON": "mc", "CAN": "ca", "AUT": "at", "GBR": "gb", "HUN": "hu", 
    "BEL": "be", "NED": "nl", "ITA": "it", "SGP": "sg", "JPN": "jp", 
    "QAT": "qa", "USA": "us", "MEX": "mx", "BRA": "br", "UAE": "ae", "CHN": "cn"
  };

  useEffect(() => {
    const fetchSessionData = async () => {
      const session_key = raceData?.session_key;
      if (simulationActive && session_key) {
        try {
          const resLaps = await fetch(`${URL_API_BACKEND}/sessions_results/openf1/total_laps/${session_key}`);
          const dataLaps = await resLaps.json();
          setTotalLaps(dataLaps.total_laps || 0);

          const resStatus = await fetch(`${URL_API_BACKEND}/sessions_results/openf1/results/${session_key}`);
          const dataStatus = await resStatus.json();
          
          if (Array.isArray(dataStatus) && dataStatus.length > 0) {
            setDriverStatus(dataStatus);
          }
        } catch (error) {
          console.error("Error al obtener datos de la sesión:", error);
        }
      }
    };
    fetchSessionData();
  }, [simulationActive, raceData?.session_key]);

  const currentLap = useMemo(() => {
    const pilotos = Object.values(raceData?.snapshot || raceData?.race_table || {});
    const lider = pilotos.find(p => parseInt(p.position) === 1);
    return lider?.lap_number || 0;
  }, [raceData]);

  const handleStartCircuit = (driverId, eventData) => {
    setRaceData({});
    setTotalLaps(0);
    setDriverStatus([]);
    setSelectedDriver(driverId);
    if (eventData) {
      setEventInfo({ name: eventData.countryName, code: eventData.countryCode });
    }
    setSimulationActive(true);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <>
      {/* HEADER: bg-zinc-950 para que se fusione con el fondo de la App */}
      <div className="sticky-top bg-zinc-900 py-2 w-100 border-bottom border-danger shadow-none" style={{ top: 0, zIndex: 1050, borderBottomWidth: '2px' }}>
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
                  style={{ width: '38px', height: '28px', borderRadius: '3px', display: 'inline-block' }}
                ></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CUERPO: CORREGIDO className para aplicar el fondo Zinc */}
      <div className="p-4 w-100 bg-zinc-900" style={{ minHeight: '100vh', display: 'block' }}>
        <div className="w-100" style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div className="container-fluid py-3 bg-transparent">
            <div className="row">
              <div className="col-lg-9">
                <div className="h-100" style={{ minHeight: '700px', width: '100%' }}>
                  <Circuito 
                    active={simulationActive} 
                    trigger={refreshTrigger} 
                    followedDriver={selectedDriver}
                    drivers={driversData} 
                    setRaceData={setRaceData}
                    driverStatus={driverStatus}
                  />
                </div>
              </div>

              <div className="col-lg-3">
                {/* PANEL CONFIGURACIÓN: bg-black puro */}
                <div className="h-100 bg-black border border-danger shadow-none" style={{ borderWidth: '2px', borderRadius: '15px' }}>
                  <div className="card-body p-4 d-flex flex-column">
                    <h6 className="text-white mb-3 fw-bold text-uppercase ">
                      Configuración de carrera
                    </h6>
                    <SelectorSesion 
                        onStartSimulation={handleStartCircuit}
                        setExternalDrivers={setDriversData}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="row mt-4">
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between">
                  <h5 className="text-white mb-4 text-uppercase fw-bold" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
                    Race control
                  </h5>
                </div>
                {/* RACE CONTROL: bg-black puro y sombra eliminada */}
                <div className="bg-black border border-danger p-3 shadow-none" style={{ borderRadius: '15px' }}>
                  <TablaRaceControl 
                    session_key={raceData?.session_key} 
                    sim_time={raceData?.sim_time} 
                  />
                </div>
              </div>
            </div>

            <div className="row mt-4 pb-5">
              <div className="col-12">
                 <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap">
                    <h5 className="text-white mb-0 text-uppercase fw-bold" style={{ fontSize: '1.1rem', letterSpacing: '1px' }}>
                      Clasificación y Tiempos
                    </h5>
                    <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center">
                        <span style={{ width: '10px', height: '10px', backgroundColor: '#a855f7', borderRadius: '100%', marginRight: '8px'}}></span>
                        <small className="text-zinc-400 uppercase font-bold text-[10px]">Récord Sector</small>
                      </div>
                      <div className="d-flex align-items-center">
                        <span style={{ width: '10px', height: '10px', backgroundColor: '#4ade80', borderRadius: '100%', marginRight: '8px'}}></span>
                        <small className="text-zinc-400 uppercase font-bold text-[10px]">Mejora Personal</small>
                      </div>
                      <div className="d-flex align-items-center">
                        <span style={{ width: '10px', height: '10px', backgroundColor: '#facc15', borderRadius: '100%', marginRight: '8px'}}></span>
                        <small className="text-zinc-400 uppercase font-bold text-[10px]">Sin Mejora</small>
                      </div>
                    </div>
                  </div>
                  <TablaCarrera
                    key={refreshTrigger} 
                    raceData={raceData} 
                    driverStatus={driverStatus} 
                  />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}