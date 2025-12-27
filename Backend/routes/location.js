var express = require('express');
var router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org';

// --- ESTADO GLOBAL ---
let ultimaRespuesta = null; // Última posición recibida
let intervaloId = null;     // ID del intervalo activo
let circuitoCache = null;   // Para guardar el trazado del circuito

// --- CONFIGURACIÓN (SINGAPUR 2023) ---
// Usamos sesión 9161
const session_key = 9161;
const driver_number = 14;
// Fecha de inicio de la carrera real (cuando ya están corriendo)
let tiempoActual = new Date("2023-09-16T13:04:48.492000+00:00"); 


// Función auxiliar: Fetch con Timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const res = await fetch(url, options);
    clearTimeout(id);
    if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Función principal: Obtener un frame de ubicación del coche
async function getLocationFrame() {
  // Step es una variable que define el intervalo de tiempo entre cada frame, entonces en función a este será más o menos fluido el movimiento
  // el problema es que hay que saber cuando empiezan a moverse los coches, porque si no va a tardar un buen rato en comenzar a moverse el punto.
  const step = 270; 
  const date_gt = tiempoActual.toISOString();
  const date_lt = new Date(tiempoActual.getTime() + step).toISOString();

  // Construir la URL para hacer consulta a la API de openF1
  const params = new URLSearchParams();
  params.append("session_key", session_key); 
  params.append("driver_number", driver_number);
  params.append("date>", date_gt);
  params.append("date<", date_lt);

  const url = `${OPENF1_BASE}/v1/location?${params.toString()}`;

  try {
    const json = await fetchWithTimeout(url);
    
    if (json.length > 0) {
      ultimaRespuesta = json[json.length - 1]; 
      console.log(`✅ [${driver_number}] Moviendo a: ${ultimaRespuesta.x}, ${ultimaRespuesta.y}`);
    } else {
      console.log(`⚠️ Sin datos para: ${date_gt}`);
    }
  } catch (err) {
    console.error("❌ Error API:", err.message);
  }

  // Avanzamos el reloj pase lo que pase
  tiempoActual = new Date(tiempoActual.getTime() + step);
}


// --- RUTAS ---

// Ruta para obtener la forma del circuito
router.get('/track-data', async (req, res) => {

    if (circuitoCache) return res.json(circuitoCache);
    
    try {
        // Pedimos 2 minutos de datos para tener la forma del circuito
        const start = "2023-09-16T13:00:00+00:00";
        const end = "2023-09-16T13:33:00+00:00";
        const url = `${OPENF1_BASE}/v1/location?session_key=${session_key}&driver_number=${driver_number}&date>=${start}&date<${end}`;
        
        const data = await fetchWithTimeout(url);
        circuitoCache = data;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ruta para obtener la posición actual del piloto
router.get("/current", (req, res) => {
  
  // Solo iniciamos el intervalo si NO está corriendo ya.
  if (!intervaloId) {
      console.log("🟢 Iniciando simulación...");
      intervaloId = setInterval(getLocationFrame, 270); // Actualizamos cada 270ms
  }

  if (!ultimaRespuesta) {
    return res.json({}); // Devolvemos vacío si aún no ha cargado
  }

  res.json(ultimaRespuesta);
});

module.exports = router;