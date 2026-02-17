import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { URL_API_BACKEND } from "./config";
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import CircuitoInteractivo from './components/CircuitoInteractivo/CircuitoInteractivo';
import Login from './components/InicioSesion/Login';
import Register from './components/InicioSesion/Register';

function App() {

  const location = useLocation(); // Hook para detectar cambios de ruta


  //Usamos useRef para no rerenderizar el componente innecesariamente
  const haVisitadoCircuito = useRef(false);

  // --- Efecto para detener simulación en caso de cambiar de ruta ---
  useEffect(() => {
    
    // Si el usuario está en circuito-interactivo, marcamos que ha visitado esa ruta
    // para que cuando cambie de ruta podamos parar el flujo de datos
    if (location.pathname === '/circuito-interactivo') {
        haVisitadoCircuito.current = true; 
    } 
    
    else if (haVisitadoCircuito.current) {
        
        console.log("Salida de circuito detectada. Enviando STOP.");
        const url = `${URL_API_BACKEND}/location/stop`;
        navigator.sendBeacon(url); // Esto en vez de fetch para garantizar que se detenga el flujo aunque se cambie de ruta
        haVisitadoCircuito.current = false; 
    }

  }, [location]);

  return (
    <div className="d-flex flex-column vh-100" style={{ backgroundColor: '#121212', overflow: 'hidden' }}>
      
      <ToastContainer position="top-right" theme="dark" />
      
      {/* Mostrar Navbar solo si no estamos en Login o Register */}
      {location.pathname !== '/' && location.pathname !== '/register' && (
        <Navbar />
      )}

      <div className="flex-grow-1 w-100 d-flex flex-column">  
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/circuito-interactivo" element={<CircuitoInteractivo />} />
          <Route path="/pilotos" element={<div className="p-5 text-center text-white">Pilotos</div>} />
          <Route path="/telemetria" element={<div className="p-5 text-center text-white">Telemetria</div>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;