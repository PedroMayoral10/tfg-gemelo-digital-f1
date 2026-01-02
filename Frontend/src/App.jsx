import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import CircuitMap from './components/Circuito';
import './App.css'; 

function App() {
  return (
    <div className="d-flex flex-column vh-100" style={{ backgroundColor: '#121212', overflow: 'hidden' }}>
      
      <ToastContainer position="top-right" theme="dark" />
      <Navbar /> 

      <div className="flex-grow-1 w-100 d-flex flex-column">  
        <Routes>
            
            {/* RUTA 1: CIRCUITO INTERACTIVO */}
            <Route path="/circuito-interactivo" element={
              <div className="flex-grow-1 p-4 d-flex justify-content-center align-items-center">
                  {/* CAMBIO: Aumentamos maxWidth y quitamos bordes aquí para que lo maneje el componente hijo */}
                  <div 
                    className="w-100 h-100"
                    style={{ maxWidth: '1600px' }} 
                  >
                     <CircuitMap />
                  </div>
              </div>
            } />

            <Route path="/pilotos" element={<div className="p-5 text-center text-white">Pilotos</div>} />
            <Route path="/telemetria" element={<div className="p-5 text-center text-white">Telemetria</div>} />

        </Routes>
      </div>
    </div>
  );
}

export default App;