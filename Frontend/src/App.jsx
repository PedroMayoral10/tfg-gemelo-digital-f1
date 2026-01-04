import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import Navbar from './components/Navbar';
import CircuitoInteractivo from './components/CircuitoInteractivo/CircuitoInteractivo';

function App() {
  return (
    <div className="d-flex flex-column vh-100" style={{ backgroundColor: '#121212', overflow: 'hidden' }}>
      
      <ToastContainer position="top-right" theme="dark" />
      <Navbar /> 

      <div className="flex-grow-1 w-100 d-flex flex-column">  
        <Routes>
            
          <Route path="/circuito-interactivo" element={<CircuitoInteractivo />} />
          <Route path="/pilotos" element={<div className="p-5 text-center text-white">Pilotos</div>} />
          <Route path="/telemetria" element={<div className="p-5 text-center text-white">Telemetria</div>} />

        </Routes>
      </div>
    </div>
  );
}

export default App;