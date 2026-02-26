import { useState } from 'react';
import Circuito from './Circuito';
import SelectorSesion from './SeleccionSesion';

export default function CircuitoInteractivo() {
  const [simulationActive, setSimulationActive] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [driversData, setDriversData] = useState([]);

  const handleStartCircuit = (driverId) => {
    setSelectedDriver(driverId); // Guardamos el ID (puede ser "" para todos)
    setSimulationActive(true);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex-grow-1 p-4 d-flex justify-content-center align-items-center w-100 overflow-hidden">
      <div className="w-100 h-100" style={{ maxWidth: '1600px' }}>
        <div className="container-fluid h-100 py-3">
          <div className="row h-100">
            <div className="col-lg-9 h-100 mb-3 mb-lg-0">
              <Circuito 
                active={simulationActive} 
                trigger={refreshTrigger} 
                followedDriver={selectedDriver}
                drivers={driversData} 
              />
            </div>

            <div className="col-lg-3 h-100">
              <div className="card h-100 bg-black border-danger shadow" style={{ borderWidth: '2px', borderRadius: '15px' }}>
                <div className="card-body p-4 d-flex flex-column">
                  <h5 className="text-white mb-4 fw-bold text-uppercase border-bottom border-secondary pb-2">
                    Gran premio y piloto
                  </h5>

                  <div className="mb-4">
                    <SelectorSesion 
                      onStartSimulation={handleStartCircuit}
                      setExternalDrivers={setDriversData} // Obtenemos los drivers del componente hijo del selector, para pasarlos al otro hijo y así poder usar sus datos.
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
        </div>
      </div>
    </div>
  );
}