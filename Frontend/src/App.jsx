import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import CircuitMap from './components/Circuito';
/* import Pilotos from './components/Pilotos';       // (Asegúrate de que existan)
import Telemetria from './components/Telemetria'; // (Asegúrate de que existan) */
import './App.css'; 

function App() {
  return (
    // 1. Contenedor Principal (Fondo oscuro, pantalla completa)
    <div className="d-flex flex-column vh-100" style={{ backgroundColor: '#121212', overflow: 'hidden' }}>
      
      <ToastContainer position="top-right" theme="dark" />

      {/* 2. BARRA DE NAVEGACIÓN (Se queda FIJA siempre) */}
      <Navbar /> 

      {/* 3. ZONA DE CONTENIDO CAMBIANTE */}
      {/* Aquí usamos flex-grow para que ocupe todo el espacio sobrante debajo del menú */}
      <div className="flex-grow-1 w-100 d-flex flex-column">  
        <Routes>
            
            {/* --- RUTA 1: CIRCUITO INTERACTIVO --- */}
            <Route path="/circuito-interactivo" element={
              <>
                {/* Tarjeta del Mapa */}
                <div className="flex-grow-1 p-4 d-flex justify-content-center align-items-center">
                  <div 
                    className="rounded shadow-lg border border-secondary bg-dark position-relative"
                    style={{ 
                      width: '100%', 
                      maxWidth: '900px', 
                      height: '65vh',     
                      padding: '20px'
                    }}
                  >
                      <div style={{ width: '100%', height: '100%' }}>
                         <CircuitMap />
                      </div>
                  </div>
                </div>
              </>
            } />


            {/* --- RUTA 2: PILOTOS --- */}
            <Route path="/pilotos" element={
              <div className="p-5 text-center text-white">
                 Piloto
              </div>
            } />


            {/* --- RUTA 3: TELEMETRÍA --- */}
            <Route path="/telemetria" element={
              <div className="p-5 text-center text-white">
                 Telemetria
              </div>
            } />

        </Routes>
      </div>
    </div>
  );
}

export default App;