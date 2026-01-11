import { useState, useEffect } from 'react';
import CircuitMap from './Circuito';
import SessionSelector from './SeleccionSesion';
import { URL_API_BACKEND } from "../../config";

export default function CircuitoInteractivo() {
  
  // Este componente controla si la simulación está activa
  const [simulationActive, setSimulationActive] = useState(false); // La simulación empieza inactiva
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Para forzar recarga del mapa

  // Función que ejecutará la funcion de inicio de simulación en el selector de sesión
  const handleStartCircuit = () => {
    setSimulationActive(true);
    setRefreshTrigger(prev => prev + 1); // Prev+1 para forzar siempre un cambio de valor
  };

    return (

        <div className="flex-grow-1 p-4 d-flex justify-content-center align-items-center w-100 overflow-hidden">
            <div className="w-100 h-100" style={{ maxWidth: '1600px' }}>

                <div className="container-fluid h-100 py-3">
                    <div className="row h-100">

                        {/* --- COLUMNA IZQUIERDA: MAPA DEL CIRCUITO --- */}
                        <div className="col-lg-9 h-100 mb-3 mb-lg-0">
                            {/* Pasamos el estado al mapa para que sepa cuándo trabajar */}
                            <CircuitMap active={simulationActive} trigger={refreshTrigger} />
                        </div>

                        {/* --- COLUMNA DERECHA: SELECCION DE CARRERA/AÑO/PILOTO --- */}
                        <div className="col-lg-3 h-100">
                            <div className="card h-100 bg-black border-danger shadow" style={{ borderWidth: '2px', borderRadius: '15px' }}>
                                <div className="card-body p-4 d-flex flex-column">

                                    <h5 className="text-white mb-4 fw-bold text-uppercase border-bottom border-secondary pb-2">
                                        Gran premio y piloto - Selección
                                    </h5>

                                    <div className="mb-4">
                                        {/* Pasamos la función al selector para que nos avise */}
                                        <SessionSelector onStartSimulation={handleStartCircuit} />
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
                </div>
            </div>
        </div>
    );
}